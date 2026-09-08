(function () {
  const PAGES = [
    {
      type: "page",
      title: "Уличная мебель",
      blurb: "Каталог outdoor-коллекций",
      href: "outdoor.html",
      keywords: "улица терраса двор outdoor мебель каталог",
    },
    {
      type: "page",
      title: "Для бизнеса",
      blurb: "Комплектация интерьеров под ключ",
      href: "business.html",
      keywords: "бизнес ресторан отель офис комплектация",
    },
    {
      type: "page",
      title: "Индивидуальные изделия",
      blurb: "Мебель, свет и декор на заказ",
      href: "custom.html",
      keywords: "заказ изделие чертёж эскиз размеры",
    },
    {
      type: "page",
      title: "О нас",
      blurb: "Студия Atelier Bridge",
      href: "about.html",
      keywords: "о нас студия atelier bridge",
    },
    {
      type: "page",
      title: "Контакты",
      blurb: "Связаться с нами",
      href: "contacts.html",
      keywords: "контакты связаться заказ",
    },
    {
      type: "page",
      title: "Избранное",
      blurb: "Ваша подборка коллекций",
      href: "favorites.html",
      keywords: "избранное подборка",
    },
  ];

  const CATEGORIES = [
    { title: "Диваны", href: "sofas.html", keywords: "диван мебель" },
    { title: "Стулья", href: "section.html?s=chairs", keywords: "стул мебель" },
    { title: "Кровати", href: "section.html?s=beds", keywords: "кровать мебель" },
    { title: "Шезлонги", href: "section.html?s=loungers", keywords: "шезлонг мебель" },
    { title: "Столы", href: "tables.html", keywords: "стол мебель" },
    { title: "Кабинеты", href: "section.html?s=cabinets", keywords: "кабинет мебель" },
    { title: "Вазы", href: "section.html?s=vases", keywords: "ваза декор" },
    { title: "Арт-объекты", href: "section.html?s=art", keywords: "арт декор" },
    { title: "Люстры", href: "section.html?s=chandeliers", keywords: "люстра свет" },
    { title: "Светильники", href: "section.html?s=lamps", keywords: "светильник свет" },
    { title: "Выключатели", href: "section.html?s=switches", keywords: "выключатель свет" },
    { title: "Тарелки", href: "section.html?s=plates", keywords: "тарелка посуда" },
    { title: "Чашки", href: "section.html?s=cups", keywords: "чашка посуда" },
    { title: "Приборы", href: "section.html?s=cutlery", keywords: "приборы посуда" },
    { title: "Бокалы", href: "section.html?s=glasses", keywords: "бокал посуда" },
    { title: "Сервизы", href: "section.html?s=sets", keywords: "сервиз посуда" },
  ].map((item) => ({
    type: "category",
    title: item.title,
    blurb: "Раздел каталога",
    href: item.href,
    keywords: item.keywords,
  }));

  let catalog = [];
  let loaded = false;

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .trim();
  }

  function haystack(item) {
    return normalize(
      [item.title, item.blurb, item.material, item.keywords, ...(item.models || [])].join(" ")
    );
  }

  function score(item, query) {
    const h = haystack(item);
    const q = normalize(query);
    if (!q) return 0;
    if (normalize(item.title) === q) return 100;
    if (normalize(item.title).startsWith(q)) return 80;
    if (h.includes(q)) return 60;
    const parts = q.split(/\s+/).filter(Boolean);
    if (!parts.length) return 0;
    const hits = parts.filter((p) => h.includes(p)).length;
    return hits === parts.length ? 40 + hits : hits ? 20 + hits : 0;
  }

  async function loadCatalog() {
    if (loaded) return catalog;
    try {
      const res = await fetch("assets/outdoor/products.json", { cache: "no-store" });
      if (!res.ok) throw new Error("catalog");
      const products = await res.json();
      const mapProduct = (p, section, hrefBase, keywords) => ({
        type: "product",
        title: p.title,
        blurb: p.short || p.material || section,
        material: p.material || "",
        models: Array.isArray(p.models) ? p.models : [],
        href: `${hrefBase}?slug=${encodeURIComponent(p.slug)}`,
        image: (p.cover || "").split("?")[0],
        keywords: `${keywords} ${p.slug || ""}`,
      });
      catalog = products.map((p) => mapProduct(p, "Уличная мебель", "outdoor-item.html", "уличная мебель outdoor"));
      try {
        const sofasRes = await fetch("assets/sofas/products.json", { cache: "no-store" });
        if (sofasRes.ok) {
          const sofas = await sofasRes.json();
          catalog = catalog.concat(
            sofas.map((p) => mapProduct(p, "Диваны", "sofas-item.html", "диван sofa"))
          );
        }
      } catch {
        /* sofas catalog is optional */
      }
    } catch {
      catalog = [];
    }
    loaded = true;
    return catalog;
  }

  function allItems() {
    return [...catalog, ...PAGES, ...CATEGORIES];
  }

  function search(query) {
    const q = normalize(query);
    if (!q) return [];
    return allItems()
      .map((item) => ({ item, s: score(item, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.item.title.localeCompare(b.item.title, "ru"))
      .slice(0, 12)
      .map((x) => x.item);
  }

  function typeLabel(type) {
    if (type === "product") return "Коллекция";
    if (type === "category") return "Раздел";
    return "Страница";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderResults(list, query) {
    const root = document.getElementById("site-search-results");
    if (!root) return;

    if (!normalize(query)) {
      root.innerHTML = `
        <p class="site-search-hint">Начните вводить название коллекции, раздел или страницу.</p>
        <div class="site-search-suggestions">
          <button type="button" data-suggest="Cast">Cast</button>
          <button type="button" data-suggest="уличная">Уличная мебель</button>
          <button type="button" data-suggest="бизнес">Для бизнеса</button>
          <button type="button" data-suggest="свет">Свет</button>
        </div>`;
      return;
    }

    if (!list.length) {
      root.innerHTML = `<p class="site-search-empty">Ничего не найдено по запросу «${escapeHtml(query)}»</p>`;
      return;
    }

    root.innerHTML = list
      .map((item) => {
        const thumb = item.image
          ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy">`
          : `<span class="site-search-fallback" aria-hidden="true"></span>`;
        return `<a class="site-search-row" href="${escapeHtml(item.href)}">
          <span class="site-search-thumb">${thumb}</span>
          <span class="site-search-meta">
            <span class="site-search-kicker">${typeLabel(item.type)}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <em>${escapeHtml(item.blurb)}</em>
          </span>
        </a>`;
      })
      .join("");
  }

  function ensureOverlay() {
    let panel = document.getElementById("site-search");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "site-search";
    panel.className = "site-search";
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML = `
      <div class="site-search-scrim" data-search-close></div>
      <div class="site-search-panel" role="dialog" aria-modal="true" aria-label="Поиск по сайту">
        <div class="site-search-bar">
          <svg class="site-search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16.2 16.2 4.3 4.3"/></svg>
          <input id="site-search-input" type="search" autocomplete="off" spellcheck="false" placeholder="Поиск коллекций и разделов" aria-label="Поиск">
          <button class="site-search-close" type="button" data-search-close aria-label="Закрыть">Закрыть</button>
        </div>
        <div id="site-search-results" class="site-search-results"></div>
      </div>`;
    document.body.appendChild(panel);
    return panel;
  }

  function openSearch() {
    const panel = ensureOverlay();
    const input = document.getElementById("site-search-input");
    const btn = document.querySelector(".header-search");
    document.body.classList.add("search-open");
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    if (btn) btn.setAttribute("aria-expanded", "true");
    renderResults([], "");
    loadCatalog().then(() => {
      if (input && input.value) renderResults(search(input.value), input.value);
    });
    requestAnimationFrame(() => input && input.focus());
  }

  function closeSearch() {
    const panel = document.getElementById("site-search");
    const btn = document.querySelector(".header-search");
    document.body.classList.remove("search-open");
    if (panel) {
      panel.classList.remove("is-open");
      panel.setAttribute("aria-hidden", "true");
    }
    if (btn) {
      btn.setAttribute("aria-expanded", "false");
      btn.focus();
    }
  }

  function bind() {
    const btn = document.querySelector(".header-search");
    if (!btn) return;
    const panel = ensureOverlay();
    const input = document.getElementById("site-search-input");

    btn.addEventListener("click", () => {
      if (document.body.classList.contains("search-open")) closeSearch();
      else openSearch();
    });

    panel.addEventListener("click", (event) => {
      if (event.target.closest("[data-search-close]")) closeSearch();
      const suggest = event.target.closest("[data-suggest]");
      if (suggest && input) {
        input.value = suggest.getAttribute("data-suggest") || "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
      }
    });

    let timer = 0;
    input.addEventListener("input", () => {
      const value = input.value;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        loadCatalog().then(() => renderResults(search(value), value));
      }, 80);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.body.classList.contains("search-open")) {
        event.preventDefault();
        closeSearch();
      }
      if (
        (event.key === "/" || (event.key === "k" && (event.metaKey || event.ctrlKey))) &&
        !event.target.closest("input, textarea, [contenteditable]")
      ) {
        event.preventDefault();
        openSearch();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
