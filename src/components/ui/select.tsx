import * as React from "react";
import { cn } from "./cn";

// Simple <select> facade compatible with our dashboard usage.
export function Select({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={cn(
        "h-9 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm",
        className
      )}
    >
      {children}
    </select>
  );
}

// Placeholders to keep import signatures compatible
export function SelectTrigger({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <div className={cn(className)}>{children}</div>;
}
export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span className="sr-only">{placeholder}</span>;
}
export function SelectContent({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <div className={cn("hidden", className)}>{children}</div>;
}
export function SelectItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return <option value={value}>{children}</option>;
}
