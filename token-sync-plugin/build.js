const esbuild = require("esbuild");
const fs = require("fs");

const watch = process.argv.includes("--watch");

const common = {
  bundle: true,
  sourcemap: true,
  target: "es2017",
};

const buildMain = {
  ...common,
  entryPoints: ["src/code.ts"],
  outfile: "dist/code.js",
};

const buildUI = {
  ...common,
  entryPoints: ["src/ui.ts"],
  outfile: "dist/ui.js",
};

if (watch) {
  esbuild.context(buildMain).then((ctx) => ctx.watch());
  esbuild.context(buildUI).then((ctx) => ctx.watch());
} else {
  esbuild.buildSync(buildMain);
  esbuild.buildSync(buildUI);
}

// UI 스크립트를 HTML에 인라인해 Figma iframe에서 확실히 실행되게 한다.
const uiHtml = fs.readFileSync("src/ui.html", "utf8");
const uiJs = fs.readFileSync("dist/ui.js", "utf8");
const inlinedUiHtml = uiHtml.replace(
  '<script src="ui.js"></script>',
  `<script>\n${uiJs}\n</script>`
);

fs.writeFileSync("dist/ui.html", inlinedUiHtml);
