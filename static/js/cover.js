/* Notion-style dashboard cover. Stored per account in this browser's
   localStorage only (no server upload, no DB change). */
(() => {
  const root = document.querySelector(".dash[data-cover-key]");
  const cover = document.getElementById("page-cover");
  const panel = document.getElementById("cover-panel");
  const addButton = document.getElementById("cover-add");
  const fileInput = document.getElementById("cover-file");
  const status = document.getElementById("cover-status");
  if (!root || !cover || !panel) return;

  const key = "dashboard-cover:" + root.dataset.coverKey;
  const MAX_BYTES = 10 * 1024 * 1024;
  const MAX_WIDTH = 1920;
  const PRESETS = [
    { id: "parchment", label: "파치먼트", css: "linear-gradient(180deg,#f5f5f7,#e8e8ed)" },
    { id: "graphite", label: "그래파이트", css: "linear-gradient(135deg,#1d1d1f,#3a3a3c)" },
    { id: "ocean", label: "오션", css: "linear-gradient(135deg,#0066cc,#2997ff)" },
    { id: "dawn", label: "새벽", css: "linear-gradient(135deg,#f7d9c4,#c9d6f2)" },
    { id: "forest", label: "숲", css: "linear-gradient(135deg,#1f4d3a,#7fa88f)" },
    { id: "dusk", label: "노을", css: "linear-gradient(135deg,#3b2a5a,#d9826b)" },
  ];

  const read = () => {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch { return null; }
  };
  const write = (value) => {
    try {
      if (value) localStorage.setItem(key, JSON.stringify(value));
      else localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  };
  const say = (text) => { if (status) status.textContent = text; };

  function render() {
    const state = read();
    if (!state) {
      cover.hidden = true;
      cover.style.backgroundImage = "";
      root.classList.remove("has-cover");
      return;
    }
    const preset = state.type === "preset" && PRESETS.find((p) => p.id === state.value);
    if (state.type === "preset" && !preset) { write(null); render(); return; }
    cover.style.backgroundImage = preset ? preset.css : `url("${state.value}")`;
    cover.style.backgroundPosition = `center ${Number(state.pos ?? 50)}%`;
    cover.hidden = false;
    root.classList.add("has-cover");
    cover.querySelector("[data-cover-reposition]").hidden = !!preset;
  }

  // Preset gallery
  const presetList = panel.querySelector(".cover-presets");
  PRESETS.forEach((p) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cover-preset";
    b.setAttribute("role", "listitem");
    b.style.backgroundImage = p.css;
    b.setAttribute("aria-label", "기본 커버: " + p.label);
    b.title = p.label;
    b.addEventListener("click", () => {
      if (write({ type: "preset", value: p.id, pos: 50 })) { say(p.label + " 커버를 적용했어요."); render(); }
      else say("브라우저 저장 공간을 사용할 수 없어 커버를 저장하지 못했어요.");
    });
    presetList.appendChild(b);
  });

  // Open / close
  let opener = null;
  function openPanel(from) {
    opener = from;
    panel.hidden = false;
    document.querySelectorAll("[data-cover-open]").forEach((b) => b.setAttribute("aria-expanded", "true"));
    panel.querySelector(".cover-preset, button")?.focus();
  }
  function closePanel() {
    panel.hidden = true;
    document.querySelectorAll("[data-cover-open]").forEach((b) => b.setAttribute("aria-expanded", "false"));
    (opener && !opener.closest("[hidden]") ? opener : addButton)?.focus();
  }
  document.querySelectorAll("[data-cover-open]").forEach((b) => {
    b.setAttribute("aria-expanded", "false");
    b.addEventListener("click", () => (panel.hidden ? openPanel(b) : closePanel()));
  });
  panel.querySelector("[data-cover-close]").addEventListener("click", closePanel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) closePanel();
  });
  document.addEventListener("click", (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !e.target.closest("[data-cover-open]")) closePanel();
  });

  // Remove
  panel.querySelector("[data-cover-remove]").addEventListener("click", () => {
    write(null); render(); say("커버를 제거했어요.");
  });

  // Upload: validate, downscale, store as JPEG data URL
  fileInput?.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { say("JPG·PNG·WEBP·GIF 이미지만 사용할 수 있어요."); return; }
    if (file.size > MAX_BYTES) { say("10MB 이하 이미지를 선택해 주세요."); return; }
    say("이미지를 준비하고 있어요…");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      let data = canvas.toDataURL("image/jpeg", 0.85);
      if (data.length > 3_500_000) data = canvas.toDataURL("image/jpeg", 0.7);
      if (write({ type: "image", value: data, pos: 50 })) { render(); say("내 이미지를 커버로 적용했어요. ‘위치 조정’으로 보이는 부분을 바꿀 수 있어요."); }
      else say("이미지가 너무 커서 이 브라우저에 저장하지 못했어요. 더 작은 이미지를 사용해 주세요.");
    };
    img.onerror = () => { URL.revokeObjectURL(url); say("이미지를 읽을 수 없어요. 다른 파일을 선택해 주세요."); };
    img.src = url;
  });

  // Reposition: drag vertically, or arrow keys while active
  const repo = cover.querySelector("[data-cover-reposition]");
  let active = false, startY = 0, startPos = 50;
  function setRepositioning(on) {
    active = on;
    cover.classList.toggle("is-repositioning", on);
    repo.setAttribute("aria-pressed", String(on));
    repo.textContent = on ? "위치 저장" : "위치 조정";
    if (on) say("이미지를 위아래로 끌거나 ↑↓ 키로 위치를 바꾼 뒤 ‘위치 저장’을 누르세요.");
  }
  const currentPos = () => Number((read() || {}).pos ?? 50);
  function setPos(pos) {
    const state = read(); if (!state) return;
    state.pos = Math.max(0, Math.min(100, Math.round(pos)));
    cover.style.backgroundPosition = `center ${state.pos}%`;
    write(state);
  }
  repo.addEventListener("click", () => { setRepositioning(!active); if (!active) say("커버 위치를 저장했어요."); });
  repo.addEventListener("keydown", (e) => {
    if (!active) return;
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      setPos(currentPos() + (e.key === "ArrowUp" ? -5 : 5));
    }
  });
  cover.addEventListener("pointerdown", (e) => {
    if (!active || e.target.closest("button")) return;
    startY = e.clientY; startPos = currentPos();
    cover.setPointerCapture(e.pointerId);
  });
  cover.addEventListener("pointermove", (e) => {
    if (!active || !cover.hasPointerCapture(e.pointerId)) return;
    setPos(startPos - ((e.clientY - startY) / cover.clientHeight) * 100);
  });

  render();
})();
