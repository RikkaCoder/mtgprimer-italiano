import { access, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_PATH = "/mtgprimer-italiano";
const OUT = path.resolve("out");

if (process.env.GITHUB_PAGES !== "true") {
  throw new Error("Set GITHUB_PAGES=true before preparing a GitHub Pages export.");
}

await access(path.join(OUT, "index.html"));

const cssDirectory = path.join(OUT, "_next", "static", "css");
const entries = await readdir(cssDirectory, { withFileTypes: true });
let changedFiles = 0;
let rewrittenUrls = 0;

for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith(".css")) continue;
  const file = path.join(cssDirectory, entry.name);
  const css = await readFile(file, "utf8");

  // Next.js basePath handles Next links and its JS/CSS assets, but CSS URLs
  // pointing into /public/images remain rooted at the domain without this fix.
  const updated = css.replace(
    /url\(\s*(["']?)\/images\/([^"')]+)\1\s*\)/g,
    (_match, quote, image) => {
      rewrittenUrls += 1;
      return `url(${quote}${BASE_PATH}/images/${image}${quote})`;
    },
  );

  if (updated !== css) {
    await writeFile(file, updated);
    changedFiles += 1;
  }
}

// GitHub Pages/Jekyll otherwise hides the _next directory.
await writeFile(path.join(OUT, ".nojekyll"), "");
console.log(`Pages export prepared: ${changedFiles} CSS files, ${rewrittenUrls} image URLs.`);
