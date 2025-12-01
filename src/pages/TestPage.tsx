import React, { useEffect, useMemo, useRef, useState } from "react";
import { onTestLog, TestEvent } from "../app/testBus";

type Row = Required<TestEvent>;

export default function TestPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const un = onTestLog((e) => {
      setRows((prev) => {
        const next = [...prev, { ...e, ts: e.ts ?? Date.now() } as Row].slice(-1000); // keep last 1000
        return next;
      });
    });
    return () => { un.then(f => f()); };
  }, []);

  useEffect(() => {
    // auto-scroll to bottom
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rows.length]);

  const formatTs = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour12: false });

  const badge = (lvl: Row["level"]) => {
    const base = "px-2 py-0.5 rounded-md text-xs border";
    switch (lvl) {
      case "info": return `${base} border-zinc-600 text-zinc-300`;
      case "warn": return `${base} border-amber-600 text-amber-300`;
      case "error": return `${base} border-red-700 text-red-300`;
      case "success": return `${base} border-emerald-700 text-emerald-300`;
    }
  };

  return (
    <div className="w-screen h-screen bg-zinc-900 text-zinc-100 flex flex-col">
      <div className="h-10 flex items-center justify-between px-3 border-b border-zinc-800 bg-zinc-800/60">
        <div className="text-sm text-zinc-300">Test Output</div>
        <div className="text-[11px] text-zinc-400">Logs: {rows.length}</div>
      </div>
      <div ref={scrollerRef} className="flex-1 overflow-auto p-3 space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[72px_88px_1fr] items-center gap-2">
            <div className="text-[11px] text-zinc-500">{formatTs(r.ts)}</div>
            <div className={badge(r.level)}>{r.level}</div>
            <div className="text-sm whitespace-pre-wrap leading-5 text-zinc-200">{r.msg}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
