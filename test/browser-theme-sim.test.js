import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("browser simulation — toggling while left/right/bottom windows stay open repaints them", async () => {
  const htmlSrc = await read("public/index.html");
  const css = await read("public/assets/app.css");
  const js = await read("public/assets/app.js");
  const searchCss = await read("public/assets/search.css");
  const sportsHtml = await read("public/categories/sports/index.html");

  // Verify CSS actually has both light and dark for staying-open panels (regression guard)
  // Side windows are .orbital-panel/.market-detail-panel/.market-filter-panel/.timeline-dock and search dropdown
  for (const sel of [
    "\\.orbital-panel",
    "\\.market-detail-panel",
    "\\.market-filter-panel",
    "\\.market-timeline-dock",
    "\\.market-search-panel",
  ]) {
    // dark base must exist (without html prefix) and light override must exist (with html prefix)
    assert.match(css, new RegExp(sel), `app.css has ${sel} base`);
    assert.match(css, new RegExp(`html\\[data-theme="light"\\][^}]*${sel}`), `app.css has light ${sel}`);
  }
  assert.match(css, /html\[data-theme="light"\] \.orbital-panel/);
  assert.match(searchCss, /html\[data-theme="light"\] \.market-search-panel/);
  assert.match(sportsHtml, /:root\[data-theme="light"\][^}]*--card:\s*#ffffff/);
  assert.match(sportsHtml, /:root\[data-theme="dark"\][^}]*--card:/);

  // Extract applyTheme source and run it against a fake DOM that has staying-open windows
  const aStart = js.indexOf("function applyTheme(theme)");
  const aEnd = js.indexOf("}", aStart);
  // find matching closing brace for applyTheme (has inner blocks)
  let depth=0, aClose=-1;
  for(let i=aStart;i<js.length;i++){ if(js[i]==="{") depth++; else if(js[i]==="}"){ depth--; if(depth===0){ aClose=i; break; } } }
  const cStart = js.indexOf("function currentTheme()", aClose);
  let cDepth=0, cClose=-1;
  for(let i=cStart;i<js.length;i++){ if(js[i]==="{") cDepth++; else if(js[i]==="}"){ cDepth--; if(cDepth===0){ cClose=i; break; } } }
  assert.ok(aClose!==-1 && cClose!==-1, "both functions extractable");
  const applySrc = js.slice(aStart, aClose+1);
  const currentSrc = js.slice(cStart, cClose+1);
  const combinedSrc = applySrc + "\n" + currentSrc;

  // Fake DOM that mimics browser while panels stay mounted
  const htmlEl = { _theme: "light", getAttribute(n){ return n==="data-theme"?this._theme:null; }, setAttribute(n,v){ if(n==="data-theme") this._theme=v; } };
  const metaTheme = { _c:"#eef2ef", setAttribute(n,v){ if(n==="content") this._c=v; }, getAttribute(n){ return n==="content"?this._c:null; } };
  const metaScheme = { _c:"light", setAttribute(n,v){ if(n==="content") this._c=v; } };
  let stored = null;
  const localStorage = { getItem(){ return stored; }, setItem(k,v){ stored=v; } };
  const toggleBtn = {
    querySelector: () => ({ textContent: "" }),
    setAttribute(){},
  };
  let repainted = [];
  const fakePanels = [
    { className:"orbital-panel filter-sidebar", get offsetHeight(){ repainted.push("filter"); return 100; } },
    { className:"orbital-panel market-detail-panel", get offsetHeight(){ repainted.push("detail"); return 200; } },
    { className:"market-timeline-dock", get offsetHeight(){ repainted.push("timeline"); return 50; } },
    { className:"market-search-panel", hidden:false, get offsetHeight(){ repainted.push("search"); return 80; } },
  ];
  const fakeDoc = {
    documentElement: htmlEl,
    querySelector(sel){
      if(sel==='meta[name="theme-color"]') return metaTheme;
      if(sel==='meta[name="color-scheme"]') return metaScheme;
      if(sel==='#theme-toggle') return toggleBtn;
      return null;
    },
    querySelectorAll(sel){
      if(sel.includes(".orbital-panel")||sel.includes(".market-detail-panel")) return fakePanels;
      return [];
    },
    getElementById(id){ return id==="theme-toggle"?toggleBtn:null; },
  };

  // Run applyTheme("dark") while panels stay open — should flip data-theme and repaint
  const fn = new Function("html","metaTheme","metaScheme","localStorage","document","STORAGE_KEY", `
    const window={};
    ${combinedSrc}
    return {applyTheme, currentTheme};
  `);
  const {applyTheme, currentTheme} = fn(htmlEl, metaTheme, metaScheme, localStorage, fakeDoc, "market-atlas-theme");

  // Start light
  htmlEl._theme = "light";
  repainted = [];
  applyTheme("dark");
  assert.equal(htmlEl._theme, "dark", "html flips to dark even though panels stay mounted");
  assert.equal(metaTheme._c, "#0b110e");
  assert.equal(metaScheme._c, "dark");
  assert.equal(stored, "dark");
  assert.ok(repainted.includes("filter") && repainted.includes("detail"), "staying-open left/right windows were repainted");
  assert.ok(repainted.includes("timeline"), "bottom timeline repainted");
  assert.ok(repainted.includes("search"), "search dropdown repainted even when open");

  // Flip back to light while still open
  repainted = [];
  applyTheme("light");
  assert.equal(htmlEl._theme, "light");
  assert.equal(metaTheme._c, "#eef2ef");
  assert.ok(repainted.length>0, "repainted again on light");

  // currentTheme reflects DOM even when panels stay open
  htmlEl._theme = "dark";
  assert.equal(currentTheme(), "dark");
  htmlEl._theme = "light";
  assert.equal(currentTheme(), "light");

  // Verify header still has search inside and utility bar outside so grid not broken (globe stays)
  assert.match(htmlSrc, /<header[^>]*>[\s\S]*data-market-search[\s\S]*<\/header>/);
  // Event detail, date, market selection windows must have both dark and light (regression for white-stuck panels)
  for (const sel of ["\\.event-detail", "\\.market-card", "\\.filter-sidebar", "\\.timeline-dock", "\\.form-select"]) {
    assert.match(css, new RegExp(sel), `app.css has \${sel}`);
    assert.match(css, new RegExp(`html\\[data-theme="light"\\][^}]*${sel}`), `light has \${sel}`);
  }
  // Ensure no bare light event-detail that would make it always white (the bug we just fixed)
  const lightSection = css.slice(css.indexOf("/* === LIGHT THEME"));
  assert.equal((lightSection.match(/\n\[data-category-view/g) || []).length, 0, "no bare [data-category-view in light section - all prefixed");
  assert.ok(htmlSrc.indexOf('integration-utility-bar') > htmlSrc.indexOf('</main>'), "utility bar outside shell so globe grid intact");
  assert.ok(htmlSrc.indexOf('data-market-search') < htmlSrc.indexOf('</header>'), "search stays inside header standard place");
});

test("browser simulation — search dropdown stays open and toggles color with data-theme", async () => {
  const css = await read("public/assets/search.css");
  const appCss = await read("public/assets/app.css");

  // Dropdown must have both themes, not just light
  assert.match(css, /\.market-search-panel\s*\{[^}]*background:\s*color-mix/);
  assert.match(css, /html\[data-theme="light"\] \.market-search-panel\s*\{[^}]*background:\s*#ffffff/);
  // Results and context also toggle
  assert.match(css, /html\[data-theme="light"\] \.market-search-context/);
  // App-level global fix ensures dropdown toggles even when category CSS missed
  assert.match(appCss, /html\[data-theme="light"\] \.market-search-panel/);
});

test("browser simulation — default is light and toggle is minimalist top-right", async () => {
  const html = await read("public/index.html");
  const css = await read("public/assets/app.css");
  assert.match(html, /<html[^>]*data-theme="light"/);
  assert.match(css, /\.integration-utility-bar\s*\{[^}]*top:\s*70px/);
  assert.match(css, /\.integration-utility-bar\s*\{[^}]*position:\s*fixed/);
  assert.match(css, /\.integration-theme-toggle,\s*\.integration-daily-link\s*\{[^}]*background:\s*transparent/);
});
