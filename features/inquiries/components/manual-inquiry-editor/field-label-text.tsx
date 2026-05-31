"use client";

export function FieldLabelText({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{label}</span>
      {!required ? (
        <span className="text-xs font-medium text-muted-foreground">Optional</span>
      ) : null}
    </span>
  );
}
