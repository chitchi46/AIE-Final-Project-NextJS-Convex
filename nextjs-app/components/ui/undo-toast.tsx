"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";

interface UndoToastOptions {
  title: string;
  description?: string;
  duration?: number; // ミリ秒
  onUndo: () => void | Promise<void>;
  onComplete?: () => void | Promise<void>;
}

export function showUndoToast({
  title,
  description,
  duration = 5000,
  onUndo,
  onComplete,
}: UndoToastOptions) {
  let timeoutId: NodeJS.Timeout;
  let isUndone = false;

  const toastId = sonnerToast(title, {
    description,
    duration,
    action: {
      label: "取り消す",
      onClick: async () => {
        isUndone = true;
        clearTimeout(timeoutId);
        sonnerToast.dismiss(toastId);
        await onUndo();
        sonnerToast.success("取り消しました", {
          description: "操作を取り消しました",
        });
      },
    },
  });

  // 時間経過後に実際の処理を実行
  timeoutId = setTimeout(async () => {
    if (!isUndone && onComplete) {
      await onComplete();
    }
  }, duration);

  return {
    dismiss: () => {
      clearTimeout(timeoutId);
      sonnerToast.dismiss(toastId);
    },
  };
}

// 使いやすいヘルパー関数
export function useUndoableAction() {
  const [pendingAction, setPendingAction] = useState<{
    execute: () => Promise<void>;
    undo: () => Promise<void>;
  } | null>(null);

  const executeWithUndo = async (
    action: () => Promise<void>,
    undoAction: () => Promise<void>,
    options: Omit<UndoToastOptions, "onUndo" | "onComplete">
  ) => {
    // 楽観的更新を実行
    await action();

    // UNDOトーストを表示
    showUndoToast({
      ...options,
      onUndo: async () => {
        await undoAction();
        setPendingAction(null);
      },
      onComplete: async () => {
        // 時間経過後の処理（必要に応じて）
        setPendingAction(null);
      },
    });

    setPendingAction({ execute: action, undo: undoAction });
  };

  return { executeWithUndo, pendingAction };
} 