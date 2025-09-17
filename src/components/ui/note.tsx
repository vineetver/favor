import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils/general";

interface NoteProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "warning" | "success" | "destructive";
}

export function Note({ children, className, variant = "default" }: NoteProps) {
  const variants = {
    default:
      "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
    warning:
      "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
    success:
      "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200",
    destructive:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
  };

  const iconVariants = {
    default: "text-blue-600 dark:text-blue-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    success: "text-green-600 dark:text-green-400",
    destructive: "text-red-600 dark:text-red-400",
  };

  return (
    <div
      className={cn(
        "my-3 flex gap-3 rounded-lg border p-4 leading-6",
        variants[variant],
        className,
      )}
    >
      <InfoIcon
        className={cn("mt-0.5 h-5 w-5 flex-shrink-0", iconVariants[variant])}
      />
      <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}
