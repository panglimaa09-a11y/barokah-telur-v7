(() => {
  "use strict";

  const toggle = document.getElementById("navToggle");
  const topbar = document.querySelector(".topbar");
  const nav = document.querySelector(".topbar nav");

  if (!toggle || !topbar || !nav) return;

  const closeMenu = () => {
    topbar.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.setAttribute("aria-expanded", "false");
  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const open = topbar.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => closeMenu());
  });

  document.addEventListener("click", (event) => {
    if (!topbar.contains(event.target)) closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeMenu();
  });

  window.addEventListener("hashchange", () => closeMenu());
})();
