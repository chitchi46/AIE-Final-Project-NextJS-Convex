import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// 学生一覧取得
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("students").collect();
  },
});

// 学生作成または取得（プライバシー保護付き）
export const getOrCreateStudent = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // 認証チェック
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    // 認証されたユーザーの情報を取得
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // メールアドレスが一致しない場合はエラー
    if (user.email !== args.email) {
      throw new ConvexError("Unauthorized: Cannot create student for different email");
    }

    // 既存の学生を検索
    const existingStudent = await ctx.db
      .query("students")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existingStudent) {
      return existingStudent._id;
    }

    // 新規作成
    const studentId = await ctx.db.insert("students", {
      email: args.email,
      name: args.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return studentId;
  },
});

// 自分の学生情報を取得（プライバシー保護付き）
export const getMyStudentInfo = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    const student = await ctx.db
      .query("students")
      .filter((q) => q.eq(q.field("email"), user.email))
      .first();

    return student;
  },
});

// 学生IDで情報を取得（教師・管理者のみ）
export const getStudentById = query({
  args: {
    studentId: v.id("students"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    // 認証されたユーザーの情報を取得
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    if (user.role !== "teacher" && user.role !== "admin") {
      throw new ConvexError("Unauthorized: Only teachers and admins can view student details");
    }

    const student = await ctx.db.get(args.studentId);
    if (!student) {
      return null;
    }

    // 個人情報を部分的にマスク（プライバシー保護）
    return {
      _id: student._id,
      name: student.name,
      email: student.email.replace(/^(.{2}).*(@.*)$/, "$1***$2"), // メールアドレスを部分的にマスク
      createdAt: student.createdAt,
    };
  },
});

// 学生の統計情報を取得（個人を特定しない形で）
export const getAnonymizedStudentStats = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    // 認証されたユーザーの情報を取得
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    if (user.role !== "teacher" && user.role !== "admin") {
      throw new ConvexError("Unauthorized: Only teachers and admins can view statistics");
    }

    const students = await ctx.db.query("students").collect();
    
    // 個人を特定できない統計情報のみを返す
    return {
      totalStudents: students.length,
      registrationsByMonth: students.reduce((acc, student) => {
        const month = new Date(student.createdAt).toISOString().slice(0, 7);
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },
});

// メールアドレスで学生を検索
export const getStudentByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("students")
      .withIndex("by_email", q => q.eq("email", args.email))
      .first();
  },
});

// 学生削除
export const deleteStudent = mutation({
  args: {
    studentId: v.id("students"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.studentId);
    return { success: true };
  },
}); 