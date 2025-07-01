"use client";

import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy, TextContent } from 'pdfjs-dist/types/src/display/api';

// PDFワーカーの設定 - publicディレクトリから読み込む
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf/pdf.worker.min.mjs';
}

export interface ExtractedContent {
  text: string;
  pageCount: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
  };
}

/**
 * PDFファイルからテキストを抽出する（クライアントサイド専用）
 * @param file PDFファイル
 * @returns 抽出されたテキストとメタデータ
 */
export async function extractTextFromPDF(file: File): Promise<ExtractedContent> {
  if (typeof window === 'undefined') {
    throw new Error('この関数はクライアントサイドでのみ動作します');
  }

  try {
    // FileをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    
    // PDFドキュメントを読み込み
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      // CMapやフォントの設定
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    });
    
    const pdf: PDFDocumentProxy = await loadingTask.promise;
    
    let fullText = '';
    const pageTexts: string[] = [];
    
    // 各ページからテキストを抽出
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page: PDFPageProxy = await pdf.getPage(pageNum);
      const textContent: TextContent = await page.getTextContent();
      
      // テキストアイテムを結合
      let pageText = '';
      let lastY: number | null = null;
      
      textContent.items.forEach((item: any) => {
        // 改行の判定
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        }
        
        pageText += item.str;
        
        // スペースの追加（必要に応じて）
        if (item.hasEOL) {
          pageText += '\n';
        } else if (item.str && item.str.length > 0) {
          pageText += ' ';
        }
        
        lastY = item.transform[5];
      });
      
      pageText = pageText.trim();
      if (pageText) {
        pageTexts.push(pageText);
        fullText += pageText + '\n\n';
      }
    }
    
    // メタデータを取得
    const metadata: ExtractedContent['metadata'] = {};
    try {
      const pdfMetadata = await pdf.getMetadata();
      if (pdfMetadata.info) {
        const info = pdfMetadata.info as any;
        if (info.Title) metadata.title = info.Title;
        if (info.Author) metadata.author = info.Author;
        if (info.Subject) metadata.subject = info.Subject;
        if (info.Keywords) metadata.keywords = info.Keywords;
      }
    } catch (metadataError) {
      console.warn('PDFメタデータの取得に失敗しました:', metadataError);
    }
    
    // 後処理: 余分な空白を整理し、構造を認識
    fullText = fullText
      .replace(/\n{3,}/g, '\n\n') // 3つ以上の改行を2つに
      .replace(/[ \t]+/g, ' ') // 複数のスペースを1つに
      .replace(/\s+\n/g, '\n') // 行末の空白を削除
      .replace(/\n\s+/g, '\n') // 行頭の空白を削除
      .trim();

    // セクション構造の改善
    fullText = improveTextStructure(fullText);
    
    // テキストが抽出できなかった場合
    if (!fullText || fullText.length < 10) {
      throw new Error('PDFからテキストを抽出できませんでした。このPDFは画像ベースか、保護されている可能性があります。');
    }

    console.log(`PDF解析完了: ${pdf.numPages}ページ, ${fullText.length}文字`);
    
    return {
      text: fullText,
      pageCount: pdf.numPages,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  } catch (error) {
    console.error('PDF解析エラー:', error);
    throw new Error(`PDFファイルの解析に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
}

/**
 * テキストの構造を改善する
 * @param text 生のテキスト
 * @returns 構造化されたテキスト
 */
function improveTextStructure(text: string): string {
  // 見出しパターンの認識と整形
  let structuredText = text
    // 数字付き見出し（1. 2. 3.など）
    .replace(/^(\d+\.?\s+)([^\n]+)/gm, '\n## $2\n')
    // 大文字のみの行（見出しの可能性）
    .replace(/^([A-Z][A-Z\s]{5,})\s*$/gm, '\n## $1\n')
    // 章・節の番号付き見出し
    .replace(/^(第\d+章|第\d+節|Chapter\s+\d+|Section\s+\d+)[:\s]*([^\n]*)/gm, '\n## $1: $2\n')
    // 箇条書きの整理
    .replace(/^[・•◆▲]\s*/gm, '- ')
    .replace(/^[\(\d+\)]\s*/gm, '- ')
    // 定義や重要な概念の強調
    .replace(/([^\n]*)(とは|とは何か|の定義|Definition)([^\n]*)/g, '\n**重要な定義**: $1$2$3\n')
    // 数値やデータの整理
    .replace(/(\d+[.,]\d+|\d+%|\d+円|\d+年|\d+月|\d+日)/g, '**$1**');

  // 余分な改行を整理
  structuredText = structuredText
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');

  return structuredText;
}

/**
 * その他のファイルタイプからテキストを抽出する
 * @param file ファイル
 * @returns 抽出されたテキスト
 */
export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    const result = await extractTextFromPDF(file);
    return result.text;
  }
  
  if (file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.md')) {
    return await file.text();
  }
  
  // その他のファイルタイプはサポートしていない
  throw new Error(`サポートされていないファイルタイプです: ${file.type}`);
} 