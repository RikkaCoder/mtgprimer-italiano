import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("out");
const BASE_PATH = "/mtgprimer-italiano";

const required = [
  "index.html",
  ".nojekyll",
  "directory/index.html",
  "reality-fracture/instants/index.html",
];
for (const file of required) {
  await access(path.join(OUT, file));
}

const home = await readFile(path.join(OUT, "index.html"), "utf8");
if (!home.includes(`${BASE_PATH}/_next/`)) {
  throw new Error("Generated HTML is missing the GitHub Pages basePath.");
}
if (!home.includes(`${BASE_PATH}/favicon.ico`)) {
  throw new Error("Generated favicon URL is missing the GitHub Pages basePath.");
}

const cssDir = path.join(OUT, "_next", "static", "css");
const cssFiles = (await readdir(cssDir)).filter((file) => file.endsWith(".css"));
if (!cssFiles.length) throw new Error("No generated CSS files found.");

let foundFixedBackground = false;
for (const file of cssFiles) {
  const css = await readFile(path.join(cssDir, file), "utf8");
  if (/url\(\s*["']?\/images\//.test(css)) {
    throw new Error(`Unprefixed public image in ${file}`);
  }
  if (css.includes(`${BASE_PATH}/images/bg/`)) foundFixedBackground = true;
}
if (!foundFixedBackground) {
  throw new Error("Expected prefixed CSS background images were not found.");
}

console.log("Pages export verified: routes, JS/CSS basePath, favicon, images and .nojekyll.");
