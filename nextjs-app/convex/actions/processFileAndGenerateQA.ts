"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import OpenAI from "openai";

const TIMEOUT_DURATION = 180000; // 3分 = 180秒 = 180000ミリ秒

// ファイル処理とQ&A生成を自動で実行するパイプライン
export const processFileAndGenerateQA = action({
  args: {
    lectureId: v.id("lectures"),
    fileId: v.id("files"),
    difficulty: v.object({
      easy: v.number(),
      medium: v.number(),
      hard: v.number(),
    }),
    questionCount: v.number(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message: string;
    generatedQACount: number;
  }> => {
    const startTime = Date.now();
    
    // タイムアウトを設定
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("処理がタイムアウトしました（3分以内に完了しませんでした）"));
      }, TIMEOUT_DURATION);
    });

    // メイン処理
    const processPromise = async () => {
      try {
        // ファイル情報を取得
        const file = await ctx.runQuery(api.files.getFile, { fileId: args.fileId });
        if (!file) {
          throw new Error("ファイルが見つかりません");
        }

        // ファイル内容を抽出
        const extractResult = await ctx.runAction(api.actions.extractFileContent.extractFileContent, {
          fileId: args.fileId,
        });

        if (!extractResult.content || extractResult.content.trim().length === 0) {
          throw new Error("ファイルから内容を抽出できませんでした");
        }

        const content = extractResult.content;
        
        console.log(`抽出されたコンテンツ長: ${content.length}文字`);
        console.log(`コンテンツの最初の200文字: ${content.substring(0, 200)}...`);

        // 処理時間を計測
        const extractionTime = Date.now() - startTime;
        console.log(`ファイル抽出完了: ${extractionTime}ms`);

        // 残り時間を計算
        const remainingTime = TIMEOUT_DURATION - extractionTime;
        if (remainingTime < 30000) { // 残り30秒未満
          throw new Error("処理時間が不足しています");
        }

        // Q&Aを生成（残り時間を考慮）
        const qaResult = await Promise.race([
          ctx.runAction(api.actions.generateQA.generateQAWithAI, {
            lectureId: args.lectureId,
            content,
            difficulty: args.difficulty,
            questionCount: args.questionCount,
          }),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error("Q&A生成がタイムアウトしました"));
            }, remainingTime - 10000); // 10秒のバッファを残す
          }),
        ]);

        const totalTime = Date.now() - startTime;
        console.log(`処理完了: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}秒)`);

        return {
          success: true,
          message: `${file.name}から${qaResult.generatedCount}個のQ&Aを生成しました（${(totalTime / 1000).toFixed(1)}秒）`,
          generatedQACount: qaResult.generatedCount,
        };
      } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error("ファイル処理エラー:", error);
        console.error(`処理時間: ${totalTime}ms`);
        
        return {
          success: false,
          message: error instanceof Error ? error.message : "ファイル処理中にエラーが発生しました",
          generatedQACount: 0,
        };
      }
    };

    // タイムアウトと処理を競争させる
    try {
      return await Promise.race([processPromise(), timeoutPromise]);
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`タイムアウトエラー: ${totalTime}ms`);
      
      return {
        success: false,
        message: "処理が3分以内に完了しませんでした。ファイルサイズを小さくするか、内容を分割してください。",
        generatedQACount: 0,
      };
    }
  },
}); 