import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "normal" | "warning" | "critical" | "info";
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  const variants = {
    normal:
      "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    warning:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    critical: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  };

  return (
    <span
      className={cn(
        "inline-block px-3 py-1 rounded-full text-xs font-semibold",
        variants[status],
        className,
      )}
    >
      {children}
    </span>
  );
}
