import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&family=Noto+Serif:wght@400;500;600;700&display=swap";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const START_MARKER = "/* Overseas Latin Noto fonts */";
const END_MARKER = "/* End overseas Latin Noto fonts */";

const vendorDir = resolve("public/fonts/vendor");
const fontsCssPath = resolve("app/fonts.css");

const cssResponse = await fetch(GOOGLE_FONTS_URL, {
  headers: {
    "User-Agent": USER_AGENT,
  },
});

if (!cssResponse.ok) {
  throw new Error(`Failed to fetch Google Fonts CSS: ${cssResponse.status}`);
}

let css = await cssResponse.text();
const urls = [...new Set([...css.matchAll(/https:\/\/fonts\.gstatic\.com\/[^)]+/g)].map((match) => match[0]))];

for (const url of urls) {
  const parsedUrl = new URL(url);
  const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
  const familySlug = pathParts[1] || "font";
  const fileName = `${familySlug}-${basename(parsedUrl.pathname)}`;
  const outputPath = resolve(vendorDir, fileName);

  if (!existsSync(outputPath)) {
    const fontResponse = await fetch(url);

    if (!fontResponse.ok) {
      throw new Error(`Failed to fetch font ${url}: ${fontResponse.status}`);
    }

    writeFileSync(outputPath, Buffer.from(await fontResponse.arrayBuffer()));
  }

  css = css.replaceAll(url, `/fonts/vendor/${fileName}`);
}

const block = `${START_MARKER}\n${css.trim()}\n${END_MARKER}\n`;
const existingCss = readFileSync(fontsCssPath, "utf8");
const markerPattern = new RegExp(`${escapeRegExp(START_MARKER)}[\\s\\S]*?${escapeRegExp(END_MARKER)}\\n?`);
const nextCss = `${existingCss.replace(markerPattern, "").trimEnd()}\n\n${block}`;

writeFileSync(fontsCssPath, nextCss);
console.log(`Synced ${urls.length} overseas font files.`);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
