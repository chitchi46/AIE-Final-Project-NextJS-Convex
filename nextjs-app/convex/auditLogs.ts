import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// 監査ログを記録するミューテーション
export const logAction = mutation({
  args: {
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
    resourceId: v.optional(v.string()),
    details: v.optional(v.object({
      previousValue: v.optional(v.any()),
      newValue: v.optional(v.any()),
      affectedCount: v.optional(v.number()),
      description: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.auth.getCurrentUser);
    if (!user) {
      throw new Error("認証が必要です。ログインしてください。");
    }

    // 監査ログを記録
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      userEmail: user.email,
      action: args.action,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      details: args.details,
      timestamp: Date.now(),
    });
  },
});

// 監査ログを取得するクエリ
export const getAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    userId: v.optional(v.string()),
    resourceType: v.optional(v.union(
      v.literal("qa_template"),
      v.literal("lecture"),
      v.literal("student"),
      v.literal("user"),
      v.literal("improvement_suggestion")
    )),
    action: v.optional(v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete"),
      v.literal("publish"),
      v.literal("unpublish"),
      v.literal("bulk_action")
    )),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.auth.getCurrentUser);
    if (!user || user.role !== "teacher") {
      throw new Error("権限がありません");
    }

    const limit = args.limit || 50;
    
    // まず基本的なクエリを作成
    let results;
    if (args.userId !== undefined) {
      results = await ctx.db
        .query("auditLogs")
        .withIndex("by_user", (q) => q.eq("userId", args.userId!))
        .order("desc")
        .take(limit);
    } else {
      results = await ctx.db
        .query("auditLogs")
        .order("desc")
        .take(limit);
    }

    // 追加のフィルタリング（インメモリ）
    let filteredResults = results;

    if (args.resourceType) {
      filteredResults = filteredResults.filter(log => log.resourceType === args.resourceType);
    }

    if (args.action) {
      filteredResults = filteredResults.filter(log => log.action === args.action);
    }

    if (args.startDate !== undefined) {
      filteredResults = filteredResults.filter(log => log.timestamp >= args.startDate!);
    }

    if (args.endDate !== undefined) {
      filteredResults = filteredResults.filter(log => log.timestamp <= args.endDate!);
    }

    return {
      logs: filteredResults,
      hasMore: results.length === limit,
    };
  },
});

// 特定のリソースの監査ログを取得
export const getResourceAuditLogs = query({
  args: {
    resourceType: v.union(
      v.literal("qa_template"),
      v.literal("lecture"),
      v.literal("student"),
      v.literal("user"),
      v.literal("improvement_suggestion")
    ),
    resourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.auth.getCurrentUser);
    if (!user || user.role !== "teacher") {
      throw new Error("権限がありません");
    }

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_resource", (q) => 
        q.eq("resourceType", args.resourceType).eq("resourceId", args.resourceId)
      )
      .order("desc")
      .take(100);

    return logs;
  },
});

// 監査ログの統計情報を取得
export const getAuditLogStats = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.auth.getCurrentUser);
    if (!user || user.role !== "teacher") {
      throw new Error("権限がありません");
    }

    // すべてのログを取得
    const logs = await ctx.db.query("auditLogs").collect();

    // 日付フィルタリング
    let filteredLogs = logs;
    if (args.startDate !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= args.startDate!);
    }
    if (args.endDate !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= args.endDate!);
    }

    // 統計情報を集計
    const stats = {
      totalActions: filteredLogs.length,
      actionCounts: {} as Record<string, number>,
      resourceTypeCounts: {} as Record<string, number>,
      userActionCounts: {} as Record<string, number>,
      recentActions: filteredLogs.slice(0, 10),
    };

    filteredLogs.forEach(log => {
      // アクション別カウント
      stats.actionCounts[log.action] = (stats.actionCounts[log.action] || 0) + 1;
      
      // リソースタイプ別カウント
      stats.resourceTypeCounts[log.resourceType] = (stats.resourceTypeCounts[log.resourceType] || 0) + 1;
      
      // ユーザー別カウント
      stats.userActionCounts[log.userEmail] = (stats.userActionCounts[log.userEmail] || 0) + 1;
    });

    return stats;
  },
}); 