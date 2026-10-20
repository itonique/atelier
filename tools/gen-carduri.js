// Generates per-year Facebook preview cards (1200x630 PNG) and per-year share pages.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { chromium } = require("playwright");

const REPO = path.join(__dirname, "..");
const BASE = process.env.BASE || "https://itonique.github.io/atelier/";
const FONTS = path.join(__dirname, "node_modules/@fontsource");  // npm i @fontsource/playfair-display @fontsource/source-serif-4 @fontsource/ibm-plex-sans-condensed playwright

// Pull the EV (events) object straight out of the app, so cards and app never drift apart.
const app = fs.readFileSync(path.join(REPO, "index.html"), "utf8");
const evSrc = app.match(/const EV=(\{[\s\S]*?\n\});/)[1];
const EV = vm.runInNewContext("(" + evSrc + ")");

const font = (pkg, file) => "file://" + path.join(FONTS, pkg, "files", file);
const css = `
@font-face{font-family:PF;font-weight:800;src:url(${font("playfair-display","playfair-display-latin-ext-800-normal.woff2")}) format("woff2");unicode-range:U+0100-02AF,U+0218-021B}
@font-face{font-family:PF;font-weight:800;src:url(${font("playfair-display","playfair-display-latin-800-normal.woff2")}) format("woff2")}
@font-face{font-family:SS;font-weight:400;src:url(${font("source-serif-4","source-serif-4-latin-ext-400-normal.woff2")}) format("woff2");unicode-range:U+0100-02AF,U+0218-021B}
@font-face{font-family:SS;font-weight:400;src:url(${font("source-serif-4","source-serif-4-latin-400-normal.woff2")}) format("woff2")}
@font-face{font-family:SS;font-weight:400;font-style:italic;src:url(${font("source-serif-4","source-serif-4-latin-ext-400-italic.woff2")}) format("woff2");unicode-range:U+0100-02AF,U+0218-021B}
@font-face{font-family:SS;font-weight:400;font-style:italic;src:url(${font("source-serif-4","source-serif-4-latin-400-italic.woff2")}) format("woff2")}
@font-face{font-family:PX;font-weight:600;src:url(${font("ibm-plex-sans-condensed","ibm-plex-sans-condensed-latin-ext-600-normal.woff2")}) format("woff2");unicode-range:U+0100-02AF,U+0218-021B}
@font-face{font-family:PX;font-weight:600;src:url(${font("ibm-plex-sans-condensed","ibm-plex-sans-condensed-latin-600-normal.woff2")}) format("woff2")}
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;background:#F7F4EE;color:#16120E}
.c{width:1200px;height:630px;padding:56px 64px 44px;display:grid;grid-template-columns:430px 1fr;grid-template-rows:1fr auto;column-gap:48px}
.l{display:flex;flex-direction:column;justify-content:center;gap:6px}
.k{font:600 22px PX;letter-spacing:.16em;text-transform:uppercase;color:#A11D21}
.s{font:italic 400 36px SS;color:#3A322B;margin-top:14px}
.y{font:800 200px/0.9 PF;letter-spacing:-.02em;font-variant-numeric:lining-nums;font-feature-settings:"lnum" 1}
.r{display:flex;flex-direction:column;justify-content:center;gap:20px;border-left:2px solid #E4DCCF;padding-left:44px}
.e{display:grid;grid-template-columns:16px 1fr;gap:16px;font:400 25px/1.35 SS}
.e i{width:12px;height:12px;border-radius:50%;background:#A11D21;margin-top:12px}
.e span{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.e.w i{background:#B9AD9C}
.f{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;border-top:2px solid #E4DCCF;padding-top:20px;font:600 26px PX;letter-spacing:.06em}
.f b{color:#A11D21;font-weight:600}
`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function cardHtml(y) {
  const ev = (EV[y] || []).slice(0, 3);
  const items = ev.map(e => `<div class="e ${e[0] === "L" ? "w" : ""}"><i></i><span>${esc(e[1])}</span></div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div class="c">
<div class="l"><div class="k">Curtea lui Vodă · Anul tău</div><div class="s">M-am născut în</div><div class="y">${y}</div></div>
<div class="r">${items}</div>
<div class="f"><span>Tu ce an ești?</span><b>Află pe tonivoda.com</b></div></div></body></html>`;
}

function defaultHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}
.d{width:1200px;height:630px;padding:70px 80px;display:flex;flex-direction:column;justify-content:center;gap:18px}
.d .y{font-size:150px}.d p{font:400 34px/1.4 SS;color:#3A322B;max-width:900px}</style></head><body><div class="d">
<div class="k">Curtea lui Vodă · Atelierul</div><div class="y">Anul tău</div>
<p>Alege anul în care te-ai născut și vezi ce se întâmpla atunci în România.</p>
<div class="f" style="margin-top:20px"><span>Tu ce an ești?</span><b>Află pe tonivoda.com</b></div></div></body></html>`;
}

function yearPage(y) {
  const url = `${BASE}an/${y}/`;
  const first = (EV[y] && EV[y][0] && EV[y][0][1]) || "";
  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>M-am născut în ${y} · Anul tău</title>
<meta name="description" content="Vezi ce se întâmpla în România în ${y}. ${esc(first)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Curtea lui Vodă">
<meta property="og:url" content="${url}">
<meta property="og:title" content="M-am născut în ${y}. Tu ce an ești?">
<meta property="og:description" content="Vezi ce se întâmpla în România în anul în care te-ai născut. Atelierul Curții lui Vodă.">
<meta property="og:image" content="${BASE}carduri/${y}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="M-am născut în ${y}: ce se întâmpla atunci în România">
<meta name="twitter:card" content="summary_large_image">
<script>location.replace("../../?an=${y}")</script>
</head>
<body style="font-family:Georgia,serif;background:#F7F4EE;color:#16120E;padding:40px">
<p><a href="../../?an=${y}">Deschide „Anul tău” pentru ${y}</a></p>
</body>
</html>
`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  fs.mkdirSync(path.join(REPO, "carduri"), { recursive: true });
  const shoot = async (html, out) => {
    const tmp = path.join(__dirname, "_card.html");
    fs.writeFileSync(tmp, html);
    await page.goto("file://" + tmp, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: out, type: "png" });
  };
  await shoot(defaultHtml(), path.join(REPO, "carduri", "default.png"));
  for (let y = 1940; y <= 2005; y++) {
    await shoot(cardHtml(y), path.join(REPO, "carduri", `${y}.png`));
    const dir = path.join(REPO, "an", String(y));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), yearPage(y));
  }
  await browser.close();
  console.log("done", Object.keys(EV).length, "years");
})();
