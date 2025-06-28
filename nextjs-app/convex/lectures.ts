import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// 講義作成
export const createLecture = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    files: v.array(v.id("files")),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    
    // ファイルIDからファイル情報を取得
    const fileInfos = await Promise.all(
      args.files.map(async (fileId) => {
        const file = await ctx.db.get(fileId);
        if (!file) {
          throw new Error(`File not found: ${fileId}`);
        }
        return {
          name: file.name,
          url: file.storageId, // storageIdをURLとして使用
          type: file.type,
        };
      })
    );
    
    const lectureId = await ctx.db.insert("lectures", {
      title: args.title,
      description: args.description,
      files: fileInfos,
      createdBy: args.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // ファイルに講義IDを関連付け
    for (const fileId of args.files) {
      await ctx.db.patch(fileId, {
        lectureId: lectureId,
      });
    }

    return { lectureId };
  },
});

// 講義一覧取得
export const listLectures = query({
  args: {
    createdBy: v.optional(v.string()), // オプショナルにして、フィルタリングを選択可能にする
  },
  handler: async (ctx, args) => {
    // createdByが指定されている場合はフィルタリング、そうでない場合は全件取得
    let lectures;
    if (args.createdBy) {
      lectures = await ctx.db
        .query("lectures")
        .withIndex("by_createdBy", q => q.eq("createdBy", args.createdBy!))
        .order("desc")
        .collect();
    } else {
      // 全ての講義を取得（開発・デバッグ用）
      lectures = await ctx.db
        .query("lectures")
        .order("desc")
        .collect();
    }

    // 各講義のQA数と回答数を取得
    const lecturesWithStats = await Promise.all(
      lectures.map(async (lecture) => {
        const qas = await ctx.db
          .query("qa_templates")
          .withIndex("by_lecture", q => q.eq("lectureId", lecture._id))
          .collect();
        
        const qaCount = qas.length;
        
        // 全QAの回答数を集計
        let totalResponses = 0;
        for (const qa of qas) {
          const responses = await ctx.db
            .query("responses")
            .withIndex("by_qa", q => q.eq("qaId", qa._id))
            .collect();
          totalResponses += responses.length;
        }

        return {
          ...lecture,
          qaCount,
          responseCount: totalResponses,
        };
      })
    );

    return lecturesWithStats;
  },
});

// 自分の講義一覧を取得（認証必須）
export const listMyLectures = query({
  args: {},
  handler: async (ctx) => {
    // Convex Authで認証チェック
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // 現在のユーザー情報を取得
    const currentUser = await ctx.db.get(userId);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // 教師・管理者のみアクセス可能
    if (currentUser.role !== "teacher" && currentUser.role !== "admin") {
      throw new Error("Unauthorized: Only teachers and admins can access their lectures");
    }

    // 自分が作成した講義を取得
    const lectures = await ctx.db
      .query("lectures")
      .withIndex("by_createdBy", q => q.eq("createdBy", currentUser.email))
      .order("desc")
      .collect();

    // 各講義のQA数と回答数を取得
    const lecturesWithStats = await Promise.all(
      lectures.map(async (lecture) => {
        const qas = await ctx.db
          .query("qa_templates")
          .withIndex("by_lecture", q => q.eq("lectureId", lecture._id))
          .collect();
        
        const qaCount = qas.length;
        
        // 全QAの回答数を集計
        let totalResponses = 0;
        for (const qa of qas) {
          const responses = await ctx.db
            .query("responses")
            .withIndex("by_qa", q => q.eq("qaId", qa._id))
            .collect();
          totalResponses += responses.length;
        }

        return {
          ...lecture,
          qaCount,
          responseCount: totalResponses,
        };
      })
    );

    return lecturesWithStats;
  },
});

// 講義詳細取得
export const getLecture = query({
  args: {
    lectureId: v.id("lectures"),
  },
  handler: async (ctx, args) => {
    const lecture = await ctx.db.get(args.lectureId);
    if (!lecture) {
      throw new Error("Lecture not found");
    }

    // QA情報を取得
    const qas = await ctx.db
      .query("qa_templates")
      .withIndex("by_lecture", q => q.eq("lectureId", args.lectureId))
      .collect();

    // 統計情報を計算
    let totalResponses = 0;
    let correctResponses = 0;
    
    for (const qa of qas) {
      const responses = await ctx.db
        .query("responses")
        .withIndex("by_qa", q => q.eq("qaId", qa._id))
        .collect();
      
      totalResponses += responses.length;
      correctResponses += responses.filter(r => r.isCorrect).length;
    }

    const accuracy = totalResponses > 0 ? correctResponses / totalResponses : 0;

    return {
      ...lecture,
      stats: {
        qaCount: qas.length,
        totalResponses,
        correctResponses,
        accuracy,
      },
    };
  },
});

// 講義更新
export const updateLecture = mutation({
  args: {
    lectureId: v.id("lectures"),
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      files: v.optional(v.array(v.object({
        name: v.string(),
        url: v.string(),
        type: v.string(),
      }))),
    }),
  },
  handler: async (ctx, args) => {
    const lecture = await ctx.db.get(args.lectureId);
    if (!lecture) {
      throw new Error("Lecture not found");
    }

    await ctx.db.patch(args.lectureId, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// 講義削除
export const deleteLecture = mutation({
  args: {
    lectureId: v.id("lectures"),
  },
  handler: async (ctx, args) => {
    // 関連するQAを削除
    const qas = await ctx.db
      .query("qa_templates")
      .withIndex("by_lecture", q => q.eq("lectureId", args.lectureId))
      .collect();
    
    for (const qa of qas) {
      // QAに関連する回答を削除
      const responses = await ctx.db
        .query("responses")
        .withIndex("by_qa", q => q.eq("qaId", qa._id))
        .collect();
      
      for (const response of responses) {
        await ctx.db.delete(response._id);
      }
      
      await ctx.db.delete(qa._id);
    }

    // 改善提案を削除
    const suggestions = await ctx.db
      .query("improvement_suggestions")
      .withIndex("by_lecture", q => q.eq("lectureId", args.lectureId))
      .collect();
    
    for (const suggestion of suggestions) {
      await ctx.db.delete(suggestion._id);
    }

    // 講義を削除
    await ctx.db.delete(args.lectureId);

    return { success: true };
  },
});

// デバッグ用：全講義データを取得
export const getAllLectures = query({
  args: {},
  handler: async (ctx) => {
    const lectures = await ctx.db
      .query("lectures")
      .order("desc")
      .collect();

    // 各講義のQA数と回答数を取得
    const lecturesWithStats = await Promise.all(
      lectures.map(async (lecture) => {
        const qas = await ctx.db
          .query("qa_templates")
          .withIndex("by_lecture", q => q.eq("lectureId", lecture._id))
          .collect();
        
        const qaCount = qas.length;
        
        // 全QAの回答数を集計
        let totalResponses = 0;
        for (const qa of qas) {
          const responses = await ctx.db
            .query("responses")
            .withIndex("by_qa", q => q.eq("qaId", qa._id))
            .collect();
          totalResponses += responses.length;
        }

        return {
          ...lecture,
          qaCount,
          responseCount: totalResponses,
        };
      })
    );

    return lecturesWithStats;
  },
});

// デバッグ用：サンプル講義データを作成
export const createSampleLecture = mutation({
  args: {
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    
    // サンプル講義データ
    const sampleLectures = [
      {
        title: "機械学習入門",
        description: "機械学習の基本概念と手法について学びます。教師あり学習、教師なし学習、強化学習の違いを理解し、実践的な応用例を学習します。",
        files: []
      },
      {
        title: "データサイエンス基礎",
        description: "データ分析の基本的な手法とツールについて学びます。統計学の基礎、データの可視化、機械学習の前処理について理解を深めます。",
        files: []
      },
      {
        title: "Python プログラミング",
        description: "Pythonの基本文法からライブラリの使い方まで幅広く学習します。NumPy、Pandas、Matplotlibなどのデータ分析に必要なツールを習得します。",
        files: []
      }
    ];

    const createdLectures = [];
    
    for (const lectureData of sampleLectures) {
      const lectureId = await ctx.db.insert("lectures", {
        title: lectureData.title,
        description: lectureData.description,
        files: lectureData.files,
        createdBy: args.createdBy,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      // サンプルQ&Aも作成
      const sampleQAs = [
        {
          question: `${lectureData.title}の基本概念について説明してください。`,
          questionType: "descriptive" as const,
          answer: "これはサンプル回答です。実際の講義内容に基づいて生成されるべきです。",
          difficulty: "easy" as const,
          explanation: "基本的な概念の理解を確認する問題です。"
        },
        {
          question: `${lectureData.title}において重要な3つのポイントは何ですか？`,
          questionType: "short_answer" as const,
          answer: "1. 基礎知識の習得 2. 実践的な応用 3. 継続的な学習",
          difficulty: "medium" as const,
          explanation: "重要なポイントを整理して理解しているか確認します。"
        },
        {
          question: `${lectureData.title}の応用例として適切なものはどれですか？`,
          questionType: "multiple_choice" as const,
          options: ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
          answer: "選択肢A",
          difficulty: "hard" as const,
          explanation: "実践的な応用力を問う問題です。"
        }
      ];

      for (const qa of sampleQAs) {
        await ctx.db.insert("qa_templates", {
          lectureId,
          question: qa.question,
          questionType: qa.questionType,
          options: qa.options,
          answer: qa.answer,
          difficulty: qa.difficulty,
          explanation: qa.explanation,
          isPublished: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }

      createdLectures.push({ lectureId, title: lectureData.title });
    }

    return { 
      success: true, 
      message: `${createdLectures.length}個のサンプル講義を作成しました`,
      lectures: createdLectures
    };
  },
}); 