const suggestions = [
  "Boston",
  "rain in Philadelphia",
  "Dodgers tonight",
  "close Senate races",
  "F1 next week"
];

const compactVolume = value => {
  const amount = Number(value || 0);
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(amount >= 100_000 ? 0 : 1)}K`;
  return amount.toLocaleString("en-US");
};

const priceLabel = value => Number.isFinite(Number(value)) ? `${Math.round(Number(value))}¢` : "—";

function setupMarketSearch(shell, instance) {
  const input = shell.querySelector("input[type='search']");
  const panel = shell.querySelector(".market-search-panel");
  const context = shell.querySelector(".market-search-context");
  const results = shell.querySelector(".market-search-results");
  let debounceTimer = null;
  let controller = null;
  let requestSequence = 0;
  let currentResults = [];

  function setOpen(open) {
    panel.hidden = !open;
    input.setAttribute("aria-expanded", String(open));
  }

  function renderSuggestions() {
    currentResults = [];
    context.innerHTML = "<strong>Search naturally</strong><span>Teams, places, dates, tickers, or ideas</span>";
    results.replaceChildren();
    const wrap = document.createElement("div");
    wrap.className = "market-search-suggestions";
    for (const text of suggestions) {
      const button = document.createElement("button");
      button.className = "market-search-suggestion";
      button.type = "button";
      button.textContent = text;
      button.addEventListener("click", () => {
        input.value = text;
        input.focus();
        void runSearch(text);
      });
      wrap.appendChild(button);
    }
    results.appendChild(wrap);
  }

  function renderMessage(title, detail = "") {
    currentResults = [];
    context.innerHTML = `<strong>${title}</strong>${detail ? `<span>${detail}</span>` : ""}`;
    results.innerHTML = '<div class="market-search-empty">No matching live markets yet. Try a team, league, place, ticker, or a broader date.</div>';
  }

  function activateResult(result) {
    const selection = new CustomEvent("market-search:select", { bubbles: true, cancelable: true, detail: { result } });
    shell.dispatchEvent(selection);
    if (!selection.defaultPrevented && result.type === "location") {
      const bridge = Object.values(window.__marketAtlasOddsBridges || {})[0];
      if (bridge?.revealLocation?.(result)) {
        setOpen(false);
        input.blur();
        return;
      }
    } else if (!selection.defaultPrevented && result.category === "sports") {
      const bridge = Object.values(window.__marketAtlasOddsBridges || {})[0];
      if (bridge?.revealMarket?.(result)) {
        setOpen(false);
        input.blur();
        return;
      }
    }
    if (!selection.defaultPrevented && result.url) window.open(result.url, "_blank", "noopener,noreferrer");
    setOpen(false);
    input.blur();
  }

  function renderPayload(payload) {
    currentResults = Array.isArray(payload.results) ? payload.results : [];
    const shown = currentResults.length;
    const countLabel = payload.total > shown ? `${shown} of ${payload.total}` : String(payload.total || 0);
    const inventory = [
      payload.locationTotal ? `${payload.locationTotal} place${payload.locationTotal === 1 ? "" : "s"}` : null,
      payload.marketTotal ? `${payload.marketTotal} market${payload.marketTotal === 1 ? "" : "s"}` : null
    ].filter(Boolean).join(" · ") || `${countLabel} result${payload.total === 1 ? "" : "s"}`;
    context.innerHTML = `<strong>${inventory}</strong><span>${payload.interpretation?.context || "Best matches"}</span>`;
    results.replaceChildren();
    if (!shown) {
      const empty = document.createElement("div");
      empty.className = "market-search-empty";
      empty.textContent = "No matching live markets yet. Try fewer words or a broader date.";
      results.appendChild(empty);
      return;
    }
    currentResults.forEach((result, index) => {
      const button = document.createElement("button");
      button.className = `market-search-result${result.type === "location" ? " is-location" : ""}`;
      button.type = "button";
      button.dataset.resultIndex = String(index);
      button.setAttribute("role", "option");
      button.id = `${instance}-result-${index}`;
      const heading = document.createElement("span");
      heading.className = "market-search-result-heading";
      const title = document.createElement("span");
      title.className = "market-search-result-title";
      title.textContent = result.title;
      const volume = document.createElement("span");
      volume.className = "market-search-result-volume";
      volume.textContent = result.type === "location" ? "OPEN MAP" : `${compactVolume(result.volume)} vol`;
      heading.append(title, volume);
      const meta = document.createElement("span");
      meta.className = "market-search-result-meta";
      const category = document.createElement("span");
      category.className = "market-search-result-category";
      category.textContent = result.type === "location" ? "MAP"
        : result.category === "politics" ? "POL"
          : result.category === "weather" ? "WX"
            : result.seriesTicker?.replace(/^KX/, "").replace(/GAME$/, "") || "SPORT";
      const reason = document.createElement("span");
      reason.className = "market-search-result-reason";
      reason.textContent = result.type === "location"
        ? [result.subtitle, result.matchReason].filter(Boolean).join(" · ")
        : result.matchReason || result.subtitle || result.eventTicker;
      meta.append(category, reason);
      const prices = document.createElement("span");
      prices.className = "market-search-prices";
      for (const outcome of result.outcomes || []) {
        const chip = document.createElement("span");
        chip.className = "market-search-price";
        const name = document.createElement("span");
        name.textContent = outcome.name;
        const price = document.createElement("strong");
        price.textContent = priceLabel(outcome.price);
        chip.append(name, price);
        prices.appendChild(chip);
      }
      button.append(heading, meta);
      if (prices.childElementCount) button.appendChild(prices);
      button.addEventListener("click", () => activateResult(result));
      results.appendChild(button);
    });
  }

  async function runSearch(value) {
    const query = String(value || "").trim();
    setOpen(true);
    if (query.length < 2) {
      controller?.abort();
      renderSuggestions();
      return;
    }
    const sequence = ++requestSequence;
    controller?.abort();
    controller = new AbortController();
    context.innerHTML = '<strong>Reading your query</strong><span class="market-search-loading" aria-label="Searching"></span>';
    try {
      const activeCategory = shell.closest(".integration-shell")?.dataset.activeCategory || "sports";
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=12&active=${encodeURIComponent(activeCategory)}`, {
        headers: { Accept: "application/json" }, signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (sequence !== requestSequence) return;
      if (!response.ok) throw new Error(payload.error || (payload.warming ? "Market index is warming" : `Search returned ${response.status}`));
      renderPayload(payload);
    } catch (error) {
      if (error.name !== "AbortError") renderMessage(error.message, "Try again shortly");
    }
  }

  input.removeAttribute("readonly");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("spellcheck", "false");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", results.id);
  input.setAttribute("aria-expanded", "false");
  input.addEventListener("focus", () => {
    setOpen(true);
    if (input.value.trim().length < 2) renderSuggestions();
  });
  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => void runSearch(input.value), 140);
  });
  input.addEventListener("keydown", event => {
    const buttons = [...results.querySelectorAll(".market-search-result")];
    if (event.key === "ArrowDown" && buttons.length) {
      event.preventDefault();
      buttons[0].focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      input.blur();
    } else if (event.key === "Enter" && currentResults.length) {
      event.preventDefault();
      activateResult(currentResults[0]);
    }
  });
  results.addEventListener("keydown", event => {
    const buttons = [...results.querySelectorAll(".market-search-result")];
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length].focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      input.focus();
      setOpen(false);
    }
  });
  document.addEventListener("pointerdown", event => {
    if (!shell.contains(event.target)) setOpen(false);
  });
}

document.querySelectorAll("[data-market-search]").forEach((shell, index) => setupMarketSearch(shell, `market-search-${index + 1}`));

document.addEventListener("keydown", event => {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
  const input = document.querySelector("[data-market-search] input[type='search']");
  if (!input) return;
  event.preventDefault();
  input.focus();
  input.select();
});
