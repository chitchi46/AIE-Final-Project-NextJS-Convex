"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmationDialogVariant = "destructive" | "warning" | "info";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  variant?: ConfirmationDialogVariant;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  showIcon?: boolean;
}

const variantConfig = {
  destructive: {
    icon: AlertTriangle,
    iconColor: "text-red-600",
    confirmButtonVariant: "destructive" as const,
  },
  warning: {
    icon: AlertCircle,
    iconColor: "text-orange-600",
    confirmButtonVariant: "default" as const,
  },
  info: {
    icon: Info,
    iconColor: "text-blue-600",
    confirmButtonVariant: "default" as const,
  },
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = "destructive",
  confirmText = "実行",
  cancelText = "キャンセル",
  onConfirm,
  isLoading = false,
  showIcon = true,
}: ConfirmationDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {showIcon && (
              <Icon className={cn("h-5 w-5", config.iconColor)} />
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              variant === "destructive" && "bg-red-600 hover:bg-red-700"
            )}
          >
            {isLoading ? "処理中..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 