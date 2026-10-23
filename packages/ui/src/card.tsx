import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@pbcoms/shared";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("rounded-lg border border-slate-200 p-6", className)}
        {...props}
      />
    );
  },
);
