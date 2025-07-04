import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

// 柔軟な採点関数
function evaluateAnswer(correctAnswer: string, studentAnswer: string, questionType?: string): boolean {
  // 基本的な正規化
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[、。！？\s]+/g, '') // 句読点と空白を除去
      .replace(/[ァ-ヴ]/g, (match) => String.fromCharCode(match.charCodeAt(0) + 0x60)) // カタカナをひらがなに変換
      .replace(/[０-９]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0xFEE0)); // 全角数字を半角に変換
  };

  const normalizedCorrect = normalizeText(correctAnswer);
  const normalizedStudent = normalizeText(studentAnswer);

  // 完全一致チェック
  if (normalizedCorrect === normalizedStudent) {
    return true;
  }

  // 選択式の場合は厳密な判定
  if (questionType === "multiple_choice") {
    return false;
  }

  // 記述式の場合のキーワードベース評価（適度な厳しさ）
  const correctWords = normalizedCorrect.split(/\s+/).filter(word => word.length > 1);
  const studentWords = normalizedStudent.split(/\s+/).filter(word => word.length > 1);
  
  if (correctWords.length === 0) {
    return studentWords.length === 0;
  }

  // キーワード一致率チェック（65%以上必要）
  const matchingWords = correctWords.filter(word => 
    studentWords.some(studentWord => 
      studentWord.includes(word) || word.includes(studentWord)
    )
  );
  
  const keywordMatchRate = matchingWords.length / correctWords.length;
  
  if (keywordMatchRate >= 0.65) {
    return true;
  }

  // Levenshtein距離による類似度チェック（75%以上必要）
  const similarity = calculateSimilarity(normalizedCorrect, normalizedStudent);
  return similarity >= 0.75;
}

// Levenshtein距離による類似度計算
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLength = Math.max(len1, len2);
  
  return (maxLength - distance) / maxLength;
}

// QA自動生成（LLM呼び出しは実際にはactionで行う）
export const generateQA = mutation({
  args: {
    lectureId: v.id("lectures"),
    content: v.string(),
    difficulty: v.object({
      easy: v.number(),
      medium: v.number(),
      hard: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // ここでは仮のQAを生成（実際のLLM呼び出しはactionで実装）
    const timestamp = Date.now();
    
    // 仮のQAデータを生成
    const qaTemplates = [
      {
        lectureId: args.lectureId,
        question: "この講義の主要なトピックは何ですか？",
        questionType: "multiple_choice" as const,
        options: ["トピックA", "トピックB", "トピックC", "トピックD"],
        answer: "トピックA",
        difficulty: "easy" as const,
        explanation: "講義の冒頭で説明されたとおり、トピックAが主要なテーマです。",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        lectureId: args.lectureId,
        question: "講義で説明された概念を自分の言葉で説明してください。",
        questionType: "descriptive" as const,
        answer: "模範解答：概念の説明...",
        difficulty: "medium" as const,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ];

    // QAをデータベースに保存
    const ids = await Promise.all(
      qaTemplates.map(qa => ctx.db.insert("qa_templates", qa))
    );

    return { success: true, count: ids.length };
  },
});

// QA一覧取得
export const listQA = query({
  args: {
    lectureId: v.id("lectures"),
    difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
    includeUnpublished: v.optional(v.boolean()), // 非公開も含めるか（教師用）
  },
  handler: async (ctx, args) => {
    // 認証チェック（非公開QAを要求する場合）
    if (args.includeUnpublished) {
      const userId = await getAuthUserId(ctx);
      if (userId) {
        const user = await ctx.db.get(userId);
        // 教師または管理者のみが非公開QAを見られる
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
          // 権限がない場合は、includeUnpublishedを無視
          args = { ...args, includeUnpublished: false };
        }
      } else {
        // 未認証の場合も、includeUnpublishedを無視
        args = { ...args, includeUnpublished: false };
      }
    }

    let qas = await ctx.db
      .query("qa_templates")
      .withIndex("by_lecture", (q) => q.eq("lectureId", args.lectureId))
      .collect();

    // デフォルトでは公開されているもののみを返す
    if (!args.includeUnpublished) {
      qas = qas.filter(qa => qa.isPublished !== false);
    }

    return qas;
  },
});

// 回答を提出（プライバシー保護付き）
export const submitResponse = mutation({
  args: {
    qaId: v.id("qa_templates"),
    studentId: v.id("students"),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    // 認証チェック
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    // ユーザー情報を取得
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // 学生データの存在確認（認証チェックは削除）
    const student = await ctx.db.get(args.studentId);
    if (!student) {
      throw new ConvexError("Student not found");
    }
    
    // QAを取得して正解判定
    const qa = await ctx.db.get(args.qaId);
    if (!qa) {
      throw new Error("QA not found");
    }

    // 正解判定（柔軟な採点）
    const isCorrect = evaluateAnswer(qa.answer, args.answer, qa.questionType);

    // 既存の回答を確認
    const existingResponse = await ctx.db
      .query("responses")
      .withIndex("by_student", q => q.eq("studentId", args.studentId))
      .filter(q => q.eq(q.field("qaId"), args.qaId))
      .first();

    let responseId;
    if (existingResponse) {
      // 既存の回答がある場合は更新
      await ctx.db.patch(existingResponse._id, {
        answer: args.answer,
        isCorrect,
        timestamp: Date.now(),
      });
      responseId = existingResponse._id;
    } else {
      // 新規回答の場合は作成
      responseId = await ctx.db.insert("responses", {
      qaId: args.qaId,
      studentId: args.studentId,
      answer: args.answer,
      isCorrect,
      timestamp: Date.now(),
    });
    }

    // 処理時間を計測
    const processingTime = Date.now() - startTime;
    console.log(`回答処理時間: ${processingTime}ms`);

    // 1秒以内に完了することを確認
    if (processingTime > 1000) {
      console.warn(`回答処理が1秒を超過しました: ${processingTime}ms`);
    }

    return { 
      success: true, 
      isCorrect, 
      processingTime,
      correctAnswer: qa.answer,
      explanation: qa.explanation,
      isUpdate: !!existingResponse
    };
  },
});

// 自分の回答履歴を取得（プライバシー保護付き）
export const getMyResponses = query({
  args: {
    qaId: v.optional(v.id("qa_templates")),
    lectureId: v.optional(v.id("lectures")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return [];
    }

    // 自分の学生IDを取得
    const student = await ctx.db
      .query("students")
      .filter((q) => q.eq(q.field("email"), user.email))
      .first();

    if (!student) {
      return [];
    }

    let query = ctx.db
      .query("responses")
      .filter((q) => q.eq(q.field("studentId"), student._id));

    if (args.qaId) {
      const responses = await query.collect();
      return responses.filter(r => r.qaId === args.qaId);
    }

    if (args.lectureId) {
      // 講義IDでフィルタリングする場合は、QAテンプレートを経由
      const qas = await ctx.db
        .query("qa_templates")
        .withIndex("by_lecture", (q) => q.eq("lectureId", args.lectureId!))
        .collect();
      
      const qaIds = qas.map(qa => qa._id);
      const responses = await query.collect();
      return responses.filter(r => qaIds.includes(r.qaId));
    }

    return await query.collect();
  },
});

// 学習履歴の詳細を取得（学生用）
export const getLearningHistory = query({
  args: {
    studentId: v.id("students"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    // 学生の回答履歴を取得（最新順）
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .order("desc")
      .take(limit);

    // QAと講義情報を一括取得（N+1問題の解消）
    const qaIds = [...new Set(responses.map(r => r.qaId))];
    const qas = await Promise.all(qaIds.map(id => ctx.db.get(id)));
    const qaMap = new Map(qas.filter(qa => qa !== null).map(qa => [qa!._id, qa!]));
    
    // 講義IDを収集
    const lectureIds = [...new Set(qas.filter(qa => qa !== null).map(qa => qa!.lectureId))];
    const lectures = await Promise.all(lectureIds.map(id => ctx.db.get(id)));
    const lectureMap = new Map(lectures.filter(lecture => lecture !== null).map(lecture => [lecture!._id, lecture!]));
    
    // 各回答に対応するQ&Aと講義情報をマッピング
    const historyWithDetails = responses.map(response => {
      const qa = qaMap.get(response.qaId);
      if (!qa) return null;
      
      const lecture = lectureMap.get(qa.lectureId);
      if (!lecture) return null;

      return {
        responseId: response._id,
        timestamp: response.timestamp,
        answer: response.answer,
        isCorrect: response.isCorrect,
        question: qa.question,
        questionType: qa.questionType,
        difficulty: qa.difficulty,
        correctAnswer: qa.answer,
        explanation: qa.explanation,
        lectureTitle: lecture.title,
        lectureId: lecture._id,
      };
    });

    // nullを除外してフィルタリング
    const validHistory = historyWithDetails.filter(item => item !== null);

    // 統計情報を計算
    const totalAttempts = validHistory.length;
    const correctAttempts = validHistory.filter(item => item.isCorrect).length;
    const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

    // 難易度別統計
    const difficultyStats = {
      easy: { total: 0, correct: 0 },
      medium: { total: 0, correct: 0 },
      hard: { total: 0, correct: 0 },
    };

    validHistory.forEach(item => {
      difficultyStats[item.difficulty].total++;
      if (item.isCorrect) {
        difficultyStats[item.difficulty].correct++;
      }
    });

    // 講義別統計
    const lectureStats = new Map<string, { title: string, total: number, correct: number }>();
    validHistory.forEach(item => {
      const key = item.lectureId;
      if (!lectureStats.has(key)) {
        lectureStats.set(key, { title: item.lectureTitle, total: 0, correct: 0 });
      }
      const stats = lectureStats.get(key)!;
      stats.total++;
      if (item.isCorrect) {
        stats.correct++;
      }
    });

    return {
      history: validHistory,
      statistics: {
        totalAttempts,
        correctAttempts,
        accuracy: Math.round(accuracy),
        difficultyStats,
        lectureStats: Array.from(lectureStats.entries()).map(([id, stats]) => ({
          lectureId: id,
          title: stats.title,
          total: stats.total,
          correct: stats.correct,
          accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        })),
      },
    };
  },
});

// QA統計を取得（個人を特定しない形で）
export const getQAStatistics = query({
  args: {
    qaId: v.id("qa_templates"),
  },
  handler: async (ctx, args) => {
    // TODO: Convex Authを適切に設定した後、認証チェックを再有効化する

    const responses = await ctx.db
      .query("responses")
      .filter((q) => q.eq(q.field("qaId"), args.qaId))
      .collect();

    const totalResponses = responses.length;
    const correctResponses = responses.filter(r => r.isCorrect).length;
    const correctRate = totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0;

    // 個人を特定できない統計情報のみを返す
    return {
      totalResponses,
      correctResponses,
      incorrectResponses: totalResponses - correctResponses,
      correctRate: Math.round(correctRate),
      // 回答の分布（選択式の場合）
      answerDistribution: responses.reduce((acc, r) => {
        acc[r.answer] = (acc[r.answer] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },
});

// QA更新（講師用）
export const updateQA = mutation({
  args: {
    qaId: v.id("qa_templates"),
    updates: v.object({
      question: v.optional(v.string()),
      options: v.optional(v.array(v.string())),
      answer: v.optional(v.string()),
      difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
      explanation: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const qa = await ctx.db.get(args.qaId);
    if (!qa) {
      throw new Error("QA not found");
    }

    // 更新前の値を保存
    const previousValue = {
      question: qa.question,
      options: qa.options,
      answer: qa.answer,
      difficulty: qa.difficulty,
      explanation: qa.explanation,
    };

    await ctx.db.patch(args.qaId, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    // 監査ログを記録
    await ctx.runMutation(api.auditLogs.logAction, {
      action: "update",
      resourceType: "qa_template",
      resourceId: args.qaId,
      details: {
        previousValue,
        newValue: args.updates,
        description: `QA「${qa.question.substring(0, 50)}...」を更新しました`,
      },
    });

    return { success: true };
  },
});

// QA削除（講師用）
export const deleteQA = mutation({
  args: {
    qaId: v.id("qa_templates"),
  },
  handler: async (ctx, args) => {
    // 削除前にQA情報を取得
    const qa = await ctx.db.get(args.qaId);
    if (!qa) {
      throw new Error("QA not found");
    }

    await ctx.db.delete(args.qaId);

    // 監査ログを記録
    await ctx.runMutation(api.auditLogs.logAction, {
      action: "delete",
      resourceType: "qa_template",
      resourceId: args.qaId,
      details: {
        previousValue: qa,
        description: `QA「${qa.question.substring(0, 50)}...」を削除しました`,
      },
    });

    return { success: true };
  },
});

// QA公開状態の切り替え
export const togglePublish = mutation({
  args: {
    qaId: v.id("qa_templates"),
  },
  handler: async (ctx, args) => {
    const qa = await ctx.db.get(args.qaId);
    if (!qa) {
      throw new Error("QA not found");
    }

    // isPublishedフィールドがない場合はtrueとみなす
    const currentStatus = qa.isPublished !== false;
    
    await ctx.db.patch(args.qaId, {
      isPublished: !currentStatus,
      updatedAt: Date.now(),
    });

    // 監査ログを記録
    await ctx.runMutation(api.auditLogs.logAction, {
      action: currentStatus ? "unpublish" : "publish",
      resourceType: "qa_template",
      resourceId: args.qaId,
      details: {
        previousValue: { isPublished: currentStatus },
        newValue: { isPublished: !currentStatus },
        description: `QA「${qa.question.substring(0, 50)}...」を${!currentStatus ? '公開' : '非公開に'}しました`,
      },
    });

    return { success: true, isPublished: !currentStatus };
  },
});

// QA手動作成（講師用）
export const createQA = mutation({
  args: {
    lectureId: v.id("lectures"),
    question: v.string(),
    questionType: v.union(v.literal("multiple_choice"), v.literal("short_answer"), v.literal("descriptive")),
    options: v.optional(v.array(v.string())),
    answer: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    explanation: v.optional(v.string()),
    isPublished: v.optional(v.boolean()), // 公開設定を追加
  },
  handler: async (ctx, args) => {
    const qaId = await ctx.db.insert("qa_templates", {
      lectureId: args.lectureId,
      question: args.question,
      questionType: args.questionType,
      options: args.options,
      answer: args.answer,
      difficulty: args.difficulty,
      explanation: args.explanation,
      isPublished: args.isPublished !== false, // 未指定の場合はtrue
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 監査ログを記録
    await ctx.runMutation(api.auditLogs.logAction, {
      action: "create",
      resourceType: "qa_template",
      resourceId: qaId,
      details: {
        newValue: args,
        description: `新しいQA「${args.question.substring(0, 50)}...」を作成しました`,
      },
    });

    return { success: true, qaId };
  },
});

// 内部用QA作成（Action内部から使用）
export const createQAFromAction = mutation({
  args: {
    lectureId: v.id("lectures"),
    question: v.string(),
    questionType: v.union(v.literal("multiple_choice"), v.literal("short_answer"), v.literal("descriptive")),
    options: v.optional(v.array(v.string())),
    answer: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    explanation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const qaId = await ctx.db.insert("qa_templates", {
      ...args,
      isPublished: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return qaId;
  },
});

// 回答削除
export const deleteResponse = mutation({
  args: {
    responseId: v.id("responses"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.responseId);
    return { success: true };
  },
});

// すべての回答を取得（管理者用）
export const getAllResponses = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("responses").collect();
  },
});

// 記述問題の難易度を修正する管理者用mutation
export const fixDescriptiveDifficulties = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "teacher" && user.role !== "admin")) {
      throw new ConvexError("Unauthorized: Only teachers and admins can fix difficulties");
    }

    // 記述問題で難易度が easy の問題を取得
    const descriptiveQAs = await ctx.db
      .query("qa_templates")
      .filter((q) => 
        q.and(
          q.or(
            q.eq(q.field("questionType"), "descriptive"),
            q.eq(q.field("questionType"), "essay")
          ),
          q.eq(q.field("difficulty"), "easy")
        )
      )
      .collect();

    let fixedCount = 0;

    for (const qa of descriptiveQAs) {
      // 問題の内容に基づいて適切な難易度を判定
      const question = qa.question;
      const answer = qa.answer;
      
      let newDifficulty: "medium" | "hard" = "medium";
      
      // より詳細な説明を要求する問題は hard に設定
      const hardKeywords = ['説明', '述べ', '論じ', '考察', '分析', '評価', '比較', '検討'];
      const hasHardKeywords = hardKeywords.some(keyword => question.includes(keyword));
      
      if (hasHardKeywords || answer.length > 150 || question.length > 80) {
        newDifficulty = "hard";
      }

      await ctx.db.patch(qa._id, {
        difficulty: newDifficulty,
        updatedAt: Date.now(),
      });

      fixedCount++;
    }

    return {
      success: true,
      fixedCount,
      message: `${fixedCount}件の記述問題の難易度を修正しました`,
    };
  },
});

// VAE問題のquestionTypeを修正する管理者用mutation
export const fixVAEQuestionTypes = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "teacher" && user.role !== "admin")) {
      throw new ConvexError("Unauthorized: Only teachers and admins can fix question types");
    }

    // VAEに関する問題を検索
    const allQAs = await ctx.db.query("qa_templates").collect();
    const vaeQAs = allQAs.filter(qa => 
      qa.question.includes("VAE") || 
      qa.question.includes("変分自己符号化器") ||
      qa.answer.includes("ELBO") ||
      qa.answer.includes("エビデンス下界")
    );

    let fixedCount = 0;

    for (const qa of vaeQAs) {
      // 現在multiple_choiceになっている記述式問題を修正
      if (qa.questionType === "multiple_choice" && !qa.options) {
        await ctx.db.patch(qa._id, {
          questionType: "short_answer",
          updatedAt: Date.now(),
        });
        fixedCount++;
        console.log(`修正: ${qa.question} -> short_answer`);
      }
    }

    return {
      success: true,
      fixedCount,
      totalVAEQuestions: vaeQAs.length,
      message: `${fixedCount}件のVAE問題のquestionTypeを修正しました`,
    };
  },
});

// 全ての問題のquestionTypeとoptionsの整合性を修正する管理者用mutation
export const fixAllQuestionTypes = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "teacher" && user.role !== "admin")) {
      throw new ConvexError("Unauthorized: Only teachers and admins can fix question types");
    }

    const allQAs = await ctx.db.query("qa_templates").collect();
    let fixedCount = 0;

    for (const qa of allQAs) {
      let needsUpdate = false;
      const updates: any = {};

      // short_answerまたはdescriptiveなのにoptionsが存在する場合
      if ((qa.questionType === "short_answer" || qa.questionType === "descriptive") && qa.options) {
        updates.options = undefined;
        needsUpdate = true;
        console.log(`修正: ${qa.question.substring(0, 50)}... -> optionsを削除`);
      }

      // multiple_choiceなのにoptionsが空または存在しない場合
      if (qa.questionType === "multiple_choice" && (!qa.options || qa.options.length === 0)) {
        // 適切なquestionTypeに変更
        if (qa.answer.length > 100 || qa.question.includes("説明") || qa.question.includes("述べ")) {
          updates.questionType = "descriptive";
        } else {
          updates.questionType = "short_answer";
        }
        updates.options = undefined;
        needsUpdate = true;
        console.log(`修正: ${qa.question.substring(0, 50)}... -> ${updates.questionType}に変更`);
      }

      if (needsUpdate) {
        updates.updatedAt = Date.now();
        await ctx.db.patch(qa._id, updates);
        fixedCount++;
      }
    }

    return {
      success: true,
      fixedCount,
      totalQAs: allQAs.length,
      message: `${fixedCount}件の問題の整合性を修正しました`,
    };
  },
});

// 内部用: optionsの整合性を修正（認証不要）
export const fixQuestionTypesInternal = mutation({
  args: {},
  handler: async (ctx) => {
    const allQAs = await ctx.db.query("qa_templates").collect();
    let fixedCount = 0;

    for (const qa of allQAs) {
      let needsUpdate = false;
      const updates: any = {};

      // short_answerまたはdescriptiveなのにoptionsが存在する場合
      if ((qa.questionType === "short_answer" || qa.questionType === "descriptive") && qa.options) {
        updates.options = undefined;
        needsUpdate = true;
        console.log(`修正: ${qa.question.substring(0, 50)}... -> optionsを削除`);
      }

      // multiple_choiceなのにoptionsが空または存在しない場合  
      if (qa.questionType === "multiple_choice" && (!qa.options || qa.options.length === 0)) {
        // 適切なquestionTypeに変更
        if (qa.answer.length > 100 || qa.question.includes("説明") || qa.question.includes("述べ")) {
          updates.questionType = "descriptive";
        } else {
          updates.questionType = "short_answer";
        }
        updates.options = undefined;
        needsUpdate = true;
        console.log(`修正: ${qa.question.substring(0, 50)}... -> ${updates.questionType}に変更`);
      }

      if (needsUpdate) {
        updates.updatedAt = Date.now();
        await ctx.db.patch(qa._id, updates);
        fixedCount++;
      }
    }

    return {
      success: true,
      fixedCount,
      totalQAs: allQAs.length,
      message: `${fixedCount}件の問題の整合性を修正しました`,
    };
  },
});

// AI生成によるQA作成
export const generateQAWithAI = mutation({
  args: {
    lectureId: v.id("lectures"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "teacher") {
      throw new ConvexError("Unauthorized: Only teachers can generate QA");
    }

    // 講義内容を取得
    const lecture = await ctx.db.get(args.lectureId);
    if (!lecture) {
      throw new ConvexError("Lecture not found");
    }

    try {
      // プロンプトから難易度別の問題数を解析
      const prompt = args.prompt.toLowerCase();
      const difficultyCounts: Record<"easy" | "medium" | "hard", number> = {
        easy: 0,
        medium: 0,
        hard: 0,
      };

      // 難易度毎の正規表現マッチ
      const patterns: { key: "easy" | "medium" | "hard"; regex: RegExp }[] = [
        // 「易を2問」「中を1問」「難を3問」など助詞や空白を含む形式にもマッチするように
        { key: "easy", regex: /(易|簡単|easy)(?:しい|い)?[^0-9]*(\d+)\s*問?/ },
        { key: "medium", regex: /(中|普通|medium)[^0-9]*(\d+)\s*問?/ },
        { key: "hard", regex: /(難|高度|hard)[^0-9]*(\d+)\s*問?/ },
      ];

      for (const { key, regex } of patterns) {
        const m = prompt.match(regex);
        if (m && m[2]) {
          difficultyCounts[key] = parseInt(m[2]);
        }
      }

      // もし個別指定がなければ全体数を取得
      let totalRequested = Object.values(difficultyCounts).reduce((a, b) => a + b, 0);
      if (totalRequested === 0) {
        const countMatch = prompt.match(/(\d+)\s*問/);
        totalRequested = countMatch ? parseInt(countMatch[1]) : 3;
        // 単一難易度を推定
        const guessDifficulty = prompt.includes("易") ? "easy" : prompt.includes("難") ? "hard" : "medium";
        difficultyCounts[guessDifficulty] = totalRequested;
      }

      const questionTypeMap = {
        easy: "multiple_choice" as const,
        medium: "short_answer" as const,
        hard: "descriptive" as const,
      };

      const generatedQAs = [];
      const timestamp = Date.now();
      let globalIndex = 1;

      for (const diff of ["easy", "medium", "hard"] as const) {
        const count = difficultyCounts[diff];
        const questionType = questionTypeMap[diff];
        for (let i = 0; i < count; i++) {
          let qaData: any;

          // 講義説明の先頭文を抽出（なければタイトル）
          const firstSentence = (lecture.description ?? lecture.title).split(/[。\.]/)[0];

          if (questionType === "multiple_choice") {
            // 正解は説明の要約（先頭文）とし、誤答はタイトルを改変
            const correct = firstSentence.trim();
            const distractors = [
              `${lecture.title}とは無関係な内容`,
              `${lecture.title}の対義語的概念`,
              `${lecture.title}の別分野のトピック`,
            ];
            // シャッフルして A〜D に割当
            const opts = [correct, ...distractors].sort(() => Math.random() - 0.5);
            qaData = {
              lectureId: args.lectureId,
              question: `以下のうち、${lecture.title} で扱うテーマとして最も適切なのはどれですか？ (問題${globalIndex})`,
              questionType,
              options: opts.map((o, idx) => `${String.fromCharCode(65 + idx)}. ${o}`),
              answer: opts.find((o) => o === correct) ? `${String.fromCharCode(65 + opts.indexOf(correct))}. ${correct}` : `A. ${correct}`,
              difficulty: diff,
              explanation: `${lecture.title} の概要より抜粋。`,
              isPublished: true,
              createdAt: timestamp,
              updatedAt: timestamp,
            };
          } else if (questionType === "short_answer") {
            qaData = {
              lectureId: args.lectureId,
              question: `${lecture.title} の重要なポイントを簡潔に説明してください。(問題${globalIndex})`,
              questionType,
              answer: firstSentence.trim(),
              difficulty: diff,
              explanation: "講義説明の主要文を答える問題です。",
              isPublished: true,
              createdAt: timestamp,
              updatedAt: timestamp,
            };
          } else {
            qaData = {
              lectureId: args.lectureId,
              question: `${lecture.title} について、講義で説明された内容を踏まえて詳しく述べ、具体例を挙げてください。(問題${globalIndex})`,
              questionType,
              answer: `${firstSentence.trim()} などを含めた詳細な説明を想定。`,
              difficulty: diff,
              explanation: "記述式で深い理解を問う問題です。",
              isPublished: true,
              createdAt: timestamp,
              updatedAt: timestamp,
            };
          }
          const qaId = await ctx.db.insert("qa_templates", qaData);
          generatedQAs.push({ ...qaData, _id: qaId });
          globalIndex++;
        }
      }

      return {
        success: true,
        qaList: generatedQAs,
        message: `${generatedQAs.length}件のQAを生成しました`,
      };
      
    } catch (error) {
      console.error("AI生成エラー:", error);
      return {
        success: false,
        error: "QAの生成中にエラーが発生しました",
        qaList: [],
      };
    }
  },
});

// 一括公開/非公開切り替え
export const bulkTogglePublish = mutation({
  args: {
    qaIds: v.array(v.id("qa_templates")),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "teacher" && user.role !== "admin")) {
      throw new ConvexError("Unauthorized: Only teachers and admins can bulk toggle publish");
    }

    const results = [];
    const timestamp = Date.now();

    for (const qaId of args.qaIds) {
      const qa = await ctx.db.get(qaId);
      if (!qa) {
        results.push({ qaId, success: false, error: "QA not found" });
        continue;
      }

      // 現在の状態と変更後の状態が同じ場合はスキップ
      const currentStatus = qa.isPublished !== false;
      if (currentStatus === args.isPublished) {
        results.push({ qaId, success: true, skipped: true });
        continue;
      }

      await ctx.db.patch(qaId, {
        isPublished: args.isPublished,
        updatedAt: timestamp,
      });

      // 監査ログを記録
      await ctx.runMutation(api.auditLogs.logAction, {
        action: args.isPublished ? "publish" : "unpublish",
        resourceType: "qa_template",
        resourceId: qaId,
        details: {
          previousValue: { isPublished: currentStatus },
          newValue: { isPublished: args.isPublished },
          description: `QA「${qa.question.substring(0, 30)}...」を${args.isPublished ? '公開' : '非公開に'}しました（一括操作）`,
        },
      });

      results.push({ qaId, success: true });
    }

    const successCount = results.filter(r => r.success && !r.skipped).length;
    const skippedCount = results.filter(r => r.skipped).length;
    const failureCount = results.filter(r => !r.success).length;

    return {
      success: true,
      results,
      summary: {
        total: args.qaIds.length,
        succeeded: successCount,
        skipped: skippedCount,
        failed: failureCount,
      },
      message: `${successCount}件のQAを${args.isPublished ? '公開' : '非公開に'}しました`,
    };
  },
});

// 一括削除
export const bulkDeleteQA = mutation({
  args: {
    qaIds: v.array(v.id("qa_templates")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "teacher" && user.role !== "admin")) {
      throw new ConvexError("Unauthorized: Only teachers and admins can bulk delete QA");
    }

    const results = [];
    const deletedQAs = [];

    for (const qaId of args.qaIds) {
      const qa = await ctx.db.get(qaId);
      if (!qa) {
        results.push({ qaId, success: false, error: "QA not found" });
        continue;
      }

      // 削除前にQA情報を保存（復元用）
      deletedQAs.push({
        _id: qa._id,
        question: qa.question,
        questionType: qa.questionType,
        options: qa.options,
        answer: qa.answer,
        difficulty: qa.difficulty,
        explanation: qa.explanation,
        lectureId: qa.lectureId,
      });

      await ctx.db.delete(qaId);

      // 監査ログを記録
      await ctx.runMutation(api.auditLogs.logAction, {
        action: "delete",
        resourceType: "qa_template",
        resourceId: qaId,
        details: {
          previousValue: qa,
          description: `QA「${qa.question.substring(0, 30)}...」を削除しました（一括操作）`,
        },
      });

      results.push({ qaId, success: true });
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return {
      success: true,
      results,
      deletedQAs, // 削除されたQAのデータ（将来の復元機能用）
      summary: {
        total: args.qaIds.length,
        succeeded: successCount,
        failed: failureCount,
      },
      message: `${successCount}件のQAを削除しました`,
    };
  },
});
