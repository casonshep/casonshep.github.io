import type { Metadata } from "next";
import Link from "next/link";
import { SECTIONS } from "@/components/landscape/sections";
import type { Section } from "@/components/landscape/types";

// The world as a page of text: the same SECTIONS, rendered on the server as
// plain HTML — for readers, search engines, browsers without WebGL, and
// anyone with JavaScript off.
//
// It scrolls inside its own container, as the art wall does, because
// globals.css pins html/body to the viewport for the room.

const TITLE = "CASON · world (text)";
const DESCRIPTION = "Everything in the world, as plain text.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://casonshep.github.io/3d/text/" },
  openGraph: {
    type: "website",
    siteName: "CASON",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://casonshep.github.io/3d/text/",
  },
};

const STYLE = `
.wt-scroll {
  position: fixed;
  inset: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  font-family: var(--font-geist-mono), ui-monospace, Menlo, monospace;
}
.wt-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  padding: clamp(1rem, 2.5vh, 1.75rem) clamp(1rem, 3vw, 2.5rem);
  font-size: clamp(0.8rem, 1.1vw, 0.95rem);
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.7);
}
.wt-head nav { display: flex; gap: 1.25rem; }
.wt-head a {
  color: inherit;
  text-decoration: none;
  transition: color 140ms ease-out;
}
.wt-head a:hover, .wt-head a:focus-visible {
  color: rgba(255, 255, 255, 0.98);
  text-decoration: underline;
  text-underline-offset: 0.25em;
  outline: none;
}
.wt {
  max-width: 44rem;
  padding: clamp(0.5rem, 2vh, 1.5rem) clamp(1rem, 3vw, 2.5rem)
           clamp(3rem, 12vh, 7rem);
}
.wt h1 {
  margin: 0 0 2rem;
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.92);
}
.wt section { margin: 0 0 2.25rem; }
.wt section section { margin: 1.25rem 0 0 1rem; }
.wt h2, .wt h3, .wt h4, .wt h5, .wt h6 {
  margin: 0 0 0.7rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.85rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.75);
}
.wt h3, .wt h4, .wt h5, .wt h6 { font-size: 0.8rem; border-bottom: 0; }
.wt p {
  margin: 0 0 0.55rem;
  font-size: 0.85rem;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.86);
  overflow-wrap: anywhere;
}
.wt ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.1rem;
  margin: 0.8rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.8rem;
}
.wt ul a {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: underline;
  text-decoration-color: rgba(255, 255, 255, 0.3);
  text-underline-offset: 0.25em;
}
.wt ul a:hover, .wt ul a:focus-visible {
  color: #fff;
  text-decoration-color: currentColor;
  outline: none;
}
.wt-credits {
  margin-top: 3rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}
.wt-credits p { font-size: 0.75rem; }
.wt-credits a { color: rgba(255, 255, 255, 0.85); }
.wt-empty { color: rgba(255, 255, 255, 0.7); font-size: 0.85rem; }
`;

const HEADINGS = ["h2", "h3", "h4", "h5", "h6"] as const;

/** One section and, a level down, its children. */
function Entry({ section, depth }: { section: Section; depth: number }) {
  const H = HEADINGS[Math.min(depth, HEADINGS.length - 1)];
  const headingId = `${section.id}-title`;
  return (
    <section id={section.id} aria-labelledby={headingId}>
      <H id={headingId}>{section.title}</H>
      {section.lines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
      {section.links && section.links.length > 0 && (
        <ul aria-label={`${section.title} links`}>
          {section.links.map((l) => {
            const external = l.href.startsWith("http");
            return (
              <li key={l.href}>
                <a
                  href={l.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                >
                  {l.label}
                  {external && <span aria-hidden> ↗</span>}
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {section.children?.map((c) => (
        <Entry key={c.id} section={c} depth={depth + 1} />
      ))}
    </section>
  );
}

export default function WorldText() {
  return (
    <div className="wt-scroll">
      <style>{STYLE}</style>
      <header className="wt-head">
        <nav aria-label="Site">
          <Link href="/">
            cason <span aria-hidden>↖</span> room
          </Link>
          <a href="/3d/">walk it</a>
        </nav>
      </header>
      <main className="wt">
        <h1>world, as text</h1>
        {SECTIONS.length === 0 ? (
          <p className="wt-empty">Nothing here yet.</p>
        ) : (
          SECTIONS.map((s) => <Entry key={s.id} section={s} depth={0} />)
        )}
        <footer id="credits" className="wt-credits">
          <p>
            Character: “
            <a href="https://sketchfab.com/3d-models/luxray-7c6a2c3957d7437691a3f8125f362756">
              Luxray
            </a>
            ” by Gianmarco (GianmArt), licensed{" "}
            <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
            ; repacked and compressed. Luxray is a Pokémon design © Nintendo /
            Creatures / GAME FREAK — a fan-made model, used non-commercially.
          </p>
          <p>Title font: Helvetiker Bold, MgOpen licence. Label font: Geist, SIL Open Font License.</p>
        </footer>
      </main>
    </div>
  );
}
