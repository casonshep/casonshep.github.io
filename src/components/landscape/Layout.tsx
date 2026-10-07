"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Box3, Vector3 } from "three";
import Card from "./Card";
import { Flat, LIFT, Pill, Rule, pillWidth, rowOffsets } from "./Flat";
import { sectionBounds } from "./playerState";
import { SECTIONS } from "./sections";
import { COLUMN, FONT, INK } from "./theme";
import Title3D from "./Title3D";
import type { Section, Vec3 } from "./types";

// How each kind of section sits on the page — the 3D world's templates.
// Every section's `position` is its heading's left edge; content runs from
// there toward the player (+z), so on screen it reads heading over body.
//
// Climbable: section headings (3D serif) and cards. Rows in a list are flush
// with the page; walking over one counts as standing on it.

const HEADING = 1.9;
/** Gap between the heading and the first line under it. */
const UNDER = 1.4;
/** Where content starts below a heading. */
const BODY = 2.6;
/** Space between a section's hairline and its heading. */
const RULE_GAP = 3.2;
const GRID_GAP = 1.2;

/** Registers a flat zone in sectionBounds, so walking onto it raises `id`'s panel. */
function Zone({ id, min, max }: { id: string; min: Vec3; max: Vec3 }) {
  const box = useMemo(() => new Box3(new Vector3(...min), new Vector3(...max)), [min, max]);
  useEffect(() => {
    sectionBounds.set(id, box);
    return () => {
      if (sectionBounds.get(id) === box) sectionBounds.delete(id);
    };
  }, [id, box]);
  return null;
}

function Links({ section, position, size = 0.36 }: { section: Section; position: Vec3; size?: number }) {
  if (!section.links?.length) return null;
  return (
    <Flat position={position} size={size} font={FONT.mono} color={INK.accent}>
      {section.links.map((l) => `${l.label} ↗`).join("     ")}
    </Flat>
  );
}

/** Hairline above, climbable heading, and a dim line under it. */
function Heading({ section, button }: { section: Section; button?: boolean }) {
  const [x, y, z] = section.position ?? [-COLUMN, 0, 0];
  const link = section.links?.[0];
  return (
    <>
      <Rule z={z - RULE_GAP} x0={-COLUMN} x1={COLUMN} y={y} />
      <Title3D id={section.id} text={section.title} origin={[x, y, z]} size={HEADING} />
      {button && link && (
        <Pill
          label={link.label}
          size={0.3}
          color={INK.text}
          boxed
          position={[COLUMN - pillWidth(link.label, 0.3), y, z]}
        />
      )}
      {section.lines[0] && (
        <Flat position={[x, y + LIFT, z + UNDER]} size={0.42} color={INK.dim} maxWidth={COLUMN * 2}>
          {section.lines[0]}
        </Flat>
      )}
    </>
  );
}

function Hero({ section }: { section: Section }) {
  const [x, y, z] = section.position ?? [-COLUMN, 0, 0];
  const feature = section.children?.[0];
  const textWidth = COLUMN - 1;
  return (
    <>
      {section.meta && (
        <Flat position={[x, y + LIFT, z - 2.5]} size={0.4} font={FONT.mono} color={INK.faint}>
          {section.meta}
        </Flat>
      )}
      <Title3D id={section.id} text={section.title} origin={[x, y, z]} size={2.4} />
      <Flat
        position={[x, y + LIFT, z + 1.9]}
        size={0.55}
        font={FONT.serif}
        color={INK.dim}
        maxWidth={textWidth}
      >
        {section.lines.join("\n\n")}
      </Flat>
      <Links section={section} position={[x, y + LIFT, z + 6.6]} />
      {feature && <Card item={feature} center={[COLUMN / 2 + 0.75, y, z + 1.5]} w={COLUMN - 1.5} d={9} />}
    </>
  );
}

const ROW = { depth: 1.8, pitch: 2 };

function List({ section }: { section: Section }) {
  const [, y, z] = section.position ?? [-COLUMN, 0, 0];
  return (
    <>
      <Heading section={section} button />
      {(section.children ?? []).map((post, i) => {
        const cz = z + BODY + ROW.depth / 2 + i * ROW.pitch;
        const tagSize = 0.28;
        // Right-aligned: lay the row out from 0, then shift it to end at the column edge.
        const labels = post.tags ?? [];
        const widths = labels.map((t) => pillWidth(t, tagSize));
        const lefts = rowOffsets(widths, 0, 0.2);
        const span = widths.length ? lefts[lefts.length - 1] + widths[widths.length - 1] : 0;
        const shift = COLUMN - 0.6 - span;
        const tags = labels.map((tag, i) => (
          <Pill key={tag} label={tag} size={tagSize} position={[shift + lefts[i], y, cz]} />
        ));
        return (
          <group key={post.id}>
            <Zone id={post.id} min={[-COLUMN, y, cz - ROW.depth / 2]} max={[COLUMN, y + 0.02, cz + ROW.depth / 2]} />
            <Rule z={cz + ROW.depth / 2 + (ROW.pitch - ROW.depth) / 2} x0={-COLUMN} x1={COLUMN} y={y} />
            <Flat
              position={[-COLUMN + 0.6, y + 0.03, cz]}
              size={0.32}
              font={FONT.mono}
              color={INK.faint}
              anchorY="middle"
            >
              {post.meta ?? ""}
            </Flat>
            <Flat
              position={[-COLUMN + 3.2, y + 0.03, cz]}
              size={0.5}
              color={INK.text}
              anchorY="middle"
            >
              {post.title}
            </Flat>
            {tags}
          </group>
        );
      })}
    </>
  );
}

function Grid({ section, depth }: { section: Section; depth: number }) {
  const [, y, z] = section.position ?? [-COLUMN, 0, 0];
  const items = section.children ?? [];
  const n = Math.max(items.length, 1);
  const w = (COLUMN * 2 - GRID_GAP * (n - 1)) / n;
  return (
    <>
      <Heading section={section} />
      {items.map((item, i) => (
        <Card
          key={item.id}
          item={item}
          w={w}
          d={depth}
          center={[-COLUMN + w / 2 + i * (w + GRID_GAP), y, z + BODY + depth / 2]}
        />
      ))}
    </>
  );
}

function Text({ section }: { section: Section }) {
  const [x, y, z] = section.position ?? [-COLUMN, 0, 0];
  return (
    <>
      <Rule z={z - RULE_GAP} x0={-COLUMN} x1={COLUMN} y={y} />
      <Title3D id={section.id} text={section.title} origin={[x, y, z]} size={HEADING} />
      <Flat position={[x, y + LIFT, z + UNDER + 0.2]} size={0.5} color={INK.dim} maxWidth={COLUMN * 1.5}>
        {section.lines.join("\n\n")}
      </Flat>
      <Links section={section} position={[x, y + LIFT, z + UNDER + 2.4]} />
    </>
  );
}

function SectionView({ section }: { section: Section }) {
  switch (section.kind) {
    case "hero":
      return <Hero section={section} />;
    case "list":
      return <List section={section} />;
    case "cards":
      return <Grid section={section} depth={7} />;
    case "gallery":
      return <Grid section={section} depth={9} />;
    default:
      return <Text section={section} />;
  }
}

/** Every section in sections.ts, laid out on the page. Each waits on its
 *  fonts in its own boundary, so nothing suspends the player or the page. */
export default function Layout() {
  return SECTIONS.map((section) => (
    <Suspense key={section.id} fallback={null}>
      <SectionView section={section} />
    </Suspense>
  ));
}

