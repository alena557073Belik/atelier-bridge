const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -7% 0px" }
);

document.querySelectorAll(".reveal").forEach((element, index) => {
  element.style.transitionDelay = `${Math.min((index % 4) * 70, 210)}ms`;
  revealObserver.observe(element);
});

const menuButton = document.querySelector(".menu-toggle");
const menu = document.querySelector(".main-menu");
const pageContent = document.querySelector("main");

function closeNavDropdowns() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    const dropdown = item._dropdownEl || item.querySelector(".dropdown");
    if (dropdown && item._dropdownAnchor) {
      item._dropdownAnchor.parentNode.insertBefore(dropdown, item._dropdownAnchor.nextSibling);
      dropdown.classList.remove("dropdown--mobile-active");
      dropdown.style.top = "";
    }
    item.classList.remove("is-open");
    item.querySelector(".nav-trigger")?.setAttribute("aria-expanded", "false");
    item._dropdownEl = null;
  });
  document.body.classList.remove("nav-dropdown-open");
}

function openMobileDropdown(item, trigger) {
  const dropdown = item.querySelector(".dropdown");
  if (!dropdown) return;

  if (!item._dropdownAnchor) {
    item._dropdownAnchor = document.createComment("dropdown-anchor");
    dropdown.parentNode.insertBefore(item._dropdownAnchor, dropdown);
  }

  item._dropdownEl = dropdown;
  dropdown.classList.add("dropdown--mobile-active");
  document.body.appendChild(dropdown);

  const headerBottom = document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 104;
  dropdown.style.top = `${headerBottom}px`;

  item.classList.add("is-open");
  trigger.setAttribute("aria-expanded", "true");
  document.body.classList.add("nav-dropdown-open");
}

function toggleNavItem(item, trigger) {
  const isMobileNav = window.matchMedia("(max-width: 900px)").matches;
  const willOpen = !item.classList.contains("is-open");
  closeNavDropdowns();
  if (menu?.classList.contains("open")) {
    menu.classList.remove("open");
    document.body.classList.remove("menu-open");
    if (pageContent) pageContent.inert = false;
    menu.setAttribute("aria-hidden", "true");
    menuButton?.setAttribute("aria-expanded", "false");
    if (menuButton) menuButton.querySelector("span").textContent = "Меню";
    document.querySelectorAll(".acc-item").forEach((acc) => {
      acc.classList.remove("open");
      acc.querySelector(".acc-trigger")?.setAttribute("aria-expanded", "false");
    });
  }
  if (willOpen) {
    if (isMobileNav) openMobileDropdown(item, trigger);
    else {
      item.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
    }
  }
  navCloseLockUntil = Date.now() + 450;
}

let navCloseLockUntil = 0;
let navTouchHandled = false;

function closeMenu() {
  if (!menu || !menuButton) return;
  menu.classList.remove("open");
  document.body.classList.remove("menu-open");
  if (pageContent) pageContent.inert = false;
  menu.setAttribute("aria-hidden", "true");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.querySelector("span").textContent = "Меню";
  document.querySelectorAll(".acc-item").forEach((item) => {
    item.classList.remove("open");
    item.querySelector(".acc-trigger")?.setAttribute("aria-expanded", "false");
  });
  closeNavDropdowns();
}

if (menuButton && menu) {
  menuButton.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");
    document.body.classList.toggle("menu-open", isOpen);
    if (pageContent) pageContent.inert = isOpen;
    menu.setAttribute("aria-hidden", String(!isOpen));
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.querySelector("span").textContent = isOpen ? "Закрыть" : "Меню";
    if (isOpen) closeNavDropdowns();
    if (!isOpen) closeMenu();
  });

  menu.addEventListener("click", (event) => {
    if (event.target === menu) closeMenu();
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => closeMenu());
  });
}

document.querySelectorAll(".acc-trigger").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.parentElement;
    const wasOpen = item.classList.contains("open");
    document.querySelectorAll(".acc-item").forEach((el) => {
      el.classList.remove("open");
      el.querySelector(".acc-trigger")?.setAttribute("aria-expanded", "false");
    });
    if (!wasOpen) {
      item.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
    }
  });
});

document.querySelectorAll(".nav-item").forEach((item) => {
  const trigger = item.querySelector(".nav-trigger");
  if (!trigger) return;

  const isMobileNav = () => window.matchMedia("(max-width: 900px)").matches;

  trigger.addEventListener("touchend", (event) => {
    if (!isMobileNav()) return;
    event.preventDefault();
    event.stopPropagation();
    navTouchHandled = true;
    toggleNavItem(item, trigger);
    window.setTimeout(() => {
      navTouchHandled = false;
    }, 500);
  }, { passive: false });

  trigger.addEventListener("click", (event) => {
    if (!isMobileNav()) return;
    if (navTouchHandled) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    toggleNavItem(item, trigger);
  });

  item.addEventListener("mouseenter", () => {
    if (isMobileNav()) return;
    trigger.setAttribute("aria-expanded", "true");
  });
  item.addEventListener("mouseleave", () => {
    if (isMobileNav()) return;
    trigger.setAttribute("aria-expanded", "false");
  });
  item.addEventListener("focusin", () => {
    if (isMobileNav()) return;
    trigger.setAttribute("aria-expanded", "true");
  });
  item.addEventListener("focusout", (event) => {
    if (isMobileNav()) return;
    if (!item.contains(event.relatedTarget)) trigger.setAttribute("aria-expanded", "false");
  });
});

document.addEventListener("click", (event) => {
  if (Date.now() < navCloseLockUntil) return;
  if (event.target.closest(".dropdown--mobile-active")) return;
  if (event.target.closest(".nav-trigger")) return;
  closeNavDropdowns();
});

document.addEventListener("touchend", (event) => {
  if (Date.now() < navCloseLockUntil) return;
  if (event.target.closest(".dropdown--mobile-active")) return;
  if (event.target.closest(".nav-trigger")) return;
  if (!document.body.classList.contains("nav-dropdown-open")) return;
  closeNavDropdowns();
}, { passive: true });

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeNavDropdowns();
});

const range = document.getElementById("compareRange");
const afterScene = document.getElementById("afterScene");
const handle = document.getElementById("compareHandle");

function updateComparison(value) {
  if (!afterScene || !handle) return;
  afterScene.style.width = `${value}%`;
  handle.style.left = `${value}%`;
}

if (range) {
  range.addEventListener("input", (event) => updateComparison(event.target.value));
}

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("roomUpload");
const beforeImage = document.querySelector(".scene-before img");

if (dropZone && fileInput && beforeImage) {
  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("dragging");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    const [file] = event.dataTransfer.files;
    if (file?.type.startsWith("image/")) setUploadedImage(file);
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) setUploadedImage(fileInput.files[0]);
  });

  function setUploadedImage(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      beforeImage.src = event.target.result;
      dropZone.querySelector("strong").innerHTML = "Фото загружено.<br>Готово к синтезу";
      dropZone.querySelector("small").textContent = file.name.toUpperCase();
    };
    reader.readAsDataURL(file);
  }
}

const generateButton = document.getElementById("generateButton");
if (generateButton) {
  generateButton.addEventListener("click", () => {
    generateButton.classList.add("processing");
    generateButton.firstChild.textContent = "АНАЛИЗ ПРОСТРАНСТВА... ";
    updateComparison(0);
    setTimeout(() => updateComparison(54), 650);
    setTimeout(() => {
      generateButton.classList.remove("processing");
      generateButton.firstChild.textContent = "ГОТОВО / СРАВНИТЬ ";
    }, 1500);
  });
}

const prompt = document.getElementById("emotionPrompt");
const projectUpload = document.getElementById("projectUpload");
const projectUploadLabel = document.getElementById("projectUploadLabel");
const createProjectButton = document.getElementById("createProjectButton");

if (projectUpload && projectUploadLabel) {
  projectUpload.addEventListener("change", () => {
    const count = projectUpload.files.length;
    if (!count) return;
    projectUploadLabel.querySelector("span").textContent =
      count === 1 ? `Загружен: ${projectUpload.files[0].name}` : `Загружено файлов: ${count}`;
    projectUploadLabel.querySelector("b").textContent = "✓";
  });
}

if (createProjectButton && prompt) {
  createProjectButton.addEventListener("click", () => {
    prompt.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    setTimeout(() => {
      prompt.value = "";
      prompt.placeholder = "Опишите помещение, привычки и желаемое настроение";
      prompt.focus();
    }, reducedMotion ? 0 : 650);
  });
}

if (prompt) {
  document.querySelectorAll(".prompt-suggestions button").forEach((button) => {
    button.addEventListener("click", () => {
      prompt.value = button.textContent;
      prompt.focus();
    });
  });

  const promptSubmit = document.querySelector(".prompt-line button");
  if (promptSubmit) {
    promptSubmit.addEventListener("click", () => {
      if (!prompt.value.trim()) {
        prompt.focus();
        return;
      }
      const original = prompt.value;
      prompt.value = "ИИ подбирает материалы и предметы…";
      prompt.disabled = true;
      setTimeout(() => {
        prompt.disabled = false;
        prompt.value = original;
        promptSubmit.textContent = "✓";
        setTimeout(() => (promptSubmit.textContent = "↗"), 1600);
      }, 1200);
    });
  }
}

document.querySelectorAll(".filter-bar button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".filter-bar button.active")?.classList.remove("active");
    button.classList.add("active");
  });
});

if (!reducedMotion && window.matchMedia("(pointer:fine)").matches) {
  let dot = document.querySelector(".cursor-dot");
  let ring = document.querySelector(".cursor-ring");

  if (!dot) {
    dot = document.createElement("div");
    dot.className = "cursor-dot";
    dot.setAttribute("aria-hidden", "true");
  }
  if (!ring) {
    ring = document.createElement("div");
    ring.className = "cursor-ring";
    ring.setAttribute("aria-hidden", "true");
  }
  document.documentElement.append(dot, ring);

  const wide = window.matchMedia("(min-width: 901px)");
  const setEnabled = () => {
    document.documentElement.classList.toggle("has-cursor", wide.matches);
    if (!wide.matches) {
      dot.classList.remove("is-on");
      ring.classList.remove("is-on");
    }
  };
  setEnabled();
  wide.addEventListener("change", setEnabled);

  let mouseX = 0;
  let mouseY = 0;
  let ringX = 0;
  let ringY = 0;
  let placed = false;
  const interactive = "a, button, input, label, select, textarea, .nav-trigger, .fav-btn, .fav-text, .fav-remove, .menu-toggle, .header-search";

  const place = (x, y, snap) => {
    mouseX = x;
    mouseY = y;
    if (snap || !placed) {
      ringX = x;
      ringY = y;
      placed = true;
    }
    dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  };

  const show = (on) => {
    if (!wide.matches) return;
    dot.classList.toggle("is-on", on);
    ring.classList.toggle("is-on", on);
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      place(event.clientX, event.clientY, false);
      show(true);
    },
    { passive: true }
  );

  document.addEventListener("pointerleave", () => show(false));
  window.addEventListener("blur", () => show(false));

  const animateCursor = () => {
    ringX += (mouseX - ringX) * 0.55;
    ringY += (mouseY - ringY) * 0.55;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(animateCursor);
  };
  animateCursor();

  document.addEventListener("mouseover", (event) => {
    if (event.target.closest(interactive)) ring.classList.add("active");
  });
  document.addEventListener("mouseout", (event) => {
    const from = event.target.closest(interactive);
    if (!from) return;
    const to = event.relatedTarget && event.relatedTarget.closest?.(interactive);
    if (!to) ring.classList.remove("active");
  });

  const parallaxItems = document.querySelectorAll("[data-parallax]");
  window.addEventListener(
    "scroll",
    () => {
      parallaxItems.forEach((item) => {
        const rect = item.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          const speed = Number(item.dataset.parallax);
          const offset = (window.innerHeight / 2 - rect.top - rect.height / 2) * speed;
          const target = item.querySelector("img, .hero-stone") || item;
          target.style.transform = `scale(1.1) translate3d(0, ${offset}px, 0)`;
        }
      });
    },
    { passive: true }
  );
}
