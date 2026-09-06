import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // A route exports as `art.html` *and* gets an `art/` directory of RSC
  // payloads beside it, which a static host (GitHub Pages) resolves
  // ambiguously. Trailing slashes emit `art/index.html` instead, so there
  // is exactly one thing at `/art/`.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
