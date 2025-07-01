"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 抽出済みのテキストからタイトルと概要を生成
export const generateSuggestions = action({
  args: {
    content: v.string(),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    title: string;
    description: string;
  }> => {
    try {
      if (!args.content || args.content.trim().length === 0) {
        throw new Error("コンテンツが空です");
      }

      // 内容が長すぎる場合は最初の部分だけを使用（約2000文字）
      const contentForAnalysis = args.content.substring(0, 2000);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "あなたは教育コンテンツの分析専門家です。与えられた講義資料の内容から、適切なタイトルと概要を生成してください。"
          },
          {
            role: "user",
            content: `以下の講義資料の内容から、適切なタイトルと概要を生成してください。

講義資料の内容:
${contentForAnalysis}

以下の形式で回答してください:
タイトル: [簡潔で分かりやすいタイトル]
概要: [200文字程度の講義内容の要約]`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const response = completion.choices[0].message.content || "";
      const titleMatch = response.match(/タイトル:\s*(.+)/);
      const descriptionMatch = response.match(/概要:\s*([\s\S]+?)(?=\n|$)/g);
      
      let title = "";
      let description = "";
      
      if (titleMatch) {
        title = titleMatch[1].trim();
      } else if (args.fileName) {
        // フォールバック: ファイル名からタイトルを生成
        title = args.fileName
          .replace(/\.(pdf|txt|md|docx)$/i, "")
          .replace(/[_-]/g, " ")
          .trim();
      } else {
        title = "無題の講義";
      }
      
      if (descriptionMatch) {
        description = descriptionMatch[1].trim();
      } else {
        // フォールバック: 内容の最初の部分を概要として使用
        const lines = args.content.split('\n').filter(line => line.trim().length > 0);
        description = lines.slice(0, 3).join(' ').substring(0, 200) + "...";
      }

      return {
        title,
        description
      };
    } catch (error) {
      console.error("提案生成エラー:", error);
      
      // エラー時のフォールバック
      const fallbackTitle = args.fileName 
        ? args.fileName.replace(/\.(pdf|txt|md|docx)$/i, "").replace(/[_-]/g, " ").trim()
        : "無題の講義";
      
      const lines = args.content.split('\n').filter(line => line.trim().length > 0);
      const fallbackDescription = lines.slice(0, 3).join(' ').substring(0, 200) + "...";
      
      return {
        title: fallbackTitle,
        description: fallbackDescription
      };
    }
  },
}); 