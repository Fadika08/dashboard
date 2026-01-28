import { cn } from "./cn";
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("w-full h-9 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm", className)} {...props} />;
}
