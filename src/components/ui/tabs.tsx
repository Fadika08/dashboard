import * as React from "react";
export function Tabs({ value, onValueChange, children }:{ value:string; onValueChange:(v:string)=>void; children:React.ReactNode }) {
  return <div>{React.Children.map(children as any, (c:any)=>React.cloneElement(c,{value, onValueChange}))}</div>;
}
export function TabsList({ children }:{ children:React.ReactNode }) {
  return <div className="inline-flex p-1 rounded-xl bg-zinc-800">{children}</div>;
}
export function TabsTrigger({ tab, value, onValueChange, children }:{ tab:string; value:string; onValueChange:(v:string)=>void; children:React.ReactNode }) {
  const active = value===tab;
  return <button onClick={()=>onValueChange(tab)} className={`px-3 h-8 rounded-lg text-sm ${active?"bg-zinc-950":"text-zinc-300"}`}>{children}</button>;
}
export function TabsContent({ tab, value, children }:{ tab:string; value:string; children:React.ReactNode }) {
  return value===tab ? <div className="pt-3">{children}</div> : null;
}
