import type { Metadata } from "next";
import Link from "next/link";
import { PORTRAIT_FORMAT } from "@/config/art";
import { ROSTER } from "@/config/roster";
import { GLOSSARY, LESSONS } from "@/config/school";
import { TopBar } from "@/components/ui/TopBar";
import { SiteFooter } from "@/components/ui/SiteFooter";

export const metadata: Metadata = {
  title: "The Philosophers · Symposium",
  description: "Who's who at the Symposium table: ten Greek philosophers in plain words.",
};

export default function PhilosophersPage() {
  return (
    <>
      <TopBar showNew={false} />
      <header className="scenery border-b border-gold/15">
        <div className="mx-auto max-w-5xl px-4 pb-10 pt-12 text-center sm:px-6 sm:pt-16">
          <div className="eyebrow">Greek philosophy in plain words</div>
          <h1 className="mt-2 font-serif text-5xl font-semibold sm:text-6xl">Meet the philosophers</h1>
          <p className="mx-auto mt-4 max-w-2xl text-[1.15rem] leading-relaxed text-ink/85">
            New to philosophy? No problem. Here is everyone at the table: who they were, what they believed, and one small thing each would have you try this week. Five minutes each, no homework.
          </p>
          {/* Timeline: oldest to youngest. */}
          <nav aria-label="Timeline" className="mt-8 flex flex-wrap justify-center gap-x-1 gap-y-3">
            {LESSONS.map((l) => (
              <a key={l.id} href={`#${l.id}`} className="group flex w-[88px] flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/portraits/${l.id}.${PORTRAIT_FORMAT}`} alt="" className="h-14 w-14 rounded-full object-cover ring-1 ring-gold/40 transition group-hover:ring-gold" />
                <span className="mt-1.5 font-caps text-[0.78rem] tracking-[0.06em] group-hover:text-gold">{ROSTER[l.id].name}</span>
                <span className="text-[0.75rem] text-muted">{l.born < 0 ? `${-l.born} BC` : `${l.born} AD`}</span>
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        {LESSONS.map((l) => {
          const t = ROSTER[l.id];
          return (
            <article key={l.id} id={l.id} className="grid scroll-mt-20 gap-6 border-b border-line py-12 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10">
              <div className="feather mx-auto aspect-square w-48 md:w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/portraits/${l.id}.${PORTRAIT_FORMAT}`} alt={`Painted portrait of ${t.name}`} className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="eyebrow !text-gold">{t.archetype}</div>
                <h2 className="font-serif text-4xl font-semibold">{t.name}</h2>
                <p className="mt-1 text-[0.95rem] text-muted">
                  {l.dates} · {l.place} · {l.school}
                </p>
                <p className="mt-4 font-serif text-[1.5rem] italic leading-snug text-ink/90">{l.oneLine}</p>
                <dl className="mt-6 grid gap-5 lg:grid-cols-3">
                  {l.ideas.map((i) => (
                    <div key={i.term}>
                      <dt className="font-caps text-[0.95rem] tracking-[0.06em] text-gold">{i.term}</dt>
                      <dd className="mt-1 leading-relaxed text-ink/85">{i.text}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 border-l-2 border-gold/50 pl-4">
                  <div className="text-[0.75rem] uppercase tracking-[0.18em] text-muted">Try it this week</div>
                  <p className="mt-0.5 text-[1.05rem]">{l.tryIt}</p>
                </div>
                <p className="mt-4 text-[0.95rem]">
                  <span className="text-muted">Want more? Read </span>
                  <span className="italic">{l.read}</span>
                </p>
                {l.note && <p className="mt-2 text-[0.92rem] text-muted">{l.note}</p>}
              </div>
            </article>
          );
        })}

        <section className="py-12">
          <h2 className="text-center font-serif text-4xl font-semibold">A few Greek words</h2>
          <dl className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {GLOSSARY.map((g) => (
              <div key={g.term}>
                <dt className="font-caps text-[1rem] tracking-[0.06em] text-gold">{g.term}</dt>
                <dd className="mt-0.5 leading-relaxed text-ink/85">{g.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t border-line py-14 text-center">
          <h2 className="font-serif text-3xl font-semibold">Now put them to work</h2>
          <p className="mx-auto mt-2 max-w-xl text-ink/80">Bring a real question and let them argue it out, then call the vote.</p>
          <Link href="/" className="btn-primary mt-6 inline-flex h-12 items-center rounded-md px-8">
            Take a seat at the table
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
