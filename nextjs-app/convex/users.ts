import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ユーザー情報を取得
export const getUserById = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

// ユーザー一覧取得
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("users").collect();
    },
});

// メールアドレスでユーザーを取得
export const getUserByEmail = query({
    args: {
        email: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_email", q => q.eq("email", args.email))
            .first();
    },
});

// ユーザー削除
export const deleteUser = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.userId);
        return { success: true };
    },
});

// Convex Authがユーザー作成を管理するため、createUserミューテーションは削除しました
// ユーザー作成はauth.config.tsのcreateOrUpdateUserコールバックで処理されます