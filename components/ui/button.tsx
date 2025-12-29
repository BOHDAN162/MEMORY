import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "ghost" | "soft";
type ButtonSize = "md" | "sm";

export const buttonVariants = ({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      "bg-indigo-500 text-white hover:bg-indigo-400 focus-visible:outline-indigo-300 dark:bg-indigo-500 dark:hover:bg-indigo-400",
    ghost:
      "bg-transparent text-slate-800 hover:bg-slate-200 focus-visible:outline-indigo-300 dark:text-slate-100 dark:hover:bg-white/10",
    soft:
      "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:outline-indigo-300 dark:bg-white/5 dark:text-white dark:hover:bg-white/15",
  };

  const sizeStyles: Record<ButtonSize, string> = {
    md: "h-11 px-4 text-sm",
    sm: "h-9 px-3 text-xs",
  };

  return cn(baseStyles, variantStyles[variant], sizeStyles[size], className);
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonVariants({ variant, size, className })}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
