import Link from "next/link";

/** The disclaimer plus a link to the philosophers. */
export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`mx-auto max-w-[1400px] px-4 py-6 text-center text-[0.75rem] text-muted/75 sm:px-6 ${className}`}>
      <p>Symposium is a thinking aid, not financial, legal or medical advice. The philosophers are AI interpretations, not quotations.</p>
      <p className="mt-1">
        <Link href="/philosophers" className="hover:text-gold">
          The philosophers
        </Link>
      </p>
    </footer>
  );
}
