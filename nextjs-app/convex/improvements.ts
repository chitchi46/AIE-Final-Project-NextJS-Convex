import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// 改善提案を作成
export const createSuggestion = mutation({
  args: {
    lectureId: v.id("lectures"),
    content: v.string(),
    targetQaIds: v.array(v.id("qa_templates")),
    averageScore: v.number(),
    generationHash: v.optional(v.string()),
    generatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const suggestionId = await ctx.db.insert("improvement_suggestions", {
      lectureId: args.lectureId,
      content: args.content,
      targetQaIds: args.targetQaIds,
      averageScore: args.averageScore,
      status: "completed",
      generationHash: args.generationHash,
      generatedBy: args.generatedBy,
      createdAt: Date.now(),
    });

    return suggestionId;
  },
});

// ハッシュによる重複チェック
export const checkDuplicateByHash = query({
  args: { 
    lectureId: v.id("lectures"),
    hash: v.string() 
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("improvement_suggestions")
      .withIndex("by_hash", (q) => q.eq("generationHash", args.hash))
      .filter((q) => q.eq(q.field("lectureId"), args.lectureId))
      .first();
    
    return existing !== null;
  },
});

// 進行中の生成があるかチェック
export const hasGeneratingStatus = query({
  args: { lectureId: v.id("lectures") },
  handler: async (ctx, args) => {
    const generating = await ctx.db
      .query("improvement_suggestions")
      .withIndex("by_lecture", (q) => q.eq("lectureId", args.lectureId))
      .filter((q) => q.eq(q.field("status"), "generating"))
      .first();
    
    return generating !== null;
  },
});

// ステータスを更新
export const updateStatus = mutation({
  args: {
    suggestionId: v.id("improvement_suggestions"),
    status: v.union(
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("applied")
    ),
    errorMessage: v.optional(v.string()),
    appliedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.suggestionId, {
      status: args.status,
      ...(args.errorMessage && { errorMessage: args.errorMessage }),
      ...(args.appliedAt && { appliedAt: args.appliedAt }),
    });
  },
});

// 講義の改善提案を取得（ステータスでフィルタリング可能）
export const getSuggestionsByLecture = query({
  args: { 
    lectureId: v.id("lectures"),
    status: v.optional(v.union(
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("applied")
    ))
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("improvement_suggestions")
      .withIndex("by_lecture", (q) => q.eq("lectureId", args.lectureId));
    
    // ステータスフィルター
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    const suggestions = await query.order("desc").collect();

    // 関連するQ&A情報も含めて返す
    const suggestionsWithQAs = await Promise.all(
      suggestions.map(async (suggestion) => {
        const qas = await Promise.all(
          suggestion.targetQaIds.map((qaId) => ctx.db.get(qaId))
        );
        return {
          ...suggestion,
          targetQAs: qas.filter(qa => qa !== null),
        };
      })
    );

    return suggestionsWithQAs;
  },
});

// 改善提案を削除
export const deleteSuggestion = mutation({
  args: { suggestionId: v.id("improvement_suggestions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.suggestionId);
    return { success: true };
  },
});

// 最新の改善提案を取得
export const getLatestSuggestions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    const suggestions = await ctx.db
      .query("improvement_suggestions")
      .order("desc")
      .take(limit);

    // 講義情報も含めて返す
    const suggestionsWithLectures = await Promise.all(
      suggestions.map(async (suggestion) => {
        const lecture = await ctx.db.get(suggestion.lectureId);
        return {
          ...suggestion,
          lecture,
        };
      })
    );

    return suggestionsWithLectures;
  },
}); 