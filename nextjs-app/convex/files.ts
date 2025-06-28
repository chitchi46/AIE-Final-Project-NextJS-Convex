import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ファイルアップロード用のURL生成
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// ファイル情報の保存
export const saveFile = mutation({
  args: {
    storageId: v.string(),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    lectureId: v.optional(v.id("lectures")),
  },
  handler: async (ctx, args) => {
    const fileId = await ctx.db.insert("files", {
      storageId: args.storageId,
      name: args.name,
      type: args.type,
      size: args.size,
      lectureId: args.lectureId,
      uploadedAt: Date.now(),
    });
    return fileId;
  },
});

// ファイル情報の取得
export const getFile = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) return null;

    const url = await ctx.storage.getUrl(file.storageId);
    return {
      ...file,
      url,
    };
  },
});

// 講義に関連するファイルの取得
export const getFilesByLecture = query({
  args: {
    lectureId: v.id("lectures"),
  },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .filter(q => q.eq(q.field("lectureId"), args.lectureId))
      .collect();

    return await Promise.all(
      files.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId);
        return {
          ...file,
          url,
        };
      })
    );
  },
});

// ファイルの削除
export const deleteFile = mutation({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) return;

    // ストレージからファイルを削除
    await ctx.storage.delete(file.storageId);
    
    // データベースからレコードを削除
    await ctx.db.delete(args.fileId);
  },
}); 