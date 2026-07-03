"use client";

import { useState } from "react";
import type { Claim, Verification } from "@/lib/schema";
import { costFromUsage } from "@/lib/pricing";

interface Props {
  claim: Claim;
  onVerified: (v: Verification) => void;
  existingVerification?: Verification;
  onCostAdded?: (cost: number) => void;
}

export default function VerifyButton({ claim, onVerified, existingVerification, onCostAdded }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim }),
      });
      const json = await res.json();
      if (!json.ok || !json.data) throw new Error(json.error ?? "Verification failed");
      if (json.usage && onCostAdded) {
        onCostAdded(costFromUsage(json.usage));
      }
      onVerified(json.data as Verification);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  if (existingVerification && !loading) {
    return (
      <button
        onClick={handleVerify}
        className="font-mono text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
      >
        ✓ Investigated — re-check
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleVerify}
        disabled={loading}
        className="flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <span className="inline-block w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            Investigating…
          </>
        ) : (
          <>
            <span className="text-zinc-500">🌐</span>
            Investigate further
          </>
        )}
      </button>
      {error && (
        <span className="font-mono text-xs text-red-400 text-right max-w-[200px] leading-snug">
          {error}
        </span>
      )}
    </div>
  );
}
