// Bundles the game into a single plain <script> (IIFE, not an ES module) so
// the built output can be opened directly via file:// with no local server
// and no build tooling required on the player's machine.
import { build } from "esbuild";

await build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  outfile: "bundle.js",
  format: "iife",
  minify: true,
  sourcemap: false,
  loader: { ".jsx": "jsx", ".js": "jsx" },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
});
