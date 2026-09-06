import type { Metadata } from "next";
import Wall from "@/components/art/Wall";

export const metadata: Metadata = {
  title: "CASON · art",
  description: "Drawings, prints and whatever else isn't code.",
};

export default function Art() {
  return (
    <main>
      <h1 className="sr-only">Art</h1>
      <Wall />
    </main>
  );
}
