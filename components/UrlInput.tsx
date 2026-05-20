"use client";

import { useState } from "react";
import type { TranscriptResult } from "@/lib/transcript";

const YT_REGEX =
  /(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

interface TranscriptResponse {
  ok: boolean;
  data?: {
    videoId: string;
    metadata: TranscriptResult["metadata"];
    transcript: TranscriptResult["transcript"];
  };
  error?: string;
}

interface Props {
  onResult: (data: TranscriptResponse["data"] | null, error?: string) => void;
}

export default function UrlInput({ onResult }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [clientError, setClientError] = useState("");

  const isValid = YT_REGEX.test(url.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setClientError("");

    if (!isValid) {
      setClientError("Please enter a valid YouTube URL");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json: TranscriptResponse = await res.json();
      if (json.ok && json.data) {
        onResult(json.data);
      } else {
        onResult(null, json.error ?? "Unknown error");
      }
    } catch {
      onResult(null, "Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setClientError("");
          }}
          placeholder="Paste any YouTube URL…"
          className="flex-1 px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-6 py-3 rounded-lg bg-amber-400 text-black font-display text-sm tracking-widest uppercase hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Loading…" : "Fetch"}
        </button>
      </div>
      {clientError && (
        <p className="text-red-400 font-mono text-xs">{clientError}</p>
      )}
    </form>
  );
}
