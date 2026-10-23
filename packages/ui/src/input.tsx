import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@pbcoms/shared";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, type = "text", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "rounded-md border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900",
        className,
      )}
      {...props}
    />
  );
});
