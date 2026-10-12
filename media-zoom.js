/**
 * Atelier Bridge — product / catalog image zoom
 * Desktop: cursor-tracked in-frame zoom (fine pointer)
 * Touch: fullscreen lightbox with pinch + double-tap + pan
 */
(function () {
  "use strict";

  const FINE = window.matchMedia("(hover: hover) and (pointer: fine)");
  const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)");
  const DESKTOP_SCALE = 2.35;
  const LB_MIN = 1;
  const LB_MAX = 4;
  const DOUBLE_TAP_MS = 280;

  let lightbox = null;
  let lbState = null;

  function prefersFine() {
    return FINE.matches && !REDUCE.matches;
  }

  function ensureLightbox() {
    if (lightbox) return lightbox;
    const root = document.createElement("div");
    root.className = "az-lightbox";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Просмотр фото");
    root.innerHTML = `
      <button type="button" class="az-lightbox-close" aria-label="Закрыть">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
      <button type="button" class="az-lightbox-nav az-lightbox-prev" aria-label="Предыдущее фото">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>
      </button>
      <button type="button" class="az-lightbox-nav az-lightbox-next" aria-label="Следующее фото">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
      </button>
      <div class="az-lightbox-stage">
        <img class="az-lightbox-img" alt="" draggable="false">
      </div>
      <p class="az-lightbox-hint" aria-hidden="true">Дважды нажмите или сведите пальцы для увеличения</p>
      <p class="az-lightbox-counter" hidden></p>
    `;
    document.body.appendChild(root);
    lightbox = root;

    root.querySelector(".az-lightbox-close").addEventListener("click", closeLightbox);
    root.querySelector(".az-lightbox-prev").addEventListener("click", () => stepLightbox(-1));
    root.querySelector(".az-lightbox-next").addEventListener("click", () => stepLightbox(1));
    root.addEventListener("click", (e) => {
      if (e.target === root || e.target.classList.contains("az-lightbox-stage")) closeLightbox();
    });
    document.addEventListener("keydown", onLightboxKey);
    bindLightboxGestures(root);
    return root;
  }

  function onLightboxKey(e) {
    if (!lightbox || lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  }

  function applyLbTransform() {
    if (!lbState) return;
    const img = lightbox.querySelector(".az-lightbox-img");
    const { x, y, scale } = lbState;
    img.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    lightbox.classList.toggle("is-zoomed", scale > 1.02);
  }

  function resetLbTransform() {
    if (!lbState) return;
    lbState.scale = 1;
    lbState.x = 0;
    lbState.y = 0;
    applyLbTransform();
  }

  function clampPan() {
    if (!lbState || lbState.scale <= 1) {
      if (lbState) {
        lbState.x = 0;
        lbState.y = 0;
      }
      return;
    }
    const img = lightbox.querySelector(".az-lightbox-img");
    const stage = lightbox.querySelector(".az-lightbox-stage");
    const sr = stage.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    // After transform, getBoundingClientRect includes scale; use natural layout size
    const nw = img.offsetWidth * lbState.scale;
    const nh = img.offsetHeight * lbState.scale;
    const maxX = Math.max(0, (nw - sr.width) / 2);
    const maxY = Math.max(0, (nh - sr.height) / 2);
    lbState.x = Math.min(maxX, Math.max(-maxX, lbState.x));
    lbState.y = Math.min(maxY, Math.max(-maxY, lbState.y));
  }

  function bindLightboxGestures(root) {
    const stage = root.querySelector(".az-lightbox-stage");
    const img = root.querySelector(".az-lightbox-img");
    let pointers = new Map();
    let pinchStartDist = 0;
    let pinchStartScale = 1;
    let panStart = null;
    let lastTap = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    function dist(a, b) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.hypot(dx, dy);
    }

    stage.addEventListener("pointerdown", (e) => {
      if (!lbState) return;
      stage.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        pinchStartDist = dist(pts[0], pts[1]);
        pinchStartScale = lbState.scale;
        panStart = null;
      } else if (pointers.size === 1 && lbState.scale > 1.02) {
        panStart = { x: e.clientX, y: e.clientY, ox: lbState.x, oy: lbState.y };
      }
    });

    stage.addEventListener("pointermove", (e) => {
      if (!lbState || !pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const d = dist(pts[0], pts[1]);
        if (pinchStartDist > 0) {
          lbState.scale = Math.min(LB_MAX, Math.max(LB_MIN, pinchStartScale * (d / pinchStartDist)));
          if (lbState.scale <= 1.02) {
            lbState.scale = 1;
            lbState.x = 0;
            lbState.y = 0;
          }
          clampPan();
          applyLbTransform();
        }
      } else if (panStart && lbState.scale > 1.02) {
        lbState.x = panStart.ox + (e.clientX - panStart.x);
        lbState.y = panStart.oy + (e.clientY - panStart.y);
        clampPan();
        applyLbTransform();
      }
    });

    function endPointer(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStartDist = 0;
      if (pointers.size === 0) panStart = null;
    }

    stage.addEventListener("pointerup", endPointer);
    stage.addEventListener("pointercancel", endPointer);

    stage.addEventListener("click", (e) => {
      if (!lbState) return;
      // Ignore click that was a drag/pinch
      const now = Date.now();
      const dt = now - lastTap;
      const dx = Math.abs(e.clientX - lastTapX);
      const dy = Math.abs(e.clientY - lastTapY);
      if (dt < DOUBLE_TAP_MS && dx < 28 && dy < 28) {
        e.preventDefault();
        e.stopPropagation();
        if (lbState.scale > 1.05) {
          resetLbTransform();
        } else {
          const rect = stage.getBoundingClientRect();
          const cx = e.clientX - rect.left - rect.width / 2;
          const cy = e.clientY - rect.top - rect.height / 2;
          lbState.scale = 2.4;
          lbState.x = -cx * (lbState.scale - 1);
          lbState.y = -cy * (lbState.scale - 1);
          clampPan();
          applyLbTransform();
        }
        lastTap = 0;
      } else {
        lastTap = now;
        lastTapX = e.clientX;
        lastTapY = e.clientY;
      }
    });

    // Wheel zoom (desktop lightbox)
    stage.addEventListener(
      "wheel",
      (e) => {
        if (!lbState) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        lbState.scale = Math.min(LB_MAX, Math.max(LB_MIN, lbState.scale * delta));
        if (lbState.scale <= 1.02) resetLbTransform();
        else {
          clampPan();
          applyLbTransform();
        }
      },
      { passive: false }
    );
  }

  function stepLightbox(dir) {
    if (!lbState || !lbState.gallery.length) return;
    const next = (lbState.index + dir + lbState.gallery.length) % lbState.gallery.length;
    showLightboxIndex(next);
  }

  function showLightboxIndex(index) {
    const src = lbState.gallery[index];
    lbState.index = index;
    const img = lightbox.querySelector(".az-lightbox-img");
    img.src = src;
    img.alt = lbState.alt || "";
    resetLbTransform();
    const counter = lightbox.querySelector(".az-lightbox-counter");
    const nav = lbState.gallery.length > 1;
    lightbox.querySelector(".az-lightbox-prev").hidden = !nav;
    lightbox.querySelector(".az-lightbox-next").hidden = !nav;
    if (nav) {
      counter.hidden = false;
      counter.textContent = `${index + 1} / ${lbState.gallery.length}`;
    } else {
      counter.hidden = true;
    }
  }

  function openLightbox({ src, gallery, index = 0, alt = "" }) {
    const root = ensureLightbox();
    const list = gallery && gallery.length ? gallery : [src];
    const i = Math.max(0, list.indexOf(src));
    lbState = { gallery: list, index: i >= 0 ? i : index, alt, scale: 1, x: 0, y: 0 };
    root.hidden = false;
    document.documentElement.classList.add("az-lightbox-open");
    showLightboxIndex(lbState.index);
    root.querySelector(".az-lightbox-close").focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    document.documentElement.classList.remove("az-lightbox-open");
    const img = lightbox.querySelector(".az-lightbox-img");
    img.removeAttribute("src");
    lbState = null;
  }

  function bindDesktopHover(frame, img) {
    if (frame.dataset.azHoverBound) return;
    frame.dataset.azHoverBound = "1";
    frame.classList.add("az-zoomable");

    const onMove = (e) => {
      if (!prefersFine() || !frame.classList.contains("is-zooming")) return;
      const r = frame.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      img.style.transformOrigin = `${x}% ${y}%`;
    };

    const enable = () => {
      if (!prefersFine() || REDUCE.matches) return;
      frame.classList.add("is-zooming");
      img.style.transform = `scale(${DESKTOP_SCALE})`;
    };
    const disable = () => {
      frame.classList.remove("is-zooming");
      img.style.transform = "";
      img.style.transformOrigin = "center center";
    };

    frame.addEventListener("pointerenter", enable);
    frame.addEventListener("pointerleave", disable);
    frame.addEventListener("pointermove", onMove);
  }

  function bindProductMedia(frame, options = {}) {
    if (!frame) return;
    const img = frame.querySelector("img") || options.img;
    if (!img) return;

    frame.classList.add("az-media-frame");
    frame._azOptions = options;
    if (!frame.querySelector(".az-zoom-hint")) {
      const hint = document.createElement("span");
      hint.className = "az-zoom-hint";
      hint.setAttribute("aria-hidden", "true");
      hint.textContent = prefersFine()
        ? "Наведите или нажмите для увеличения"
        : "Нажмите, чтобы увеличить";
      frame.appendChild(hint);
    }

    bindDesktopHover(frame, img);

    if (frame.dataset.azProductBound) return;
    frame.dataset.azProductBound = "1";

    const open = () => {
      const opts = frame._azOptions || {};
      const src = (typeof opts.getSrc === "function" ? opts.getSrc() : null) || img.currentSrc || img.src;
      const gallery =
        typeof opts.getGallery === "function" ? opts.getGallery() : opts.gallery || [src];
      openLightbox({
        src,
        gallery,
        alt: img.alt || "",
      });
    };

    frame.addEventListener("click", (e) => {
      // Desktop: click opens lightbox for deeper zoom; hover already magnifies
      if (e.target.closest("a, button")) return;
      open();
    });

    frame.setAttribute("role", "button");
    frame.setAttribute("tabindex", "0");
    frame.setAttribute("aria-label", "Увеличить фото");
    frame.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  }

  function bindCatalogCard(card) {
    const media = card.querySelector(".catalog-card-media, .favorites-card-media");
    if (!media || media.dataset.azCatalogBound) return;
    media.dataset.azCatalogBound = "1";
    const img = media.querySelector("img");
    if (!img) return;

    media.classList.add("az-catalog-media");

    // Cursor-follow hover zoom on fine pointers (navigation still works via link)
    if (!REDUCE.matches) {
      media.addEventListener("pointermove", (e) => {
        if (!prefersFine()) return;
        const r = media.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        img.style.transformOrigin = `${x}% ${y}%`;
      });
      media.addEventListener("pointerleave", () => {
        img.style.transformOrigin = "center center";
      });
    }

    // Touch: long-press opens zoom without navigating; short tap keeps link
    let pressTimer = null;
    let longPressed = false;
    media.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 1) return;
        longPressed = false;
        const touch = e.touches[0];
        pressTimer = window.setTimeout(() => {
          longPressed = true;
          openLightbox({
            src: img.currentSrc || img.src,
            gallery: [img.currentSrc || img.src],
            alt: img.alt || card.querySelector("h2")?.textContent || "",
          });
        }, 420);
        media._azTouch = { x: touch.clientX, y: touch.clientY };
      },
      { passive: true }
    );
    media.addEventListener(
      "touchmove",
      (e) => {
        if (!pressTimer || !media._azTouch) return;
        const t = e.touches[0];
        if (Math.hypot(t.clientX - media._azTouch.x, t.clientY - media._azTouch.y) > 12) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      },
      { passive: true }
    );
    media.addEventListener("touchend", (e) => {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
      if (longPressed) {
        e.preventDefault();
        const link = media.querySelector("a");
        if (link) {
          // prevent navigation after long-press zoom
          const block = (ev) => {
            ev.preventDefault();
            link.removeEventListener("click", block, true);
          };
          link.addEventListener("click", block, true);
        }
      }
    });
  }

  function bindCatalog(root = document) {
    root.querySelectorAll(".catalog-card, .favorites-card").forEach(bindCatalogCard);
  }

  function bindProductPage(root = document) {
    const frame = root.querySelector(".product-media");
    if (!frame) return;
    const img = frame.querySelector("img#item-media") || frame.querySelector("img");
    if (!img) return;

    const thumbs = root.querySelector("#item-thumbs");
    bindProductMedia(frame, {
      getSrc: () => img.currentSrc || img.src,
      getGallery: () => {
        if (!thumbs) return [img.currentSrc || img.src];
        const list = [...thumbs.querySelectorAll("img")]
          .map((el) => el.currentSrc || el.src)
          .filter(Boolean);
        return list.length ? list : [img.currentSrc || img.src];
      },
    });
  }

  window.AtelierMediaZoom = {
    bindProductPage,
    bindCatalog,
    bindProductMedia,
    open: openLightbox,
    close: closeLightbox,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bindProductPage();
      bindCatalog();
    });
  } else {
    bindProductPage();
    bindCatalog();
  }
})();
