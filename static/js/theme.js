/* Light / dark / system theme. Preference is kept in this browser only. */
(() => {
  const root = document.documentElement;
  const media = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  const getPref = () => {
    try { return localStorage.getItem("theme-pref") || "system"; }
    catch { return "system"; }
  };
  function apply(pref) {
    const dark = pref === "dark" || (pref === "system" && media && media.matches);
    root.dataset.theme = dark ? "dark" : "light";
    root.dataset.themePref = pref;
    document.querySelectorAll("[data-theme-choice]").forEach((b) => {
      const on = b.dataset.themeChoice === pref;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
    });
  }
  function choose(pref, focus) {
    try { localStorage.setItem("theme-pref", pref); } catch { /* storage unavailable: apply for this page only */ }
    apply(pref);
    if (focus) document.querySelector(`[data-theme-choice="${pref}"]`)?.focus();
  }
  document.querySelectorAll(".theme-switch").forEach((group) => {
    const buttons = [...group.querySelectorAll("[data-theme-choice]")];
    buttons.forEach((b, i) => {
      b.addEventListener("click", () => choose(b.dataset.themeChoice));
      b.addEventListener("keydown", (e) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
        e.preventDefault();
        const step = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
        choose(buttons[(i + step + buttons.length) % buttons.length].dataset.themeChoice, true);
      });
    });
  });
  media?.addEventListener?.("change", () => { if (getPref() === "system") apply("system"); });
  apply(getPref());
})();
