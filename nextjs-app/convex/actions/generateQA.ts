"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import OpenAI from "openai";

// AIを使用してQ&Aを生成
export const generateQAWithAI = action({
  args: {
    lectureId: v.id("lectures"),
    content: v.string(),
    difficulty: v.object({
      easy: v.number(),
      medium: v.number(),
      hard: v.number(),
    }),
    questionCount: v.number(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    generatedCount: number;
    message: string;
  }> => {
    try {
      // OpenAI APIキーを環境変数から取得
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error("OpenAI API key is not configured");
        throw new Error("OpenAI API key is not configured");
      }

      console.log("OpenAI API Key存在確認: ✓");
      console.log("講義内容の文字数:", args.content.length);
      
      if (args.content.length < 50) {
        throw new Error("講義内容が短すぎます。最低50文字以上の内容が必要です。");
      }

      const openai = new OpenAI({ apiKey });

      // 各難易度の問題数を計算
      const totalCount = args.questionCount;
      const easyCount = Math.round(totalCount * args.difficulty.easy);
      const mediumCount = Math.round(totalCount * args.difficulty.medium);
      const hardCount = totalCount - easyCount - mediumCount;

      console.log(`Q&A生成開始: 合計${totalCount}問 (易${easyCount}問, 中${mediumCount}問, 難${hardCount}問)`);
      console.log(`講義内容プレビュー: ${args.content.substring(0, 200)}...`);

      // OpenAI APIを使用してQ&Aを生成
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `あなたは教育専門家です。与えられた講義資料の内容のみに基づいて、正確で適切なQ&Aを生成してください。

【重要な制約】
1. 質問と答えは必ず講義資料に記載されている内容のみから作成すること
2. 資料にない情報を推測や想像で補わないこと
3. 資料の具体的な数値、定義、事実を正確に反映すること
4. 曖昧な質問ではなく、資料の内容を確実に理解しているかを測る質問にすること

【生成する問題数】
- 合計: ${totalCount}問
- 易しい問題: ${easyCount}問（基本的な定義や用語）
- 中程度の問題: ${mediumCount}問（概念の理解や関連性）
- 難しい問題: ${hardCount}問（応用や詳細な理解）

【各問題の構成】
- question: 資料の内容に基づく具体的な質問
- questionType: "multiple_choice"（選択式）、"short_answer"（短答式）、"descriptive"（記述式）
- options: 選択式の場合は4つの選択肢（1つの正解と3つの不正解）
- answer: 資料に記載されている正確な答え
- difficulty: "easy"、"medium"、"hard"
- explanation: 資料のどの部分から答えが導かれるかの説明

【質問作成のガイドライン】
- 易問: 「〜とは何ですか？」「〜の単位は？」など基本定義
- 中問: 「〜の主要な要素は？」「〜の特徴として正しいのは？」など理解度確認
- 難問: 「〜について説明し、その重要性を述べよ」など総合的理解

【選択肢作成のガイドライン】
- 正解: 資料に明記されている正確な情報
- 不正解: もっともらしいが資料に記載されていない選択肢、または明らかに間違った選択肢

以下のJSON形式で正確に出力してください:
{
  "questions": [
    {
      "question": "資料の内容に基づく質問",
      "questionType": "multiple_choice",
      "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "answer": "正解の選択肢",
      "difficulty": "easy",
      "explanation": "資料の該当箇所の説明"
    }
  ]
}`
          },
          {
            role: "user",
            content: `以下の講義資料の内容のみに基づいて、正確なQ&Aを${totalCount}問生成してください。資料にない情報は一切使用しないでください：

【講義資料】
${args.content}

【注意事項】
- 上記の資料に記載されている内容のみを使用してください
- 一般常識や外部知識は使用しないでください
- 数値や定義は資料に記載されているものを正確に使用してください`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // より確実で一貫した出力のため温度を下げる
        max_tokens: 4000,
      });

      const result = completion.choices[0].message.content;
      if (!result) {
        console.error("OpenAI APIからレスポンスが返されませんでした");
        throw new Error("Failed to generate Q&A");
      }

      console.log("OpenAI APIレスポンス取得成功");
      console.log("レスポンス文字数:", result.length);
      console.log("レスポンスプレビュー:", result.substring(0, 300));

      let generatedData;
      try {
        generatedData = JSON.parse(result);
      } catch (parseError) {
        console.error("JSON解析エラー:", parseError);
        console.error("不正なJSONレスポンス:", result);
        throw new Error("Q&Aの生成結果をJSONとして解析できませんでした");
      }

      const qaTemplates = generatedData.questions || [];
      console.log("生成されたQ&A数:", qaTemplates.length);

      if (qaTemplates.length === 0) {
        console.error("Q&Aが生成されませんでした。generatedData:", generatedData);
        throw new Error("Q&Aの生成に失敗しました。コンテンツが不十分な可能性があります。");
      }

      // 生成されたQ&Aをデータベースに保存
      const timestamp = Date.now();
      let savedCount = 0;

      for (const qa of qaTemplates) {
        try {
          await ctx.runMutation(api.qa.createQAFromAction, {
            lectureId: args.lectureId,
            question: qa.question,
            questionType: qa.questionType || "multiple_choice",
            options: qa.options || undefined,
            answer: qa.answer,
            difficulty: qa.difficulty || "medium",
            explanation: qa.explanation || undefined,
          });
          savedCount++;
        } catch (saveError) {
          console.error("Q&A保存エラー:", saveError);
          // 個別の保存エラーは記録するが、処理は続行
        }
      }

      console.log(`Q&A生成完了: ${savedCount}/${qaTemplates.length}問を保存`);
      
      return {
        success: true,
        generatedCount: savedCount,
        message: `${savedCount}問のQ&Aを生成しました（要求: ${totalCount}問）`,
      };
    } catch (error) {
      console.error("Q&A生成エラー:", error);
      return {
        success: false,
        generatedCount: 0,
        message: error instanceof Error ? error.message : "Q&A生成中にエラーが発生しました",
      };
    }
  },
}); 