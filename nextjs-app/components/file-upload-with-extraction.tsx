"use client";

import { useState, useCallback } from "react";
import { Upload, X, FileText, FileImage, FileVideo, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractTextFromFile, extractTextFromPDF } from "@/lib/pdf-extractor";
import { Progress } from "@/components/ui/progress";

interface FileUploadWithExtractionProps {
  onExtractComplete: (content: string, metadata?: { title?: string; description?: string }) => void;
  accept?: string;
  maxSize?: number; // in bytes
}

interface ProcessingFile {
  name: string;
  size: number;
  type: string;
  status: 'processing' | 'completed' | 'error';
  progress: number;
  extractedText?: string;
  error?: string;
}

export function FileUploadWithExtraction({
  onExtractComplete,
  accept = ".pdf,.md,.txt",
  maxSize = 10 * 1024 * 1024, // 10MB
}: FileUploadWithExtractionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = useCallback(async (files: File[]) => {
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`${file.name} is too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    for (const file of validFiles) {
      const fileInfo: ProcessingFile = {
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'processing',
        progress: 0,
      };

      setProcessingFiles(prev => [...prev, fileInfo]);

      try {
        // プログレスを更新（開始）
        updateFileProgress(file.name, 20);

        let extractedText = '';
        const metadata: { title?: string; description?: string } = {};

        if (file.type === 'application/pdf') {
          // PDFの場合、詳細な解析を行う
          const result = await extractTextFromPDF(file);
          extractedText = result.text;
          
          // メタデータからタイトルを取得
          if (result.metadata?.title) {
            metadata.title = result.metadata.title;
          }
          
          updateFileProgress(file.name, 80);
        } else {
          // その他のファイルタイプ
          extractedText = await extractTextFromFile(file);
          updateFileProgress(file.name, 80);
        }

        // タイトルが取得できない場合はファイル名から生成
        if (!metadata.title) {
          metadata.title = file.name
            .replace(/\.(pdf|txt|md)$/i, "")
            .replace(/[_-]/g, " ")
            .trim();
        }

        // 抽出成功
        updateFileStatus(file.name, 'completed', extractedText);
        updateFileProgress(file.name, 100);

        // 親コンポーネントに通知
        onExtractComplete(extractedText, metadata);
      } catch (error) {
        console.error("ファイル処理エラー:", error);
        updateFileStatus(file.name, 'error', undefined, error instanceof Error ? error.message : '不明なエラー');
      }
    }
  }, [maxSize, onExtractComplete]);

  const updateFileProgress = (fileName: string, progress: number) => {
    setProcessingFiles(prev => 
      prev.map(file => 
        file.name === fileName ? { ...file, progress } : file
      )
    );
  };

  const updateFileStatus = (fileName: string, status: ProcessingFile['status'], extractedText?: string, error?: string) => {
    setProcessingFiles(prev => 
      prev.map(file => 
        file.name === fileName ? { ...file, status, extractedText, error } : file
      )
    );
  };

  const removeFile = (fileName: string) => {
    setProcessingFiles(prev => prev.filter(file => file.name !== fileName));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <FileImage className="h-4 w-4" />;
    if (type.startsWith("video/") || type.startsWith("audio/")) return <FileVideo className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-sm text-gray-600 mb-2">
          ファイルをドラッグ&ドロップ、または
        </p>
        <label htmlFor="file-upload" className="cursor-pointer">
          <span className="text-blue-600 hover:text-blue-700 font-medium">
            ファイルを選択
          </span>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept={accept}
            multiple
          />
        </label>
        <p className="text-xs text-gray-500 mt-2">
          対応形式: PDF, Markdown, テキスト（最大{maxSize / 1024 / 1024}MB）
        </p>
      </div>

      {processingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">ファイル処理状況</h4>
          {processingFiles.map((file) => (
            <div key={file.name} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {getFileIcon(file.type)}
                <span className="text-sm flex-1">{file.name}</span>
                <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                {file.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {file.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                <button
                  onClick={() => removeFile(file.name)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {file.status === 'processing' && (
                <div className="space-y-1">
                  <Progress value={file.progress} className="h-2" />
                  <p className="text-xs text-gray-500">テキストを抽出中...</p>
                </div>
              )}

              {file.status === 'completed' && file.extractedText && (
                <div className="mt-2">
                  <p className="text-xs text-green-600">
                    ✓ テキスト抽出完了 ({file.extractedText.length.toLocaleString()}文字)
                  </p>
                  <div className="mt-1 p-2 bg-white rounded text-xs text-gray-600 max-h-20 overflow-y-auto">
                    {file.extractedText.substring(0, 200)}...
                  </div>
                </div>
              )}

              {file.status === 'error' && (
                <p className="text-xs text-red-600 mt-2">
                  エラー: {file.error || 'テキスト抽出に失敗しました'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 