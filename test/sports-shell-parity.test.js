import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Sports uses the shared shell palette and title hierarchy", async () => {
  const html = await read("public/categories/sports/index.html");
  const css = await read("public/assets/app.css");

  assert.match(html, /<legend><span class="panel-heading"><span class="panel-orb"[^>]*><\/span>Sport<\/span><\/legend>/);
  assert.match(html, />Sports market<\/label>/);
  assert.match(html, /<h1 class="event-name"><\/h1>/);
  assert.doesNotMatch(html, /<h3 class="event-name"><\/h3>/);
  assert.match(html, /<h2 class="team-futures-name"/);
  assert.match(html, /<h2 class="tennis-market-name"/);

  assert.match(css, /\[data-category-view="sports"\] > #market-atlas-sports \{[\s\S]*--foreground: #f4f6f3;[\s\S]*--radius: 15px;/);
  assert.match(css, /\[data-category-view="sports"\] #market-atlas-sports \.orbital-panel,[\s\S]*border-radius: calc\(var\(--radius\) \* 1\.05\)/);
  assert.match(css, /#market-atlas-sports \.event-name \{[\s\S]*font-size: clamp\(21px, 2vw, 27px\);[\s\S]*letter-spacing: normal;/);
});
