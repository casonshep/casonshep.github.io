import type { Metadata } from "next";
import Landscape from "@/components/landscape/Landscape";

export const metadata: Metadata = {
  title: "CASON · world",
  description: "Walk around and climb onto the sections.",
};

export default function World() {
  return (
    <main>
      <h1 className="sr-only">World</h1>
      <Landscape />
    </main>
  );
}
