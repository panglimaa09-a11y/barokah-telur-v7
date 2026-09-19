(() => {
  "use strict";

  // Force-load the dashboard redesign after the legacy inline CSS.
  // This makes the redesign independent of service-worker HTML injection.
  if (!document.querySelector('link[data-dashboard-v5]')) {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = "dashboard-final.css?v=20260917-8";
    style.dataset.dashboardV5 = "true";
    document.head.appendChild(style);
  }

  // Register the service worker so the site is a real installable PWA.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js", { scope: "./" })
        .then(reg => console.log("PWA service worker aktif:", reg.scope))
        .catch(err => console.error("PWA service worker gagal:", err));
    });
  }

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

  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("click", (event) => { if (!topbar.contains(event.target)) closeMenu(); });
  window.addEventListener("resize", () => { if (window.innerWidth > 900) closeMenu(); });
  window.addEventListener("hashchange", closeMenu);

  // Load the opening-cash sync after the navigation code so it also works on cached PWAs.
  if (!document.querySelector('script[data-opening-balance]')) {
    const script = document.createElement("script");
    script.src = "opening-balance.js?v=20260917-1";
    script.dataset.openingBalance = "true";
    document.body.appendChild(script);
  }
})();
