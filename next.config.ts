import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native/Node-only parsers out of the server bundle so they load at runtime.
  serverExternalPackages: ["pdf-parse", "mammoth", "@napi-rs/canvas"],
  // pdf-parse -> pdfjs-dist loads @napi-rs/canvas through a dynamic createRequire()
  // that @vercel/nft can't trace, so the native package is dropped from the Vercel
  // serverless bundle. Without it pdfjs's top-level `new DOMMatrix()` throws
  // "ReferenceError: DOMMatrix is not defined" and /api/parse-resume 500s at module
  // load (works locally because the dep is present). Force-include canvas + its
  // Linux binary so the dep resolves and pdfjs can polyfill DOMMatrix.
  outputFileTracingIncludes: {
    "/api/parse-resume": [
      "./node_modules/@napi-rs/canvas/**",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**",
      "./node_modules/@napi-rs/canvas-linux-x64-musl/**",
    ],
  },
};

export default nextConfig;
