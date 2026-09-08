(function () {
  const KEY = "atelier-bridge-favorites";
  const EVENT = "ab:favorites";

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.filter((x) => typeof x === "string" && x) : [];
    } catch {
      return [];
    }
  }

  function write(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { slugs: list } }));
  }

  const HEART_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.2S4 14.8 4 9.5A4.2 4.2 0 0 1 12 6.6a4.2 4.2 0 0 1 8 2.9c0 5.3-8 10.7-8 10.7Z"/></svg>';

  function syncButton(btn) {
    const slug = btn.dataset.favSlug;
    if (!slug) return;
    const on = Favorites.has(slug);
    const mode = btn.dataset.favMode || "toggle";
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");

    if (mode === "remove") {
      btn.setAttribute("aria-label", "Убрать из избранного");
      const label = btn.querySelector(".fav-label");
      if (label) label.textContent = "Убрать";
      return;
    }

    btn.setAttribute("aria-label", on ? "Убрать из избранного" : "В избранное");
    const label = btn.querySelector(".fav-label");
    if (label) label.textContent = on ? "В избранном" : "В избранное";
  }

  const Favorites = {
    list: read,
    has(slug) {
      return read().includes(slug);
    },
    count() {
      return read().length;
    },
    add(slug) {
      if (!slug) return false;
      const list = read();
      if (!list.includes(slug)) {
        list.push(slug);
        write(list);
      }
      return true;
    },
    remove(slug) {
      if (!slug) return false;
      write(read().filter((s) => s !== slug));
      return false;
    },
    toggle(slug) {
      if (!slug) return false;
      return Favorites.has(slug) ? Favorites.remove(slug) : Favorites.add(slug);
    },
    /** Quiet icon for catalog meta row */
    buttonHtml(slug) {
      const on = Favorites.has(slug);
      return `<button type="button" class="fav-btn${on ? " is-active" : ""}" data-fav-slug="${slug}" aria-pressed="${on}" aria-label="${on ? "Убрать из избранного" : "В избранное"}">${HEART_SVG}</button>`;
    },
    /** Text + optional heart for PDP */
    textButtonHtml(slug) {
      const on = Favorites.has(slug);
      return `<button type="button" class="fav-text${on ? " is-active" : ""}" data-fav-slug="${slug}" aria-pressed="${on}" aria-label="${on ? "Убрать из избранного" : "В избранное"}">${HEART_SVG}<span class="fav-label">${on ? "В избранном" : "В избранное"}</span></button>`;
    },
    removeButtonHtml(slug) {
      return `<button type="button" class="fav-remove" data-fav-slug="${slug}" data-fav-mode="remove" aria-label="Убрать из избранного"><span class="fav-label">Убрать</span></button>`;
    },
    syncButtons(root = document) {
      root.querySelectorAll("[data-fav-slug]").forEach(syncButton);
    },
    bind() {
      Favorites.syncButtons(document);
      Favorites.updateHeader();
    },
    updateHeader() {
      const n = Favorites.count();
      document.querySelectorAll(".header-fav-count").forEach((el) => {
        el.textContent = String(n);
        el.hidden = n === 0;
      });
      document.querySelectorAll("[data-fav-count-text]").forEach((el) => {
        if (n === 0) {
          el.textContent = "";
          el.hidden = true;
        } else {
          el.hidden = false;
          el.textContent = n === 1 ? "1 коллекция" : n < 5 ? `${n} коллекции` : `${n} коллекций`;
        }
      });
      document.querySelectorAll(".header-fav").forEach((el) => {
        el.classList.toggle("has-items", n > 0);
      });
    },
    toast(added) {
      let el = document.querySelector(".fav-toast");
      if (!el) {
        el = document.createElement("div");
        el.className = "fav-toast";
        el.setAttribute("role", "status");
        document.body.appendChild(el);
      }
      el.textContent = added ? "В избранном" : "Удалено";
      el.classList.add("is-visible");
      clearTimeout(el._favTimer);
      el._favTimer = setTimeout(() => el.classList.remove("is-visible"), 1400);
    },
  };

  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("[data-fav-slug]");
      if (!btn || !document.contains(btn)) return;
      const slug = btn.dataset.favSlug;
      if (!slug) return;
      e.preventDefault();
      e.stopPropagation();
      const mode = btn.dataset.favMode || "toggle";
      const nowOn = mode === "remove" ? (Favorites.remove(slug), false) : Favorites.toggle(slug);
      Favorites.syncButtons(document);
      Favorites.updateHeader();
      Favorites.toast(nowOn);
    },
    true
  );

  window.AtelierFavorites = Favorites;

  function boot() {
    Favorites.syncButtons(document);
    Favorites.updateHeader();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener(EVENT, () => {
    Favorites.syncButtons(document);
    Favorites.updateHeader();
  });
})();
