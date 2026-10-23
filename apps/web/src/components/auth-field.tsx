import { Input } from "@pbcoms/ui";
import type { InputHTMLAttributes } from "react";

export function AuthField({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = props.id ?? props.name;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <Input
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? id + "-error" : undefined}
        className="w-full"
      />
      {error && (
        <p id={id + "-error"} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
