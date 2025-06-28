import { toast as sonnerToast } from "sonner";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function useToast() {
  const toast = ({ title, description, variant }: ToastProps) => {
    if (variant === "destructive") {
      sonnerToast.error(title || "エラー", {
        description,
      });
    } else {
      sonnerToast.success(title || "成功", {
        description,
      });
    }
  };

  return { toast };
} 