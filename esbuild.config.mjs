import esbuild from "esbuild";
import process from "process";

const isWatch = process.argv.includes("--watch");

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "fs",
    "path",
    "os",
    "http",
    "https",
    "net",
    "crypto",
    "stream",
    "zlib",
    "events",
    "util",
    "buffer",
    "url",
    "querystring",
    "string_decoder",
    "punycode",
    "dns",
    "tls",
    "child_process",
    "cluster",
    "dgram",
    "readline",
    "repl",
    "vm",
    "worker_threads",
  ],
  format: "cjs",
  target: "node16",
  logLevel: "info",
  sourcemap: "inline",
  treeShaking: true,
  outfile: "main.js",
});

if (isWatch) {
  await context.watch();
  console.log("Watching for changes...");
} else {
  await context.rebuild();
  await context.dispose();
}
