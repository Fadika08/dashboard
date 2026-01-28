import * as React from "react";
import { cn } from "./cn";
export function Button({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("px-3 h-9 rounded-2xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 disabled:opacity-60", className)} {...props} />;
}
