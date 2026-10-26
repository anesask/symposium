/** Text being written by hand: the newest letters ink in, and a quill follows the words. */
export function Ink({ text, shown, writing }: { text: string; shown: number; writing: boolean }) {
  const n = Math.min(text.length, shown);
  const FRESH = 14;
  const cut = Math.max(0, n - FRESH);
  return (
    <>
      {text.slice(0, cut)}
      {/* Keyed by position, so each letter animates once as it appears. */}
      {Array.from(text.slice(cut, n)).map((ch, i) => (
        <span key={cut + i} className="ink-in">
          {ch}
        </span>
      ))}
      {writing && <Quill />}
    </>
  );
}

export function Quill() {
  return (
    <svg className="quill" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 3c-6 1-11 6-13 13l-1.5 4.5" />
      <path d="M20 3c0 5-3 10-9.5 12.5" fill="currentColor" fillOpacity=".25" />
      <path d="M7.5 15.5l3-3" />
    </svg>
  );
}
