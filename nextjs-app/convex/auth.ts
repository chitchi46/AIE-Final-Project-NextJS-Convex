import { ConvexError, v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// Convex Authの関数を再エクスポート
export { signIn, signOut, store, isAuthenticated } from "./authConfig";

//
// Public Functions for Client (e.g., from API Routes)
//

export const getUserById = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            return null;
        }
        return user;
    },
});

export const getUserByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();
        if (!user) {
            return null;
        }
        return user;
    },
});

// Convex Authが自動的にユーザーを作成するため、このミューテーションは不要になりました
// 代わりに、Convex AuthのcreateOrUpdateUserコールバックを使用します

//
// Functions for use within Convex (e.g., from other queries/mutations)
//

export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
      const userId = await getAuthUserId(ctx);
      if (!userId) {
        return null;
      }

      const user = await ctx.db.get(userId);
      if (!user) {
        return null;
      }

      return {
        ...user,
        id: user._id, // 互換性のため
      };
    },
  });

// ユーザーロール更新
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("student"), v.literal("teacher"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // 現在のユーザーを取得
    const currentUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!currentUser || currentUser.role !== "admin") {
      throw new ConvexError("Only admins can update user roles");
    }

    await ctx.db.patch(args.userId, { role: args.role });
    return { success: true };
  },
});

// Convex Authに対応したユーザー登録は、auth.config.tsで処理される

export const getUserForAuth = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (!user) {
      return null;
    }
    return user;
  },
});

// 認証アカウント削除（管理用）
export const deleteAuthAccount = mutation({
  args: {
    accountId: v.id("authAccounts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.accountId);
    return { success: true };
  },
});

// すべての認証アカウントを取得（管理用）
export const getAllAuthAccounts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("authAccounts").collect();
  },
});

// 名前重複チェック関数
export const checkNameAvailability = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    // by_nameインデックスを使用して効率的にチェック
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    return {
      available: !existingUser,
      message: existingUser ? "この名前は既に使用されています。別の名前をお選びください。" : null,
    };
  },
});

// カスタム登録関数（名前重複チェック付き）
export const registerUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
    role: v.union(v.literal("student"), v.literal("teacher"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    // 名前重複チェック
    const existingUserByName = await ctx.db
      .query("users")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    if (existingUserByName) {
      throw new ConvexError("この名前は既に使用されています。別の名前をお選びください。");
    }

    // メール重複チェック
    const existingUserByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existingUserByEmail) {
      throw new ConvexError("このメールアドレスは既に使用されています。");
    }

    // 新規ユーザーを作成
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      role: args.role,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { userId, success: true };
  },
}); 