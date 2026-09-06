import { forwardRef, type ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={clsx("button", `button-${variant}`, className)} {...props} />
  )
);

Button.displayName = "Button";
