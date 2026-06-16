import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native/Node-only parsers out of the server bundle so they load at runtime.
  serverExternalPackages: ["pdf-parse", "mammoth", "@napi-rs/canvas"],
  // pdf-parse -> pdfjs-dist pulls two files in through dynamic loads that
  // @vercel/nft can't trace, so they were dropped from the Vercel serverless
  // bundle (both work locally where node_modules is intact):
  //   1. @napi-rs/canvas (dynamic createRequire) — without it pdfjs's top-level
  //      `new DOMMatrix()` throws "ReferenceError: DOMMatrix is not defined" and
  //      the route 500s at module load.
  //   2. pdf.worker.mjs (dynamic import for the Node "fake worker") — without it
  //      getText() throws "Setting up fake worker failed: Cannot find module
  //      .../pdf.worker.mjs" (surfaces as a 422 "couldn't read that PDF").
  // Force-include both into the function's trace.
  outputFileTracingIncludes: {
    "/api/parse-resume": [
      "./node_modules/@napi-rs/canvas/**",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**",
      "./node_modules/@napi-rs/canvas-linux-x64-musl/**",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
};

export default nextConfig;
