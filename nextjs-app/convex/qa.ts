import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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

    // 正解判定（大文字小文字を区別しない）
    const isCorrect = qa.answer.toLowerCase().trim() === args.answer.toLowerCase().trim();

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

    await ctx.db.patch(args.qaId, {
      ...args.updates,
      updatedAt: Date.now(),
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
    await ctx.db.delete(args.qaId);
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
      isPublished: true, // デフォルトで公開
      createdAt: Date.now(),
      updatedAt: Date.now(),
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