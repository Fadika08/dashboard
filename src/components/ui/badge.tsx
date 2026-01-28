import { cn } from "./cn";
export function Badge({ variant="default", className, ...props }:{ variant?: "default"|"destructive"|"secondary"; className?:string } & React.HTMLAttributes<HTMLSpanElement>) {
  const cls = variant==="destructive" ? "bg-red-600" : variant==="secondary" ? "bg-zinc-700" : "bg-emerald-600";
  return <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", cls, className)} {...props} />;
}
