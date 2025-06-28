import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createTestUser = mutation({
  args: {},
  handler: async (ctx) => {
    // テストユーザーを作成
    const userId = await ctx.db.insert("users", {
      email: "test@example.com",
      name: "テストユーザー",
      role: "student",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // 学生データも作成
    const studentId = await ctx.db.insert("students", {
      email: "test@example.com",
      name: "テストユーザー",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return {
      userId,
      studentId,
      message: "テストユーザーと学生データを作成しました"
    };
  },
});

export const createTestLecture = mutation({
  args: {},
  handler: async (ctx) => {
    // テスト講義を作成
    const lectureId = await ctx.db.insert("lectures", {
      title: "テスト講義",
      description: "これはテスト用の講義です",
      createdBy: "test@example.com",
      files: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return {
      lectureId,
      message: "テスト講義を作成しました"
    };
  },
});

// 簡単な回答データ作成関数
export const createSimpleResponses = mutation({
  args: {},
  handler: async (ctx) => {
    // 学生IDを固定で使用
    const studentId = "jh7b12sd540bm78we4czrjftc57jp2p2" as any;
    
    // QAデータを取得（最初の10問のみ）
    const qaList = await ctx.db.query("qa_templates").take(10);
    
    const responseIds = [];
    
    for (let i = 0; i < qaList.length; i++) {
      const qa = qaList[i];
      const isCorrect = Math.random() > 0.3; // 70%の確率で正解
      
      const responseId = await ctx.db.insert("responses", {
        qaId: qa._id,
        studentId: studentId,
        answer: isCorrect ? qa.answer : "間違った回答",
        isCorrect,
        timestamp: Date.now() - (i * 60000), // 1分ずつ過去の時間
      });
      
      responseIds.push(responseId);
    }
    
    return {
      responseIds,
      message: `${responseIds.length}件の回答データを作成しました`
    };
  },
});

export const createTestQA = mutation({
  args: {},
  handler: async (ctx) => {
    // 既存の講義を取得
    const lecture = await ctx.db.query("lectures").first();
    if (!lecture) {
      throw new Error("講義が見つかりません");
    }

    // テスト用QAを作成
    const qaIds = [];
    
    // 簡単な問題
    const qa1 = await ctx.db.insert("qa_templates", {
      lectureId: lecture._id,
      question: "プログラミングとは何ですか？",
      questionType: "multiple_choice",
      options: ["コンピューターに指示を与えること", "絵を描くこと", "音楽を作ること", "料理をすること"],
      answer: "コンピューターに指示を与えること",
      difficulty: "easy",
      explanation: "プログラミングはコンピューターに対して命令を与える行為です。",
      isPublished: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    qaIds.push(qa1);

    // 中程度の問題
    const qa2 = await ctx.db.insert("qa_templates", {
      lectureId: lecture._id,
      question: "JavaScriptの変数宣言に使用するキーワードは？",
      questionType: "multiple_choice",
      options: ["var, let, const", "int, string, boolean", "public, private, protected", "if, else, for"],
      answer: "var, let, const",
      difficulty: "medium",
      explanation: "JavaScriptでは var, let, const を使って変数を宣言します。",
      isPublished: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    qaIds.push(qa2);

    // 難しい問題
    const qa3 = await ctx.db.insert("qa_templates", {
      lectureId: lecture._id,
      question: "非同期プログラミングの利点を説明してください。",
      questionType: "short_answer",
      answer: "ブロッキングを避け、複数の処理を並行して実行できる",
      difficulty: "hard",
      explanation: "非同期プログラミングにより、I/O操作などの待機時間中に他の処理を実行できます。",
      isPublished: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    qaIds.push(qa3);

    return {
      qaIds,
      message: "テスト用QAを作成しました"
    };
  },
});

export const createTestResponses = mutation({
  args: {},
  handler: async (ctx) => {
    // 学生データを取得
    const student = await ctx.db.query("students").first();
    if (!student) {
      throw new Error("学生データが見つかりません");
    }

    // QAデータを取得
    const qaList = await ctx.db.query("qa_templates").collect();
    if (qaList.length === 0) {
      throw new Error("QAデータが見つかりません");
    }

    // テスト用回答を作成
    const responseIds = [];
    
    for (let i = 0; i < qaList.length; i++) {
      const qa = qaList[i];
      const isCorrect = Math.random() > 0.3; // 70%の確率で正解
      
      const responseId = await ctx.db.insert("responses", {
        qaId: qa._id,
        studentId: student._id,
        answer: isCorrect ? qa.answer : "間違った回答",
        isCorrect,
        timestamp: Date.now() - (i * 60000), // 1分ずつ過去の時間
      });
      
      responseIds.push(responseId);
    }

    // 追加の回答履歴（複数回答）
    for (let i = 0; i < 5; i++) {
      const randomQa = qaList[Math.floor(Math.random() * qaList.length)];
      const isCorrect = Math.random() > 0.4; // 60%の確率で正解
      
      const responseId = await ctx.db.insert("responses", {
        qaId: randomQa._id,
        studentId: student._id,
        answer: isCorrect ? randomQa.answer : "間違った回答",
        isCorrect,
        timestamp: Date.now() - (Math.random() * 86400000), // 過去24時間のランダムな時間
      });
      
      responseIds.push(responseId);
    }

    return {
      responseIds,
      message: `${responseIds.length}件のテスト回答を作成しました`
    };
  },
});

 