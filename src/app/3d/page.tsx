import type { Metadata } from "next";
import Landscape from "@/components/landscape/Landscape";
import WebGLGate from "./WebGLGate";

const TITLE = "CASON · world";
const DESCRIPTION =
  "A small landscape to walk around in. Climb onto the words to read them.";

// Absolute URLs: the layout sets no metadataBase, and a relative one would
// fail the build.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://casonshep.github.io/3d/" },
  openGraph: {
    type: "website",
    siteName: "CASON",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://casonshep.github.io/3d/",
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function World() {
  return (
    <main>
      <h1 className="sr-only">World</h1>
      <WebGLGate>
        <Landscape />
      </WebGLGate>
    </main>
  );
}
