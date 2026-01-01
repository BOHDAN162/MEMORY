import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "ghost" | "soft";
type ButtonSize = "md" | "sm" | "icon";

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
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60";

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/20 hover:bg-primary/90 active:translate-y-[1px]",
    ghost:
      "bg-transparent text-foreground hover:bg-accent/15 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
    soft:
      "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-secondary-foreground shadow-inner shadow-black/5",
  };

  const sizeStyles: Record<ButtonSize, string> = {
  md: "h-11 px-4 text-sm",
  sm: "h-9 px-3 text-xs",
  icon: "h-8 w-8 p-0",
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
