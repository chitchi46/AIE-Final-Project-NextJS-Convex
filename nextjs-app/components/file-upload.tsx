"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Upload, X, FileText, FileImage, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";

interface FileUploadProps {
  lectureId?: Id<"lectures">;
  onUploadComplete?: (fileId: Id<"files">) => void;
  accept?: string;
  maxSize?: number; // in bytes
}

export function FileUpload({
  lectureId,
  onUploadComplete,
  accept = ".pdf,.md,.txt,.mp3,.mp4",
  maxSize = 10 * 1024 * 1024, // 10MB
}: FileUploadProps) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    name: string;
    size: number;
    type: string;
  }>>([]);

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
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`${file.name} is too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);

    try {
      for (const file of validFiles) {
        // アップロードURLを生成
        const uploadUrl = await generateUploadUrl();

        // ファイルをアップロード
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const { storageId } = await result.json();

        // ファイル情報を保存
        const fileId = await saveFile({
          storageId,
          name: file.name,
          type: file.type,
          size: file.size,
          lectureId,
        });

        setUploadedFiles(prev => [...prev, {
          name: file.name,
          size: file.size,
          type: file.type,
        }]);

        if (onUploadComplete) {
          onUploadComplete(fileId);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("ファイルのアップロードに失敗しました");
    } finally {
      setUploading(false);
    }
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
        } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
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
            disabled={uploading}
          />
        </label>
        <p className="text-xs text-gray-500 mt-2">
          対応形式: PDF, Markdown, テキスト, 音声, 動画（最大{maxSize / 1024 / 1024}MB）
        </p>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">アップロード済みファイル</h4>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              {getFileIcon(file.type)}
              <span className="text-sm flex-1">{file.name}</span>
              <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">アップロード中...</p>
        </div>
      )}
    </div>
  );
} 