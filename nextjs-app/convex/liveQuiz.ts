import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// アクセスコード生成関数
function generateAccessCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ライブセッションを作成
export const createLiveSession = mutation({
  args: {
    title: v.string(),
    lectureId: v.id("lectures"),
    hostId: v.string(),
  },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("liveSessions", {
      title: args.title,
      lectureId: args.lectureId,
      hostId: args.hostId,
      accessCode: generateAccessCode(),
      status: "waiting",
      participants: [],
      currentQuestionIndex: 0,
      createdAt: Date.now(),
      startedAt: undefined,
      endedAt: undefined,
      currentQuestionStartedAt: undefined,
    });

    return sessionId;
  },
});

// アクセスコードでセッションに参加
export const joinSession = mutation({
  args: {
    accessCode: v.string(),
    participantId: v.string(),
    participantName: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("liveSessions")
      .filter((q) => q.eq(q.field("accessCode"), args.accessCode))
      .filter((q) => q.neq(q.field("status"), "ended"))
      .first();

    if (!session) {
      throw new Error("セッションが見つかりません");
    }

    // 既に参加している場合はエラー
    if (session.participants.some(p => p.id === args.participantId)) {
      throw new Error("既に参加しています");
    }

    // 参加者を追加
    await ctx.db.patch(session._id, {
      participants: [...session.participants, {
        id: args.participantId,
        name: args.participantName,
        joinedAt: Date.now(),
        score: 0,
      }],
    });

    return session._id;
  },
});

// セッションを開始
export const startSession = mutation({
  args: {
    sessionId: v.id("liveSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "active",
      startedAt: Date.now(),
      currentQuestionIndex: 0,
    });
  },
});

// 次の質問に進む
export const nextQuestion = mutation({
  args: {
    sessionId: v.id("liveSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    const lecture = await ctx.db.get(session.lectureId);
    if (!lecture) throw new Error("Lecture not found");

    // Q&Aの数を取得
    const qaCount = await ctx.db
      .query("qa_templates")
      .withIndex("by_lecture", (q) => q.eq("lectureId", session.lectureId))
      .collect();

    const nextIndex = session.currentQuestionIndex + 1;
    
    if (nextIndex >= qaCount.length) {
      // セッション終了
      await ctx.db.patch(args.sessionId, {
        status: "ended",
        endedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(args.sessionId, {
        currentQuestionIndex: nextIndex,
        currentQuestionStartedAt: Date.now(),
      });
    }
  },
});

// ライブ回答を送信
export const submitLiveAnswer = mutation({
  args: {
    sessionId: v.id("liveSessions"),
    participantId: v.string(),
    questionIndex: v.number(),
    answer: v.string(),
    timeSpent: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Q&Aを取得
    const questions = await ctx.db
      .query("qa_templates")
      .withIndex("by_lecture", (q) => q.eq("lectureId", session.lectureId))
      .collect();

    const currentQuestion = questions[args.questionIndex];
    if (!currentQuestion) throw new Error("Question not found");

    // 回答が正解かチェック
    const isCorrect = currentQuestion.answer.toLowerCase().trim() === 
                     args.answer.toLowerCase().trim();

    // ライブ回答を保存
    await ctx.db.insert("liveAnswers", {
      sessionId: args.sessionId,
      participantId: args.participantId,
      questionIndex: args.questionIndex,
      qaId: currentQuestion._id,
      answer: args.answer,
      isCorrect,
      timeSpent: args.timeSpent,
      submittedAt: Date.now(),
    });

    // スコアを更新
    if (isCorrect) {
      const updatedParticipants = session.participants.map(p => {
        if (p.id === args.participantId) {
          return { ...p, score: p.score + 1 };
        }
        return p;
      });

      await ctx.db.patch(args.sessionId, {
        participants: updatedParticipants,
      });
    }

    return { isCorrect };
  },
});

// アクティブなセッションを取得
export const getActiveSession = query({
  args: { sessionId: v.id("liveSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // 講義情報も含める
    const lecture = await ctx.db.get(session.lectureId);
    
    // 現在の質問を取得
    let currentQuestion = null;
    if (session.currentQuestionIndex >= 0) {
      const questions = await ctx.db
        .query("qa_templates")
        .withIndex("by_lecture", (q) => q.eq("lectureId", session.lectureId))
        .collect();
      
      currentQuestion = questions[session.currentQuestionIndex] || null;
    }

    return {
      ...session,
      lecture,
      currentQuestion,
    };
  },
});

// 現在の質問に対する回答を取得
export const getCurrentQuestionAnswers = query({
  args: {
    sessionId: v.id("liveSessions"),
    questionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    // 現在の質問に対する全ての回答を取得
    const answers = await ctx.db
      .query("liveAnswers")
      .filter((q) => 
        q.eq(q.field("sessionId"), args.sessionId) &&
        q.eq(q.field("questionIndex"), args.questionIndex)
      )
      .collect();

    return answers;
  },
});

// セッションの結果を取得
export const getSessionResults = query({
  args: { sessionId: v.id("liveSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // 全ての回答を取得
    const answers = await ctx.db
      .query("liveAnswers")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .collect();

    // 参加者ごとの統計を計算
    const participantStats = session.participants.map(participant => {
      const participantAnswers = answers.filter(a => a.participantId === participant.id);
      const correctAnswers = participantAnswers.filter(a => a.isCorrect).length;
      const totalTime = participantAnswers.reduce((sum, a) => sum + a.timeSpent, 0);
      
      return {
        ...participant,
        correctAnswers,
        totalAnswers: participantAnswers.length,
        accuracy: participantAnswers.length > 0 
          ? Math.round((correctAnswers / participantAnswers.length) * 100)
          : 0,
        averageTime: participantAnswers.length > 0
          ? Math.round(totalTime / participantAnswers.length)
          : 0,
      };
    });

    // ランキングを作成（正解数 → 平均時間でソート）
    const ranking = [...participantStats].sort((a, b) => {
      if (b.correctAnswers !== a.correctAnswers) {
        return b.correctAnswers - a.correctAnswers;
      }
      return a.averageTime - b.averageTime;
    });

    return {
      session,
      ranking,
      totalQuestions: answers.length / (session.participants.length || 1),
    };
  },
});

// ホストのセッション一覧を取得
export const getHostSessions = query({
  args: { hostId: v.string() },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("liveSessions")
      .filter((q) => q.eq(q.field("hostId"), args.hostId))
      .order("desc")
      .take(10);

    // 講義情報も含める
    const sessionsWithLectures = await Promise.all(
      sessions.map(async (session) => {
        const lecture = await ctx.db.get(session.lectureId);
        return {
          ...session,
          lecture,
        };
      })
    );

    return sessionsWithLectures;
  },
}); 