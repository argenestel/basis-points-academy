// Builds the single-file site from site/src.
//   node site/build.mjs                         -> site/dist/index.html (full page for Vercel or any static host)
//   node site/build.mjs --artifact out.html     -> also writes the fragment format used for Claude Artifacts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, "src", p), "utf8");

const scripts = ["content/c1.js", "content/c2.js", "content/c3.js", "content/c4.js", "content/c5.js", "app.js"].map(read).join("\n");
if (/<\/script/i.test(scripts)) throw new Error("A source file contains '</script', which would end the inline script early.");

const shell = read("shell.html");
const fragment = `${shell}\n<script>\n${scripts}\n</script>\n`;

// For the standalone page, hoist <title>, <meta> and <link> (everything before <style>) into <head>.
const cut = shell.indexOf("<style>");
const headTags = shell.slice(0, cut);
const bodyShell = shell.slice(cut);
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="A free, hands-on course for engineers: DeFi, perps, tokenized stocks, MEV, bridges and building your own chain, with papers, quizzes and labs.">
${headTags.trim()}
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${bodyShell}
<script>
${scripts}
</script>
</body>
</html>
`;

mkdirSync(join(here, "dist"), { recursive: true });
writeFileSync(join(here, "dist", "index.html"), page);
console.log(`site/dist/index.html  ${(page.length / 1024).toFixed(0)} KB`);

const i = process.argv.indexOf("--artifact");
if (i > -1 && process.argv[i + 1]) {
  writeFileSync(process.argv[i + 1], fragment);
  console.log(`${process.argv[i + 1]}  ${(fragment.length / 1024).toFixed(0)} KB (artifact fragment)`);
}
