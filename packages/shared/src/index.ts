export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}

export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

export * from "./organisation-roles";
