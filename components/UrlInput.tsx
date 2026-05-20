"use client";

import { useState } from "react";

const YT_REGEX =
  /(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

interface Props {
  onSubmit: (url: string) => void;
  loading?: boolean;
  loadingLabel?: string;
}

export default function UrlInput({
  onSubmit,
  loading = false,
  loadingLabel = "Loading…",
}: Props) {
  const [url, setUrl] = useState("");
  const [clientError, setClientError] = useState("");

  const isValid = YT_REGEX.test(url.trim());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setClientError("");
    if (!isValid) {
      setClientError("Please enter a valid YouTube URL");
      return;
    }
    onSubmit(url.trim());
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
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-6 py-3 rounded-lg bg-amber-400 text-black font-display text-sm tracking-widest uppercase hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? loadingLabel : "Audit"}
        </button>
      </div>
      {clientError && (
        <p className="text-red-400 font-mono text-xs">{clientError}</p>
      )}
    </form>
  );
}
