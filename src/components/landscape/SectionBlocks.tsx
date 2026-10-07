"use client";

import { Suspense } from "react";
import SectionBlock from "./SectionBlock";
import { SECTIONS } from "./sections";
import Signposts from "./Signposts";

/** Every section in `sections.ts` as a block, plus the signposts at spawn.
 *  Each block waits on the typeface in its own boundary, so a slow font never
 *  suspends the player or the ground along with it. */
export default function SectionBlocks() {
  return (
    <>
      {SECTIONS.map((section) => (
        <Suspense key={section.id} fallback={null}>
          <SectionBlock section={section} />
        </Suspense>
      ))}
      <Suspense fallback={null}>
        <Signposts />
      </Suspense>
    </>
  );
}
