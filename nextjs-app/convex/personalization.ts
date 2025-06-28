import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// 学生の学習履歴に基づいてパーソナライズされたQ&Aを取得
export const getPersonalizedQA = query({
  args: {
    studentId: v.id("students"),
    lectureId: v.id("lectures"),
    requestedCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const requestedCount = args.requestedCount || 10;
    
    // 学生の過去の回答履歴を取得
    const studentResponses = await ctx.db
      .query("responses")
      .withIndex("by_student", q => q.eq("studentId", args.studentId))
      .collect();

    // 講義のQ&Aを取得
    const lectureQAs = await ctx.db
      .query("qa_templates")
      .withIndex("by_lecture", q => q.eq("lectureId", args.lectureId))
      .collect();

    // 各Q&Aの学生の正答率を計算
    const qaPerformance = new Map<string, { correct: number; total: number; lastAttempt?: number }>();
    
    for (const response of studentResponses) {
      const qaId = response.qaId;
      if (!qaPerformance.has(qaId)) {
        qaPerformance.set(qaId, { correct: 0, total: 0 });
      }
      const perf = qaPerformance.get(qaId)!;
      perf.total++;
      if (response.isCorrect) perf.correct++;
      perf.lastAttempt = response.timestamp;
    }

    // 学生の全体的な難易度別パフォーマンスを計算
    const difficultyPerformance = {
      easy: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      hard: { correct: 0, total: 0 },
    };

    for (const qa of lectureQAs) {
      const perf = qaPerformance.get(qa._id);
      if (perf) {
        difficultyPerformance[qa.difficulty].total += perf.total;
        difficultyPerformance[qa.difficulty].correct += perf.correct;
      }
    }

    // 学生の学習レベルを判定
    const learningLevel = calculateLearningLevel(difficultyPerformance);

    // パーソナライズされた難易度配分を計算
    const personalizedDifficulty = calculatePersonalizedDifficulty(learningLevel, difficultyPerformance);

    // Q&Aを選択（未回答または低正答率を優先）
    const selectedQAs = selectPersonalizedQAs(
      lectureQAs,
      qaPerformance,
      personalizedDifficulty,
      requestedCount
    );

    return {
      studentId: args.studentId,
      lectureId: args.lectureId,
      learningLevel,
      personalizedDifficulty,
      selectedQAs,
      recommendations: generateRecommendations(learningLevel, difficultyPerformance),
    };
  },
});

// 学習レベルを計算
function calculateLearningLevel(difficultyPerformance: any): "beginner" | "intermediate" | "advanced" {
  const easyAccuracy = difficultyPerformance.easy.total > 0
    ? difficultyPerformance.easy.correct / difficultyPerformance.easy.total
    : 0;
  const mediumAccuracy = difficultyPerformance.medium.total > 0
    ? difficultyPerformance.medium.correct / difficultyPerformance.medium.total
    : 0;
  const hardAccuracy = difficultyPerformance.hard.total > 0
    ? difficultyPerformance.hard.correct / difficultyPerformance.hard.total
    : 0;

  // 学習レベルの判定ロジック
  if (easyAccuracy < 0.7 || (mediumAccuracy < 0.3 && difficultyPerformance.medium.total > 0)) {
    return "beginner";
  } else if (mediumAccuracy >= 0.7 && hardAccuracy >= 0.5) {
    return "advanced";
  } else {
    return "intermediate";
  }
}

// パーソナライズされた難易度配分を計算
function calculatePersonalizedDifficulty(
  learningLevel: string,
  difficultyPerformance: any
): { easy: number; medium: number; hard: number } {
  // 基本的な配分
  const baseDifficulty = {
    beginner: { easy: 0.6, medium: 0.3, hard: 0.1 },
    intermediate: { easy: 0.3, medium: 0.5, hard: 0.2 },
    advanced: { easy: 0.2, medium: 0.4, hard: 0.4 },
  };

  let difficulty = baseDifficulty[learningLevel as keyof typeof baseDifficulty];

  // パフォーマンスに基づいて微調整
  const easyAccuracy = difficultyPerformance.easy.total > 0
    ? difficultyPerformance.easy.correct / difficultyPerformance.easy.total
    : 0.5;

  if (easyAccuracy > 0.9 && difficultyPerformance.easy.total >= 5) {
    // 易しい問題で高正答率の場合、より難しい問題を増やす
    difficulty = {
      easy: Math.max(0.1, difficulty.easy - 0.1),
      medium: difficulty.medium + 0.05,
      hard: difficulty.hard + 0.05,
    };
  }

  return difficulty;
}

// パーソナライズされたQ&Aを選択
function selectPersonalizedQAs(
  lectureQAs: any[],
  qaPerformance: Map<string, any>,
  personalizedDifficulty: any,
  requestedCount: number
): any[] {
  // 各Q&Aにスコアを付ける
  const scoredQAs = lectureQAs.map(qa => {
    const perf = qaPerformance.get(qa._id);
    let score = 0;

    // 未回答の問題を優先
    if (!perf) {
      score += 100;
    } else {
      // 正答率が低い問題を優先
      const accuracy = perf.total > 0 ? perf.correct / perf.total : 0;
      score += (1 - accuracy) * 80;

      // 最後の回答から時間が経っている問題を優先（忘却曲線）
      if (perf.lastAttempt) {
        const daysSinceLastAttempt = (Date.now() - perf.lastAttempt) / (1000 * 60 * 60 * 24);
        score += Math.min(daysSinceLastAttempt * 2, 20);
      }

      // 試行回数が少ない問題を優先
      score += Math.max(0, 10 - perf.total * 2);
    }

    // 難易度に基づくスコア調整
    const difficultyWeight = personalizedDifficulty[qa.difficulty as keyof typeof personalizedDifficulty];
    score *= difficultyWeight;

    return { qa, score };
  });

  // スコアでソートして上位を選択
  scoredQAs.sort((a, b) => b.score - a.score);
  
  // 難易度バランスを考慮して選択
  const selected: any[] = [];
  const targetCounts = {
    easy: Math.round(requestedCount * personalizedDifficulty.easy),
    medium: Math.round(requestedCount * personalizedDifficulty.medium),
    hard: Math.round(requestedCount * personalizedDifficulty.hard),
  };

  const currentCounts = { easy: 0, medium: 0, hard: 0 };

  // 各難易度の目標数に達するまで選択
  for (const { qa } of scoredQAs) {
    if (selected.length >= requestedCount) break;
    
    const difficulty = qa.difficulty as keyof typeof currentCounts;
    if (currentCounts[difficulty] < targetCounts[difficulty]) {
      selected.push(qa);
      currentCounts[difficulty]++;
    }
  }

  // 目標数に達しなかった場合は、スコアの高い順に補充
  for (const { qa } of scoredQAs) {
    if (selected.length >= requestedCount) break;
    if (!selected.includes(qa)) {
      selected.push(qa);
    }
  }

  return selected;
}

// 学習推奨事項を生成
function generateRecommendations(learningLevel: string, difficultyPerformance: any): string[] {
  const recommendations: string[] = [];

  if (learningLevel === "beginner") {
    recommendations.push("基礎的な概念の理解に重点を置きましょう");
    recommendations.push("易しい問題から順番に取り組むことをお勧めします");
    
    if (difficultyPerformance.easy.total < 10) {
      recommendations.push("まずは易しい問題を10問以上解いてみましょう");
    }
  } else if (learningLevel === "intermediate") {
    recommendations.push("中程度の問題に積極的に挑戦しましょう");
    
    const mediumAccuracy = difficultyPerformance.medium.total > 0
      ? difficultyPerformance.medium.correct / difficultyPerformance.medium.total
      : 0;
    
    if (mediumAccuracy < 0.6) {
      recommendations.push("中程度の問題の正答率向上を目指しましょう");
    }
  } else {
    recommendations.push("難しい問題にも積極的に挑戦できています");
    recommendations.push("さらに深い理解を目指して、応用問題に取り組みましょう");
  }

  return recommendations;
}

// 学習履歴を保存
export const savePersonalizationData = mutation({
  args: {
    studentId: v.id("students"),
    lectureId: v.id("lectures"),
    learningLevel: v.string(),
    personalizedDifficulty: v.object({
      easy: v.number(),
      medium: v.number(),
      hard: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // 既存のデータを検索
    const existing = await ctx.db
      .query("personalization_data")
      .withIndex("by_student_lecture", q => 
        q.eq("studentId", args.studentId).eq("lectureId", args.lectureId)
      )
      .first();

    if (existing) {
      // 更新
      await ctx.db.patch(existing._id, {
        learningLevel: args.learningLevel,
        personalizedDifficulty: args.personalizedDifficulty,
        updatedAt: Date.now(),
      });
    } else {
      // 新規作成
      await ctx.db.insert("personalization_data", {
        studentId: args.studentId,
        lectureId: args.lectureId,
        learningLevel: args.learningLevel,
        personalizedDifficulty: args.personalizedDifficulty,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// すべての個人化データを取得（管理者用）
export const getAllPersonalizationData = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("personalization_data").collect();
  },
});

// 個人化データ削除
export const deletePersonalizationData = mutation({
  args: {
    dataId: v.id("personalization_data"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.dataId);
    return { success: true };
  },
}); 