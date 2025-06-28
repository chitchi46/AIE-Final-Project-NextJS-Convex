import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// 学習パターン分析
export const getLearningPatterns = query({
  args: {
    studentId: v.optional(v.id("students")),
    lectureId: v.optional(v.id("lectures")),
    dateRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  handler: async (ctx, args): Promise<{
    totalResponses: number;
    overallAccuracy: number;
    timePattern: Array<{ hour: number; responses: number; accuracy: number }>;
    dayPattern: Array<{ day: string; responses: number; accuracy: number }>;
    difficultyPattern: Array<{ difficulty: string; attempts: number; correct: number; accuracy: number }>;
    maxStreak: number;
    learningVelocity: number;
    recentActivity: Array<{ timestamp: number; isCorrect: boolean }>;
  }> => {
    // 応答データを取得
    let responses = await ctx.db.query("responses").collect();

    // 講義でフィルタリング
    if (args.lectureId) {
      const lectureId = args.lectureId; // 型推論のために変数に代入
      const lectureQaIds = await ctx.db
        .query("qa_templates")
        .withIndex("by_lecture", (q) => q.eq("lectureId", lectureId))
        .collect()
        .then(qas => qas.map(qa => qa._id));
      
      responses = responses.filter(r => 
        lectureQaIds.includes(r.qaId)
      );
    }

    // 日付範囲でフィルタリング
    if (args.dateRange) {
      responses = responses.filter(r => 
        r.timestamp >= args.dateRange!.start &&
        r.timestamp <= args.dateRange!.end
      );
    }

    // 時間帯別分析
    const hourlyPattern = Array(24).fill(0).map(() => ({ 
      attempts: 0, 
      correct: 0 
    }));
    
    // 曜日別分析
    const weeklyPattern = Array(7).fill(0).map(() => ({ 
      attempts: 0, 
      correct: 0 
    }));

    // 難易度別パフォーマンス
    const difficultyPattern = {
      easy: { attempts: 0, correct: 0 },
      medium: { attempts: 0, correct: 0 },
      hard: { attempts: 0, correct: 0 },
    };

    // 連続正解数の追跡
    let currentStreak = 0;
    let maxStreak = 0;
    const sortedResponses = [...responses].sort((a, b) => a.timestamp - b.timestamp);

    for (const response of sortedResponses) {
      // 時間帯分析
      const hour = new Date(response.timestamp).getHours();
      hourlyPattern[hour].attempts++;
      if (response.isCorrect) {
        hourlyPattern[hour].correct++;
      }

      // 曜日分析
      const dayOfWeek = new Date(response.timestamp).getDay();
      weeklyPattern[dayOfWeek].attempts++;
      if (response.isCorrect) {
        weeklyPattern[dayOfWeek].correct++;
      }

      // 連続正解の追跡
      if (response.isCorrect) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // 難易度別の分析（QAテンプレート情報が必要）
    const qaIds = [...new Set(responses.map(r => r.qaId))];
    const qaTemplates = await Promise.all(
      qaIds.map(id => ctx.db.get(id))
    );

    for (const response of responses) {
      const qa = qaTemplates.find(q => q?._id === response.qaId);
      if (qa) {
        difficultyPattern[qa.difficulty].attempts++;
        if (response.isCorrect) {
          difficultyPattern[qa.difficulty].correct++;
        }
      }
    }

    // 学習速度の計算（最初と最後の期間での正答率比較）
    let learningVelocity = 0;
    if (sortedResponses.length > 10) {
      const firstQuarter = sortedResponses.slice(0, Math.floor(sortedResponses.length / 4));
      const lastQuarter = sortedResponses.slice(-Math.floor(sortedResponses.length / 4));
      
      const firstAccuracy = firstQuarter.filter(r => r.isCorrect).length / firstQuarter.length;
      const lastAccuracy = lastQuarter.filter(r => r.isCorrect).length / lastQuarter.length;
      
      learningVelocity = ((lastAccuracy - firstAccuracy) / firstAccuracy) * 100;
    }

    return {
      totalResponses: responses.length,
      overallAccuracy: responses.length > 0 
        ? Math.round((responses.filter(r => r.isCorrect).length / responses.length) * 100)
        : 0,
      timePattern: hourlyPattern.map((data, hour) => ({
        hour,
        responses: data.attempts,
        accuracy: data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0,
      })),
      dayPattern: weeklyPattern.map((data, day) => ({
        day: ['日', '月', '火', '水', '木', '金', '土'][day],
        responses: data.attempts,
        accuracy: data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0,
      })),
      difficultyPattern: [
        {
          difficulty: "易しい",
          attempts: difficultyPattern.easy.attempts,
          correct: difficultyPattern.easy.correct,
          accuracy: difficultyPattern.easy.attempts > 0 ? Math.round((difficultyPattern.easy.correct / difficultyPattern.easy.attempts) * 100) : 0,
        },
        {
          difficulty: "普通",
          attempts: difficultyPattern.medium.attempts,
          correct: difficultyPattern.medium.correct,
          accuracy: difficultyPattern.medium.attempts > 0 ? Math.round((difficultyPattern.medium.correct / difficultyPattern.medium.attempts) * 100) : 0,
        },
        {
          difficulty: "難しい",
          attempts: difficultyPattern.hard.attempts,
          correct: difficultyPattern.hard.correct,
          accuracy: difficultyPattern.hard.attempts > 0 ? Math.round((difficultyPattern.hard.correct / difficultyPattern.hard.attempts) * 100) : 0,
        },
      ],
      maxStreak,
      learningVelocity: Math.round(learningVelocity),
      recentActivity: sortedResponses.slice(-10).map(r => ({
        timestamp: r.timestamp,
        isCorrect: r.isCorrect,
      })),
    };
  },
});

// 予測分析
export const getPredictiveAnalytics = query({
  args: { 
    studentId: v.id("students"),
    lectureId: v.optional(v.id("lectures")),
  },
  handler: async (ctx, args) => {
    // 学生の過去の回答履歴を取得
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .order("desc")
      .take(100);

    if (responses.length < 10) {
      return {
        hasEnoughData: false,
        message: "予測分析には最低10件の回答履歴が必要です",
      };
    }

    // 最近のパフォーマンストレンド
    const recentResponses = responses.slice(0, 20);
    const recentAccuracy = recentResponses.filter(r => r.isCorrect).length / recentResponses.length;

    // 時系列での正答率の変化
    const chunks = [];
    for (let i = 0; i < responses.length; i += 10) {
      const chunk = responses.slice(i, i + 10);
      const accuracy = chunk.filter(r => r.isCorrect).length / chunk.length;
      chunks.push(accuracy);
    }

    // トレンドの計算（線形回帰の簡易版）
    const trend = chunks.length > 1 
      ? (chunks[0] - chunks[chunks.length - 1]) / chunks.length 
      : 0;

    // 予測される次回の正答率
    const predictedAccuracy = Math.max(0, Math.min(100, 
      Math.round((recentAccuracy + trend) * 100)
    ));

    // 推奨される学習アクション
    const recommendations = [];
    
    if (recentAccuracy < 0.6) {
      recommendations.push({
        type: "review",
        priority: "high",
        message: "基礎的な内容の復習をお勧めします",
      });
    }

    if (trend < -0.1) {
      recommendations.push({
        type: "break",
        priority: "medium",
        message: "疲労が蓄積している可能性があります。休憩を取りましょう",
      });
    }

    if (recentAccuracy > 0.9) {
      recommendations.push({
        type: "challenge",
        priority: "low",
        message: "より難しい問題に挑戦してみましょう",
      });
    }

    // 苦手分野の特定
    const qaIds = responses.map(r => r.qaId);
    const uniqueQaIds = [...new Set(qaIds)];
    const qaTemplates = await Promise.all(
      uniqueQaIds.map(id => ctx.db.get(id))
    );

    const topicPerformance = new Map();
    
    for (const response of responses) {
      const qa = qaTemplates.find(q => q?._id === response.qaId);
      if (qa) {
        const topic = qa.question.split(/[。？]/)[0].substring(0, 20);
        if (!topicPerformance.has(topic)) {
          topicPerformance.set(topic, { correct: 0, total: 0 });
        }
        const perf = topicPerformance.get(topic);
        perf.total++;
        if (response.isCorrect) perf.correct++;
      }
    }

    const weakTopics = Array.from(topicPerformance.entries())
      .map(([topic, perf]) => ({
        topic,
        accuracy: Math.round((perf.correct / perf.total) * 100),
        attempts: perf.total,
      }))
      .filter(t => t.accuracy < 70 && t.attempts >= 3)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    return {
      hasEnoughData: true,
      currentPerformance: {
        recentAccuracy: Math.round(recentAccuracy * 100),
        trend: trend > 0 ? "improving" : trend < 0 ? "declining" : "stable",
        trendValue: Math.round(trend * 100),
      },
      prediction: {
        nextSessionAccuracy: predictedAccuracy,
        confidence: chunks.length >= 5 ? "high" : "medium",
      },
      recommendations,
      weakTopics,
      performanceHistory: chunks.map((accuracy, index) => ({
        period: `${(index + 1) * 10}問前`,
        accuracy: Math.round(accuracy * 100),
      })).reverse(),
    };
  },
});

// コホート分析
export const getCohortAnalysis = query({
  args: { 
    lectureId: v.id("lectures"),
    cohortSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cohortSize = args.cohortSize || 10;
    
    // 講義のQAを取得
    const qaTemplates = await ctx.db
      .query("qa_templates")
      .withIndex("by_lecture", (q) => q.eq("lectureId", args.lectureId))
      .collect();

    const qaIds = qaTemplates.map(qa => qa._id);

    // 全ての関連する回答を取得
    const allResponses = await ctx.db
      .query("responses")
      .collect();

    const relevantResponses = allResponses.filter(r => qaIds.includes(r.qaId));

    // 学生ごとにグループ化
    const studentPerformance = new Map();
    
    for (const response of relevantResponses) {
      if (!studentPerformance.has(response.studentId)) {
        studentPerformance.set(response.studentId, {
          studentId: response.studentId,
          responses: [],
          firstResponseTime: response.timestamp,
        });
      }
      studentPerformance.get(response.studentId).responses.push(response);
    }

    // パフォーマンスでソートしてコホートに分割
    const students = Array.from(studentPerformance.values())
      .map(student => ({
        ...student,
        accuracy: student.responses.filter((r: any) => r.isCorrect).length / student.responses.length,
        totalResponses: student.responses.length,
      }))
      .filter(s => s.totalResponses >= 5) // 最低5回答した学生のみ
      .sort((a, b) => b.accuracy - a.accuracy);

    // コホートに分割
    const cohorts = [];
    const cohortsCount = Math.ceil(students.length / cohortSize);
    
    for (let i = 0; i < cohortsCount; i++) {
      const cohortStudents = students.slice(i * cohortSize, (i + 1) * cohortSize);
      
      if (cohortStudents.length === 0) continue;

      // コホートの統計を計算
      const avgAccuracy = cohortStudents.reduce((sum, s) => sum + s.accuracy, 0) / cohortStudents.length;
      const avgResponses = cohortStudents.reduce((sum, s) => sum + s.totalResponses, 0) / cohortStudents.length;
      
      // 学習速度（最初の回答から最後の回答までの期間）
      const learningDurations = cohortStudents.map(s => {
        const sorted = s.responses.sort((a: any, b: any) => a.timestamp - b.timestamp);
        return sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
      });
      const avgLearningDuration = learningDurations.reduce((sum, d) => sum + d, 0) / learningDurations.length;

      cohorts.push({
        cohortNumber: i + 1,
        label: i === 0 ? "上位群" : i === cohortsCount - 1 ? "下位群" : `中位群${i}`,
        studentCount: cohortStudents.length,
        avgAccuracy: Math.round(avgAccuracy * 100),
        avgResponses: Math.round(avgResponses),
        avgLearningDays: Math.round(avgLearningDuration / (1000 * 60 * 60 * 24)),
        students: cohortStudents.slice(0, 5).map(s => ({ // 最大5名まで表示
          studentId: s.studentId,
          accuracy: Math.round(s.accuracy * 100),
          responses: s.totalResponses,
        })),
      });
    }

    return {
      totalStudents: students.length,
      cohorts,
      insights: generateCohortInsights(cohorts),
    };
  },
});

// コホート分析からインサイトを生成
function generateCohortInsights(cohorts: any[]) {
  const insights = [];

  if (cohorts.length >= 2) {
    const topCohort = cohorts[0];
    const bottomCohort = cohorts[cohorts.length - 1];

    if (topCohort.avgAccuracy - bottomCohort.avgAccuracy > 30) {
      insights.push({
        type: "performance_gap",
        severity: "high",
        message: `上位群と下位群の正答率に${topCohort.avgAccuracy - bottomCohort.avgAccuracy}%の大きな差があります`,
      });
    }

    if (topCohort.avgResponses > bottomCohort.avgResponses * 1.5) {
      insights.push({
        type: "engagement_difference",
        severity: "medium",
        message: "上位群は下位群より積極的に問題に取り組んでいます",
      });
    }

    if (bottomCohort.avgLearningDays > topCohort.avgLearningDays * 2) {
      insights.push({
        type: "learning_speed",
        severity: "medium",
        message: "下位群は学習に時間がかかっています。サポートが必要かもしれません",
      });
    }
  }

  return insights;
} 