// Builds the single-file site from site/src.
//   node site/build.mjs                         -> site/dist/index.html (full page for Vercel or any static host)
//   node site/build.mjs --artifact out.html     -> also writes the fragment format used for Claude Artifacts
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, "src", p), "utf8");

// Long-form lessons live one per file in src/lessons/<id>.html. A leading comment carries the summary and
// the recap bullets; the rest is the lesson body. They override the short bodies in content/*.js.
//   <!--
//   sum: one-sentence summary
//   keys:
//   - recap bullet
//   -->
const lessonDir = join(here, "src", "lessons");
const lessons = {};
for (const f of existsSync(lessonDir) ? readdirSync(lessonDir).filter((n) => n.endsWith(".html")).sort() : []) {
  const raw = readFileSync(join(lessonDir, f), "utf8");
  const m = /^\s*<!--([\s\S]*?)-->\s*/.exec(raw);
  if (!m) throw new Error(`${f}: missing the header comment`);
  const head = m[1], body = raw.slice(m[0].length).trim();
  const sum = /^\s*sum:\s*(.+)$/m.exec(head)?.[1]?.trim();
  const keys = [...head.matchAll(/^\s*-\s+(.+)$/gm)].map((k) => k[1].trim());
  if (!sum || !keys.length) throw new Error(`${f}: header needs sum: and at least one "- " key`);
  if (/<\/script/i.test(body)) throw new Error(`${f} contains '</script'`);
  lessons[f.replace(/\.html$/, "")] = { sum, keys, body };
}
// Reading time is computed from the words on the page, not hand-set.
const patch = `(function(){var L=${JSON.stringify(lessons)};
window.BP_UNITS.forEach(function(u){u.lessons.forEach(function(l){var o=L[l.id];if(o){l.body=o.body;l.sum=o.sum;l.keys=o.keys;}
var w=l.body.replace(/<[^>]+>/g," ").split(/\\s+/).filter(Boolean).length;l.min=Math.max(2,Math.ceil(w/200)+Math.ceil(l.quiz.length/2));});});})();`;

const scripts = ["content/c1.js", "content/c2.js", "content/c3.js", "content/c4.js", "content/c5.js", "content/c6.js"].map(read).concat([patch], ["widgets.js", "app.js"].map(read)).join("\n");
if (/<\/script/i.test(scripts)) throw new Error("A source file contains '</script', which would end the inline script early.");
console.log(`${Object.keys(lessons).length} long-form lessons from src/lessons/`);

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
