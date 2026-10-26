"use client";

import Link from "next/link";
import { PORTRAIT_FORMAT } from "@/config/art";
import { ROSTER } from "@/config/roster";
import { LESSONS } from "@/config/school";
import { SiteFooter } from "@/components/ui/SiteFooter";

const STEPS = [
  { n: "I", title: "Seat your table", text: "Pick three to five of nine Greek thinkers. Socrates can drop in as a guest with one question." },
  { n: "II", title: "Ask a modern question", text: "Quit your job? Delete Instagram? Move in together? They've never seen a phone, and they have opinions." },
  { n: "III", title: "Let them argue", text: "They answer in character and push back on each other. Tag one with @, take one aside 1:1, or let them keep arguing." },
  { n: "IV", title: "Call the vote", text: "They score your question with a real decision method, debate, poll out loud, and you leave with a verdict and the conditions to meet." },
];

const METHODS = [
  { name: "Should I?", tech: "Go / No-Go gate", when: "Should I do this?", out: "GO, NO-GO or GO, IF, with the exact conditions." },
  { name: "Which one?", tech: "Decision matrix", when: "A, B or C?", out: "The options ranked by weighted score, and what would flip the ranking." },
  { name: "What could go wrong?", tech: "Pre-mortem", when: "I've decided. What could go wrong?", out: "The top five ways it fails, each with a fix, and proceed, revise or stop." },
];

/** The first page: what Symposium is, how it works, and who's at the table. */
export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <>
      <section className="scenery border-b border-gold/15">
        <div className="mx-auto flex min-h-[calc(100dvh-65px)] max-w-4xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/scenes/logo.webp" alt="" className="h-24 w-24 object-contain opacity-90 saturate-[.7] sm:h-28 sm:w-28" />
          <div className="eyebrow mt-4">A dinner party for hard decisions</div>
          <h1 className="mt-3 font-serif text-5xl font-semibold leading-[1.05] sm:text-7xl">Argue it out with the greats.</h1>
          <p className="mt-6 max-w-2xl text-[1.2rem] leading-relaxed text-ink/85">
            Big decisions get made alone at 2am. Symposium seats you at a table of ancient Greek philosophers who disagree with each other about your very modern question, then makes them vote with a real decision method.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button onClick={onStart} className="btn-primary h-12 rounded-md px-8 text-[1.05rem]">
              Take a seat
            </button>
            <a href="/?demo=1" className="flex h-12 items-center rounded-md border border-line px-6 text-ink/85 transition hover:border-gold/50 hover:text-ink">
              Watch a sample debate
            </a>
          </div>
          <a href="#how" className="mt-14 text-[0.75rem] uppercase tracking-[0.2em] text-muted hover:text-gold">
            How it works ↓
          </a>
        </div>
      </section>

      <main>
        <section id="how" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-center font-serif text-4xl font-semibold">How it works</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n}>
                <div className="font-caps text-2xl text-gold">{s.n}</div>
                <h3 className="mt-1 font-serif text-2xl font-semibold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-ink/80">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-line bg-surface/40">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <h2 className="text-center font-serif text-4xl font-semibold">Three ways to decide</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-ink/75">
              The verdict is computed by code from the table&apos;s scores, not made up by the model, and every verdict shows how it was decided.
            </p>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {METHODS.map((m) => (
                <div key={m.name} className="border-l-2 border-gold/40 pl-5">
                  <h3 className="font-serif text-2xl font-semibold">{m.name}</h3>
                  <div className="text-[0.72rem] uppercase tracking-[0.16em] text-muted">{m.tech}</div>
                  <p className="mt-1 font-serif text-lg italic text-gold/90">&ldquo;{m.when}&rdquo;</p>
                  <p className="mt-2 leading-relaxed text-ink/80">{m.out}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <div className="eyebrow">Who&apos;s who</div>
            <h2 className="mt-1 font-serif text-4xl font-semibold">Meet the table</h2>
            <p className="mx-auto mt-3 max-w-2xl text-ink/75">Never read any philosophy? You don't need to. Here is each of them in one line, and a short, plain guide if you want more.</p>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {LESSONS.map((l) => (
              <li key={l.id}>
                <Link href={`/philosophers#${l.id}`} className="group block text-center">
                  <span className="feather mx-auto block aspect-square w-28">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/portraits/${l.id}.${PORTRAIT_FORMAT}`} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  </span>
                  <span className="mt-1 block font-serif text-xl font-semibold group-hover:text-gold">{ROSTER[l.id].name}</span>
                  <span className="block text-[0.75rem] uppercase tracking-[0.14em] text-muted">{ROSTER[l.id].archetype}</span>
                  <span className="mt-1.5 block text-[0.95rem] leading-snug text-ink/75">{l.oneLine}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Link href="/philosophers" className="flex h-12 items-center rounded-md border border-line px-6 text-ink/85 transition hover:border-gold/50 hover:text-ink">
              Meet the philosophers
            </Link>
            <button onClick={onStart} className="btn-primary h-12 rounded-md px-8">
              Take a seat
            </button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
