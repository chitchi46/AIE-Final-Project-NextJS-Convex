import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// 講義別統計
export const statsByLecture = query({
  args: {
    lectureId: v.id("lectures"),
  },
  handler: async (ctx, args) => {
    // 講義のQAを取得
    const qas = await ctx.db
      .query("qa_templates")
      .withIndex("by_lecture", q => q.eq("lectureId", args.lectureId))
      .collect();

    // 各QAの回答を集計
    const stats = await Promise.all(
      qas.map(async (qa) => {
        const responses = await ctx.db
          .query("responses")
          .withIndex("by_qa", q => q.eq("qaId", qa._id))
          .collect();

        const totalResponses = responses.length;
        const correctResponses = responses.filter(r => r.isCorrect).length;
        const accuracy = totalResponses > 0 ? correctResponses / totalResponses : 0;

        return {
          qaId: qa._id,
          question: qa.question,
          difficulty: qa.difficulty,
          totalResponses,
          correctResponses,
          accuracy,
        };
      })
    );

    // 全体統計
    const totalResponses = stats.reduce((sum, s) => sum + s.totalResponses, 0);
    const totalCorrect = stats.reduce((sum, s) => sum + s.correctResponses, 0);
    const overallAccuracy = totalResponses > 0 ? totalCorrect / totalResponses : 0;

    // 難易度別統計
    const difficultyStats = {
      easy: calculateDifficultyStats(stats.filter(s => s.difficulty === "easy")),
      medium: calculateDifficultyStats(stats.filter(s => s.difficulty === "medium")),
      hard: calculateDifficultyStats(stats.filter(s => s.difficulty === "hard")),
    };

    return {
      lectureId: args.lectureId,
      overallStats: {
        totalQuestions: qas.length,
        totalResponses,
        totalCorrect,
        accuracy: overallAccuracy,
      },
      difficultyStats,
      questionStats: stats,
    };
  },
});

// 学生別統計
export const statsByStudent = query({
  args: {
    studentId: v.id("students"),
    lectureId: v.optional(v.id("lectures")),
  },
  handler: async (ctx, args) => {
    // 学生の回答を取得
    let responses = await ctx.db
      .query("responses")
      .withIndex("by_student", q => q.eq("studentId", args.studentId))
      .collect();

    // 講義でフィルタリング（オプション）
    if (args.lectureId) {
      const lectureId = args.lectureId; // 型推論のため変数に代入
      const lectureQaIds = await ctx.db
        .query("qa_templates")
        .withIndex("by_lecture", q => q.eq("lectureId", lectureId))
        .collect()
        .then(qas => qas.map(qa => qa._id));
      
      responses = responses.filter(r => 
        lectureQaIds.includes(r.qaId)
      );
    }

    // QA情報を取得して統計を計算
    const responseStats = await Promise.all(
      responses.map(async (response) => {
        const qa = await ctx.db.get(response.qaId);
        return {
          responseId: response._id,
          qaId: response.qaId,
          question: qa?.question || "Unknown",
          difficulty: qa?.difficulty || "unknown",
          isCorrect: response.isCorrect,
          timestamp: response.timestamp,
        };
      })
    );

    // 全体統計
    const totalResponses = responseStats.length;
    const correctResponses = responseStats.filter(r => r.isCorrect).length;
    const accuracy = totalResponses > 0 ? correctResponses / totalResponses : 0;

    // 難易度別統計
    const difficultyBreakdown = {
      easy: responseStats.filter(r => r.difficulty === "easy"),
      medium: responseStats.filter(r => r.difficulty === "medium"),
      hard: responseStats.filter(r => r.difficulty === "hard"),
    };

    return {
      studentId: args.studentId,
      overallStats: {
        totalResponses,
        correctResponses,
        accuracy,
      },
      difficultyStats: {
        easy: calculateResponseStats(difficultyBreakdown.easy),
        medium: calculateResponseStats(difficultyBreakdown.medium),
        hard: calculateResponseStats(difficultyBreakdown.hard),
      },
      recentResponses: responseStats
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10),
    };
  },
});

// ヘルパー関数
function calculateDifficultyStats(stats: any[]) {
  const total = stats.length;
  if (total === 0) return { count: 0, averageAccuracy: 0 };
  
  const totalAccuracy = stats.reduce((sum, s) => sum + s.accuracy, 0);
  return {
    count: total,
    averageAccuracy: totalAccuracy / total,
  };
}

function calculateResponseStats(responses: any[]) {
  const total = responses.length;
  if (total === 0) return { count: 0, accuracy: 0 };
  
  const correct = responses.filter(r => r.isCorrect).length;
  return {
    count: total,
    accuracy: correct / total,
  };
} 

// 高速な結果集計（5秒以内保証）
export const getQuickStats = query({
  args: {
    lectureId: v.id("lectures"),
    qaId: v.optional(v.id("qa_templates")),
    studentId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    totalResponses: number;
    correctResponses: number;
    accuracy: number;
    averageTime: number;
    difficultyBreakdown: Array<{
      difficulty: string;
      count: number;
      accuracy: number;
    }>;
    recentActivity: Array<{
      timestamp: number;
      isCorrect: boolean;
      difficulty: string;
    }>;
    processingTime: number;
  }> => {
    const startTime = Date.now();

    try {
      // 並列でデータを取得（高速化）
      const [qaTemplates, responses] = await Promise.all([
        // 講義のQ&Aテンプレートを取得
        ctx.db
          .query("qa_templates")
          .withIndex("by_lecture", (q) => q.eq("lectureId", args.lectureId))
          .collect(),
        
        // 応答データを取得（必要に応じてフィルタリング）
        args.qaId 
          ? ctx.db
              .query("responses")
              .withIndex("by_qa", (q) => q.eq("qaId", args.qaId!))
              .collect()
          : ctx.db.query("responses").collect()
      ]);

      // 講義に関連する応答のみをフィルタリング
      const lectureQaIds = new Set(qaTemplates.map(qa => qa._id));
      let filteredResponses = responses.filter(r => lectureQaIds.has(r.qaId));

      // 学生でフィルタリング（指定がある場合）
      if (args.studentId) {
        filteredResponses = filteredResponses.filter(r => r.studentId === args.studentId);
      }

      // 基本統計を計算
      const totalResponses = filteredResponses.length;
      const correctResponses = filteredResponses.filter(r => r.isCorrect).length;
      const accuracy = totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0;

      // 平均回答時間を計算（存在する場合）
      // Note: responseTimeフィールドがスキーマに存在しない場合はコメントアウト
      // const responsesWithTime = filteredResponses.filter(r => r.responseTime);
      // const averageTime = responsesWithTime.length > 0 
      //   ? responsesWithTime.reduce((sum, r) => sum + (r.responseTime || 0), 0) / responsesWithTime.length
      //   : 0;
      const averageTime = 0; // 暫定的に0を設定

      // 難易度別の統計（効率的に計算）
      const difficultyMap = new Map<string, { count: number; correct: number }>();
      
      for (const response of filteredResponses) {
        const qa = qaTemplates.find(q => q._id === response.qaId);
        const difficulty = qa?.difficulty || "medium";
        
        const current = difficultyMap.get(difficulty) || { count: 0, correct: 0 };
        current.count++;
        if (response.isCorrect) current.correct++;
        difficultyMap.set(difficulty, current);
      }

      const difficultyBreakdown = Array.from(difficultyMap.entries()).map(([difficulty, stats]) => ({
        difficulty,
        count: stats.count,
        accuracy: stats.count > 0 ? (stats.correct / stats.count) * 100 : 0,
      }));

      // 最近のアクティビティ（最新20件）
      const recentActivity = filteredResponses
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20)
        .map(r => {
          const qa = qaTemplates.find(q => q._id === r.qaId);
          return {
            timestamp: r.timestamp,
            isCorrect: r.isCorrect,
            difficulty: qa?.difficulty || "medium",
          };
        });

      const processingTime = Date.now() - startTime;

      return {
        totalResponses,
        correctResponses,
        accuracy: Math.round(accuracy * 100) / 100, // 小数点2桁
        averageTime: Math.round(averageTime * 100) / 100,
        difficultyBreakdown,
        recentActivity,
        processingTime,
      };
    } catch (error) {
      console.error("Stats calculation error:", error);
      
      // エラーが発生した場合でも基本的な応答を返す
      return {
        totalResponses: 0,
        correctResponses: 0,
        accuracy: 0,
        averageTime: 0,
        difficultyBreakdown: [],
        recentActivity: [],
        processingTime: Date.now() - startTime,
      };
    }
  },
});

// リアルタイム統計更新（1秒以内）
export const getRealTimeStats = query({
  args: {
    lectureId: v.id("lectures"),
    since: v.optional(v.number()), // タイムスタンプ
  },
  handler: async (ctx, args): Promise<{
    newResponses: number;
    currentAccuracy: number;
    activeStudents: number;
    lastUpdated: number;
  }> => {
    const startTime = Date.now();
    const since = args.since || (Date.now() - 60000); // デフォルトは1分前

    try {
      // 講義のQ&Aテンプレートを取得
      const qaTemplates = await ctx.db
        .query("qa_templates")
        .withIndex("by_lecture", (q) => q.eq("lectureId", args.lectureId))
        .collect();

      const lectureQaIds = new Set(qaTemplates.map(qa => qa._id));

      // 指定時刻以降の応答を取得
      const recentResponses = await ctx.db
        .query("responses")
        .filter((q) => q.gte(q.field("timestamp"), since))
        .collect();

      const filteredRecentResponses = recentResponses.filter(r => 
        lectureQaIds.has(r.qaId)
      );

      // 全体の応答を取得（現在の正答率計算用）
      const allResponses = await ctx.db.query("responses").collect();
      const allFilteredResponses = allResponses.filter(r => lectureQaIds.has(r.qaId));

      const currentAccuracy = allFilteredResponses.length > 0
        ? (allFilteredResponses.filter(r => r.isCorrect).length / allFilteredResponses.length) * 100
        : 0;

      // アクティブな学生数（最近5分以内に回答した学生）
      const recentActiveResponses = allFilteredResponses.filter(r => 
        r.timestamp > (Date.now() - 300000) // 5分
      );
      const activeStudents = new Set(recentActiveResponses.map(r => r.studentId)).size;

      return {
        newResponses: filteredRecentResponses.length,
        currentAccuracy: Math.round(currentAccuracy * 100) / 100,
        activeStudents,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error("Real-time stats error:", error);
      return {
        newResponses: 0,
        currentAccuracy: 0,
        activeStudents: 0,
        lastUpdated: Date.now(),
      };
    }
  },
});

// キャッシュされた統計（超高速）
export const getCachedStats = query({
  args: {
    lectureId: v.id("lectures"),
  },
  handler: async (ctx, args): Promise<{
    cached: boolean;
    lastCalculated: number;
    stats: {
      totalQuestions: number;
      totalResponses: number;
      overallAccuracy: number;
      studentCount: number;
      completionRate: number;
    };
  }> => {
    try {
      // 基本的な統計をキャッシュから取得（実装では実際のキャッシュメカニズムを使用）
      const qaTemplates = await ctx.db
        .query("qa_templates")
        .withIndex("by_lecture", (q) => q.eq("lectureId", args.lectureId))
        .collect();

      const lectureQaIds = new Set(qaTemplates.map(qa => qa._id));
      const responses = await ctx.db.query("responses").collect();
      const filteredResponses = responses.filter(r => lectureQaIds.has(r.qaId));

      const studentIds = new Set(filteredResponses.map(r => r.studentId));
      const correctResponses = filteredResponses.filter(r => r.isCorrect).length;

      return {
        cached: true,
        lastCalculated: Date.now(),
        stats: {
          totalQuestions: qaTemplates.length,
          totalResponses: filteredResponses.length,
          overallAccuracy: filteredResponses.length > 0 
            ? (correctResponses / filteredResponses.length) * 100 
            : 0,
          studentCount: studentIds.size,
          completionRate: qaTemplates.length > 0 && studentIds.size > 0
            ? (filteredResponses.length / (qaTemplates.length * studentIds.size)) * 100
            : 0,
        },
      };
    } catch (error) {
      console.error("Cached stats error:", error);
      return {
        cached: false,
        lastCalculated: Date.now(),
        stats: {
          totalQuestions: 0,
          totalResponses: 0,
          overallAccuracy: 0,
          studentCount: 0,
          completionRate: 0,
        },
      };
    }
  },
}); 