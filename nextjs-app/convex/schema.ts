import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // Convex Auth tables
  ...authTables,
  // 講義メタ情報
  lectures: defineTable({
    title: v.string(),
    description: v.string(),
    files: v.array(v.object({
      name: v.string(),
      url: v.string(),
      type: v.string(),
    })),
    createdBy: v.string(), // 講師ID
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_createdBy", ["createdBy"]),

  // 自動生成QA
  qa_templates: defineTable({
    lectureId: v.id("lectures"),
    question: v.string(),
    questionType: v.union(v.literal("multiple_choice"), v.literal("short_answer"), v.literal("descriptive")),
    options: v.optional(v.array(v.string())), // 選択式の場合のオプション
    answer: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    explanation: v.optional(v.string()), // 解説
    isPublished: v.optional(v.boolean()), // 公開状態（デフォルトはtrue）
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_lecture", ["lectureId"])
    .index("by_difficulty", ["difficulty"]),

  // 回答履歴
  responses: defineTable({
    qaId: v.id("qa_templates"),
    studentId: v.id("students"),
    answer: v.string(),
    isCorrect: v.boolean(),
    timestamp: v.number(),
  }).index("by_qa", ["qaId"])
    .index("by_student", ["studentId"])
    .index("by_timestamp", ["timestamp"]),

  // 学生プロフィール
  students: defineTable({
    name: v.string(),
    email: v.string(),
    metadata: v.optional(v.object({
      studentId: v.optional(v.string()),
      department: v.optional(v.string()),
      year: v.optional(v.number()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  // 改善提案
  improvement_suggestions: defineTable({
    lectureId: v.id("lectures"),
    content: v.string(),
    targetQaIds: v.array(v.id("qa_templates")), // 関連するQAのID
    averageScore: v.number(), // 対象QAの平均正答率
    status: v.optional(v.union(
      v.literal("generating"), // 生成中
      v.literal("completed"),  // 完了
      v.literal("failed"),     // 失敗
      v.literal("applied")     // 適用済み
    )),
    generationHash: v.optional(v.string()), // 重複防止用のハッシュ
    generatedBy: v.optional(v.string()),    // 生成したユーザーID
    appliedAt: v.optional(v.number()),      // 適用された日時
    errorMessage: v.optional(v.string()),   // エラーメッセージ
    createdAt: v.number(),
  }).index("by_lecture", ["lectureId"])
    .index("by_status", ["status"])
    .index("by_hash", ["generationHash"]),

  // ユーザー認証情報（Convex Authで管理）
  users: defineTable({
    email: v.string(),
    name: v.string(),
    password: v.optional(v.string()), // 既存データとの互換性のため
    role: v.union(v.literal("teacher"), v.literal("student"), v.literal("admin")),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_email", ["email"])
    .index("by_name", ["name"]),

  // ファイル情報
  files: defineTable({
    storageId: v.string(),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    lectureId: v.optional(v.id("lectures")),
    uploadedAt: v.number(),
  }),

  // ライブセッション
  liveSessions: defineTable({
    lectureId: v.id("lectures"),
    hostId: v.string(),
    title: v.string(),
    accessCode: v.string(),
    status: v.union(v.literal("waiting"), v.literal("active"), v.literal("ended")),
    participants: v.array(v.object({
      id: v.string(),
      name: v.string(),
      joinedAt: v.number(),
      score: v.number(),
    })),
    currentQuestionIndex: v.number(),
    currentQuestionStartedAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_access_code", ["accessCode"])
    .index("by_host", ["hostId"])
    .index("by_status", ["status"]),

  // ライブ回答
  liveAnswers: defineTable({
    sessionId: v.id("liveSessions"),
    participantId: v.string(),
    questionIndex: v.number(),
    qaId: v.id("qa_templates"),
    answer: v.string(),
    isCorrect: v.boolean(),
    timeSpent: v.number(),
    submittedAt: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_participant", ["participantId"]),
  
  // パーソナライゼーションデータ
  personalization_data: defineTable({
    studentId: v.id("students"),
    lectureId: v.id("lectures"),
    learningLevel: v.string(),
    personalizedDifficulty: v.object({
      easy: v.number(),
      medium: v.number(),
      hard: v.number(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_student_lecture", ["studentId", "lectureId"])
    .index("by_student", ["studentId"]),

  // ログイン試行追跡
  loginAttempts: defineTable({
    email: v.string(),
    attemptTime: v.number(),
    success: v.boolean(),
  }).index("by_email", ["email"]),

  // 操作監査ログ
  auditLogs: defineTable({
    userId: v.string(), // 操作を行ったユーザーのID
    userEmail: v.string(), // ユーザーのメールアドレス
    action: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete"),
      v.literal("publish"),
      v.literal("unpublish"),
      v.literal("bulk_action")
    ),
    resourceType: v.union(
      v.literal("qa_template"),
      v.literal("lecture"),
      v.literal("student"),
      v.literal("user"),
      v.literal("improvement_suggestion")
    ),
    resourceId: v.optional(v.string()), // 対象リソースのID
    details: v.optional(v.object({
      previousValue: v.optional(v.any()),
      newValue: v.optional(v.any()),
      affectedCount: v.optional(v.number()), // 一括操作時の影響を受けた件数
      description: v.optional(v.string()), // 操作の詳細説明
    })),
    timestamp: v.number(),
    ipAddress: v.optional(v.string()), // IPアドレス（オプション）
    userAgent: v.optional(v.string()), // ユーザーエージェント（オプション）
  })
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_resource", ["resourceType", "resourceId"])
    .index("by_action", ["action"]),
}); 