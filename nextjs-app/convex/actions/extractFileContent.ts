"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ファイルから内容を抽出
export const extractFileContent = action({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args): Promise<{
    content: string;
    suggestedTitle?: string;
    suggestedDescription?: string;
  }> => {
    try {
      // ファイル情報を取得
      const file = await ctx.runQuery(api.files.getFile, { fileId: args.fileId });
      if (!file) {
        throw new Error("ファイルが見つかりません");
      }

      // ストレージからファイルを取得
      const blob = await ctx.storage.get(file.storageId);
      if (!blob) {
        throw new Error("ファイルの内容を取得できません");
      }

      // ファイルタイプに応じて内容を抽出
      const buffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      
      let content = "";

      if (file.type === "text/plain" || file.type === "text/markdown") {
        // テキストファイルの場合
        const decoder = new TextDecoder();
        content = decoder.decode(uint8Array);
      } else if (file.type === "application/pdf") {
        // PDFファイルの場合 - 簡易的なテキスト抽出
        try {
          const decoder = new TextDecoder('utf-8', { fatal: false });
          const text = decoder.decode(uint8Array);
          
          // PDFの構造から可能な限りテキストを抽出
          // PDFオブジェクトの中のテキストストリームを探す
          const textPatterns = [
            /BT([\s\S]*?)ET/g,  // テキストブロック
            /\(((?:[^()\\]|\\[\\()])*)\)/g,  // カッコ内のテキスト
            /<([0-9a-fA-F]+)>/g  // 16進数エンコードされたテキスト
          ];
          
          let extractedTexts = [];
          
          // テキストブロックの抽出
          const btMatches = text.matchAll(/BT([\s\S]*?)ET/g);
          for (const match of btMatches) {
            const block = match[1];
            const textMatches = block.matchAll(/\(((?:[^()\\]|\\[\\()])*)\)/g);
            for (const textMatch of textMatches) {
              const extracted = textMatch[1]
                .replace(/\\([()\\])/g, '$1')  // エスケープ文字の処理
                .replace(/\\(\d{3})/g, (m, octal) => String.fromCharCode(parseInt(octal, 8))); // 8進数の処理
              if (extracted.trim().length > 0) {
                extractedTexts.push(extracted);
              }
            }
          }
          
          // 単純なカッコ内テキストの抽出（BTブロック外）
          const simpleTextMatches = text.matchAll(/\(((?:[^()\\]|\\[\\()])*)\)(?![^<>]*>)/g);
          for (const match of simpleTextMatches) {
            const extracted = match[1]
              .replace(/\\([()\\])/g, '$1')
              .replace(/\\(\d{3})/g, (m, octal) => String.fromCharCode(parseInt(octal, 8)));
            if (extracted.trim().length > 0 && /[a-zA-Z0-9ぁ-んァ-ヶー一-龠]/.test(extracted)) {
              extractedTexts.push(extracted);
            }
          }
          
          // 重複を削除し、意味のあるテキストだけを残す
          const uniqueTexts = [...new Set(extractedTexts)]
            .filter(text => text.length > 3 && /[a-zA-Z0-9ぁ-んァ-ヶー一-龠]/.test(text));
          
          content = uniqueTexts.join(' ');
          
          // 抽出されたテキストが少なすぎる場合
          if (!content || content.trim().length < 100) {
            console.warn(`PDFファイル「${file.name}」から抽出されたテキストが少ないです: ${content.length}文字`);
            
            // ファイル名から情報を推測
            const fileNameInfo = file.name
              .replace(/\.(pdf)$/i, "")
              .replace(/_/g, " ")
              .replace(/-/g, " ");
              
            content = `このPDFファイル「${file.name}」から十分なテキストを抽出できませんでした。\n\nファイル名から推測される内容: ${fileNameInfo}\n\n※ より正確なQ&A生成のために、以下をお試しください：\n1. テキスト形式（.txt）またはMarkdown形式（.md）でファイルを保存し直す\n2. PDFのテキストをコピーして、テキストファイルに貼り付ける\n3. 講義内容を手動で入力する`;
          }
          
          console.log(`PDFから抽出されたテキスト長: ${content.length}文字`);
        } catch (pdfError) {
          console.error("PDF解析エラー:", pdfError);
          throw new Error(`PDFファイル「${file.name}」の解析中にエラーが発生しました。テキスト形式での保存をお試しください。`);
        }
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        // Wordファイルの場合 - 現在は未対応
        console.log(`Wordファイル「${file.name}」の処理を試みています`);
        throw new Error(`Wordファイル「${file.name}」の処理は現在サポートされていません。テキスト形式（.txt）またはMarkdown形式（.md）のファイルをご使用ください。`);
      } else {
        throw new Error(`サポートされていないファイルタイプです: ${file.type}`);
      }

      if (!content || content.trim().length === 0) {
        throw new Error("ファイルから内容を抽出できませんでした");
      }

      // OpenAI APIでタイトルと概要を生成
      let suggestedTitle = "";
      let suggestedDescription = "";
      
      try {
        // 内容が長すぎる場合は最初の部分だけを使用（約2000文字）
        const contentForAnalysis = content.substring(0, 2000);
        
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
        const descriptionMatch = response.match(/概要:\s*(.+)/gs);
        
        if (titleMatch) {
          suggestedTitle = titleMatch[1].trim();
        } else {
          // フォールバック: ファイル名からタイトルを生成
          suggestedTitle = file.name
            .replace(/\.(pdf|txt|md|docx)$/i, "")
            .replace(/_/g, " ")
            .replace(/-/g, " ");
        }
        
        if (descriptionMatch) {
          suggestedDescription = descriptionMatch[1].trim();
        } else {
          // フォールバック: 内容の最初の部分を概要として使用
          const lines = content.split('\n').filter(line => line.trim().length > 0);
          suggestedDescription = lines.slice(0, 3).join(' ').substring(0, 200) + "...";
        }
      } catch (aiError) {
        console.error("AI生成エラー:", aiError);
        // AIエラーの場合はフォールバック
        suggestedTitle = file.name
          .replace(/\.(pdf|txt|md|docx)$/i, "")
          .replace(/_/g, " ")
          .replace(/-/g, " ");
        
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        suggestedDescription = lines.slice(0, 3).join(' ').substring(0, 200) + "...";
      }

      return {
        content,
        suggestedTitle,
        suggestedDescription
      };
    } catch (error) {
      console.error("ファイル内容抽出エラー:", error);
      throw error;
    }
  },
}); 