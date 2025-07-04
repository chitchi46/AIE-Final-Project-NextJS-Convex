"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import OpenAI from "openai";
import crypto from "crypto";

// 改善提案を生成するアクション
export const generateImprovementSuggestions = action({
  args: {
    lectureId: v.id("lectures"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    suggestions: Array<{
      id: number;
      suggestion: string;
      targetQaIds: string[];
      statistics: any;
    }>;
    message: string;
  }> => {
    try {
      // 現在のユーザー情報を取得（仮実装）
      const userId = "current-user-id"; // TODO: 実際のユーザーIDを取得

      // 進行中の生成がないかチェック
      const hasGenerating = await ctx.runQuery(api.improvements.hasGeneratingStatus, {
        lectureId: args.lectureId,
      });

      if (hasGenerating) {
        return {
          success: false,
          suggestions: [],
          message: "現在、他の改善提案を生成中です。しばらくお待ちください。",
        };
      }

      // 講義情報を取得
      const lecture: any = await ctx.runQuery(api.lectures.getLecture, {
        lectureId: args.lectureId,
      });

      if (!lecture) {
        throw new Error("講義が見つかりません");
      }

      // 統計情報を取得
      const stats = await ctx.runQuery(api.stats.statsByLecture, {
        lectureId: args.lectureId,
      });

      // 講義のQ&Aリストを取得
      const qaList: any = await ctx.runQuery(api.qa.listQA, {
        lectureId: args.lectureId,
      });

      // 正答率が50%未満のQ&Aを特定
      const problematicQAs: any = qaList.filter((qa: any) => {
        const qaStats = stats.questionStats?.find((s: any) => s.qaId === qa._id);
        return qaStats && qaStats.accuracy < 50;
      });

      if (problematicQAs.length === 0) {
        return {
          success: true,
          suggestions: [],
          message: "改善が必要なQ&Aが見つかりませんでした。すべてのQ&Aで良好な正答率を維持しています。",
        };
      }

      // 生成内容のハッシュを作成（重複チェック用）
      const contentToHash = `${args.lectureId}-${problematicQAs.map((qa: any) => qa._id).sort().join('-')}-${Date.now().toString().slice(0, -3)}`;
      const generationHash = crypto.createHash('sha256').update(contentToHash).digest('hex');

      // 重複チェック
      const isDuplicate = await ctx.runQuery(api.improvements.checkDuplicateByHash, {
        lectureId: args.lectureId,
        hash: generationHash,
      });

      if (isDuplicate) {
        return {
          success: false,
          suggestions: [],
          message: "最近同じ内容の改善提案が生成されています。しばらく時間をおいてから再度お試しください。",
        };
      }

      // 生成中ステータスのプレースホルダーを作成
      const placeholderId = await ctx.runMutation(api.improvements.createSuggestion, {
        lectureId: args.lectureId,
        content: "生成中...",
        targetQaIds: problematicQAs.map((qa: any) => qa._id),
        averageScore: 0,
        generationHash,
        generatedBy: userId,
      });

      // ステータスを生成中に更新
      await ctx.runMutation(api.improvements.updateStatus, {
        suggestionId: placeholderId,
        status: "generating",
      });

      try {
        // OpenAI APIキーを環境変数から取得
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error("OpenAI API key is not configured");
        }

        const openai = new OpenAI({ apiKey });

        // OpenAI APIを使用して改善提案を生成
        const prompt: string = `
講義「${lecture.title}」の学習効果を改善するための提案をお願いします。

以下のQ&Aで正答率が低く（50%未満）、改善が必要です：

${problematicQAs.map((qa: any, index: number) => `
${index + 1}. 質問: ${qa.question}
   正解: ${qa.answer}
   難易度: ${qa.difficulty}
   正答率: ${stats.questionStats?.find((s: any) => s.qaId === qa._id)?.accuracy || 0}%
`).join('\n')}

各問題について、以下の観点から改善提案を1つずつ提供してください：
1. 質問文の明確化
2. 選択肢の調整（選択式の場合）
3. 説明の追加・改善
4. 難易度の調整

各提案は具体的で実行可能な内容にしてください。
`;

        const completion: any = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "あなたは教育専門家です。学習効果を向上させるための具体的で実用的な改善提案を提供してください。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        });

        const suggestionsText: string = completion.choices[0].message.content || "";

        // 提案を解析して構造化
        const suggestions: any = suggestionsText
          .split('\n')
          .filter((s: string) => s.trim())
          .map((suggestion: string, index: number) => ({
            id: index + 1,
            suggestion: suggestion.trim(),
            targetQaIds: problematicQAs.map((qa: any) => qa._id),
            statistics: stats.questionStats
              ?.filter((s: any) => problematicQAs.find((qa: any) => qa._id === s.qaId))
              ?.map((s: any) => ({
                qaId: s.qaId,
                accuracy: s.accuracy,
                totalResponses: s.totalResponses,
              })),
          }));

        // プレースホルダーを削除
        await ctx.runMutation(api.improvements.deleteSuggestion, {
          suggestionId: placeholderId,
        });

        // 改善提案をデータベースに保存
        for (const suggestion of suggestions) {
          await ctx.runMutation(api.improvements.createSuggestion, {
            lectureId: args.lectureId,
            content: suggestion.suggestion,
            targetQaIds: suggestion.targetQaIds,
            averageScore: problematicQAs.length > 0 
              ? stats.questionStats
                  ?.filter((s: any) => problematicQAs.find((qa: any) => qa._id === s.qaId))
                  ?.reduce((sum: number, s: any) => sum + s.accuracy, 0) / problematicQAs.length || 0
              : 0,
            generationHash: `${generationHash}-${suggestion.id}`,
            generatedBy: userId,
          });
        }

        return {
          success: true,
          suggestions,
          message: `${suggestions.length}件の改善提案を生成しました`,
        };
      } catch (error) {
        // エラー時はステータスを失敗に更新
        await ctx.runMutation(api.improvements.updateStatus, {
          suggestionId: placeholderId,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });

        throw error;
      }
    } catch (error) {
      console.error("改善提案生成エラー:", error);
      return {
        success: false,
        suggestions: [],
        message: `改善提案の生成中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
}); 