"use client";

import { MODES } from "@/lib/modes";
import type { ExtractionMode } from "@/lib/schema";

interface Props {
  selected: Set<ExtractionMode>;
  onChange: (updated: Set<ExtractionMode>) => void;
  runningMode: ExtractionMode | null;
}

export default function ModeSelector({ selected, onChange, runningMode }: Props) {
  function toggle(id: ExtractionMode) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  }

  const disabled = runningMode !== null;

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
        Extraction modes
      </span>
      <div className="flex flex-col gap-2">
        {MODES.map((mode) => {
          const on = selected.has(mode.id);
          const running = runningMode === mode.id;
          return (
            <label
              key={mode.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                on
                  ? "border-amber-400/40 bg-[#0D0D1A]"
                  : "border-zinc-800 bg-[#0D0D1A]/50"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-amber-400/30"}`}
            >
              <input
                type="checkbox"
                checked={on}
                disabled={disabled}
                onChange={() => toggle(mode.id)}
                className="mt-0.5 accent-amber-400 shrink-0"
              />
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-zinc-200">{mode.label}</span>
                  {running && (
                    <span className="font-mono text-xs text-amber-400 animate-pulse">
                      running…
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs text-zinc-500 leading-snug">
                  {mode.description}
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
