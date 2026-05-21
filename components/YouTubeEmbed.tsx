"use client";

interface Props {
  videoId: string;
  startSeconds: number;
  endSeconds: number;
  onClose: () => void;
}

export default function YouTubeEmbed({ videoId, startSeconds, endSeconds, onClose }: Props) {
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?start=${startSeconds}&end=${endSeconds}&autoplay=1`;

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-zinc-700 mt-2" style={{ aspectRatio: "16/9" }}>
      <button
        onClick={onClose}
        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/80 text-zinc-200 font-mono text-xs flex items-center justify-center hover:bg-black transition-colors"
        aria-label="Close embed"
      >
        ✕
      </button>
      <iframe
        src={src}
        className="w-full h-full"
        allow="autoplay; encrypted-media"
        allowFullScreen
        title="YouTube clip"
      />
    </div>
  );
}
