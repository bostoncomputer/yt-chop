interface TldrData {
  takeaways: string[];
  one_line: string;
}

export default function TldrCard({ data }: { data: TldrData }) {
  return (
    <div
      className="w-full rounded-xl border flex flex-col gap-3 p-5"
      style={{ backgroundColor: "#0D0D1A", borderColor: "#1A1A2E" }}
    >
      <span className="font-mono text-xs text-amber-400 uppercase tracking-widest">TL;DR</span>
      <p className="font-mono text-sm text-zinc-200 leading-relaxed">{data.one_line}</p>
      <ul className="flex flex-col gap-1.5">
        {data.takeaways.map((t, i) => (
          <li key={i} className="flex gap-2 font-mono text-xs text-zinc-400">
            <span className="text-amber-400/60 shrink-0">—</span>
            <span className="leading-snug">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
