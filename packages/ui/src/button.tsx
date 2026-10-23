import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@pbcoms/shared";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(function Button({ className, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "rounded-md bg-slate-900 px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
