(function () {
  const STORAGE_KEY = "theme";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  function initTheme() {
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    toggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
    });

    mediaQuery.addEventListener("change", (event) => {
      if (localStorage.getItem(STORAGE_KEY)) return;
      applyTheme(event.matches ? "dark" : "light");
    });
  }

  window.Blog = window.Blog || {};
  window.Blog.initTheme = initTheme;
})();
