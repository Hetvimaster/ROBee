/* ScanQuest — player app
   Free-to-host, fully client-side. Reads hunt config from data/hunt.json
   (or a localStorage override written by admin.html in test mode),
   scans QR markers with the device camera via html5-qrcode, and
   walks the player through the clue sequence to a final win screen. */

(() => {
  const PROGRESS_KEY = "scanquest_progress_v1";
  const OVERRIDE_KEY = "scanquest_hunt_override_v1";

  const el = (id) => document.getElementById(id);
  const screens = {
    intro: el("screen-intro"),
    scan: el("screen-scan"),
    win: el("screen-win"),
  };

  let hunt = null;
  let progress = { index: 0 };
  let scanner = null;
  let scannerRunning = false;
  let awaitingContinue = false;

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function toast(msg) {
    const t = el("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2400);
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) progress = JSON.parse(raw);
    } catch (e) { /* ignore corrupt state */ }
  }

  function saveProgress() {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  function resetProgress() {
    progress = { index: 0 };
    saveProgress();
  }

  async function loadHunt() {
    const override = localStorage.getItem(OVERRIDE_KEY);
    if (override) {
      try {
        el("topbar-stamp").textContent = "TEST MODE";
        return JSON.parse(override);
      } catch (e) { /* fall through to fetch */ }
    }
    const res = await fetch("data/hunt.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load hunt.json");
    return res.json();
  }

  function renderIntro() {
    el("hunt-title").textContent = hunt.title || "ScanQuest";
    el("hunt-blurb").textContent = hunt.intro || "Find each marker and scan it to continue.";
    const resumeNote = el("resume-note");
    const resetBtn = el("btn-reset");
    if (progress.index > 0 && progress.index < hunt.stops.length) {
      resumeNote.style.display = "block";
      resumeNote.textContent = `Resuming — ${progress.index} of ${hunt.stops.length} markers found.`;
      resetBtn.style.display = "inline-block";
    } else {
      resumeNote.style.display = "none";
      resetBtn.style.display = "none";
    }
  }

  function updateScanHeader() {
    const total = hunt.stops.length;
    const current = Math.min(progress.index + 1, total);
    el("scan-eyebrow").textContent = `Marker ${current} of ${total}`;
    el("found-count").textContent = `${progress.index} found`;
  }

  function setStatus(msg, kind) {
    const s = el("scan-status");
    s.textContent = msg;
    s.className = "scan-status" + (kind ? " " + kind : "");
  }

  async function startScanner() {
    if (scannerRunning) return;
    setStatus("Requesting camera…");
    scanner = new Html5Qrcode("qr-reader", { verbose: false });
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        onScanSuccess,
        () => {} // per-frame decode failures are expected; ignore
      );
      scannerRunning = true;
      setStatus("Point the camera at the marker.");
    } catch (err) {
      setStatus("Camera unavailable — use manual entry below.", "err");
    }
  }

  async function stopScanner() {
    if (scanner && scannerRunning) {
      try { await scanner.stop(); await scanner.clear(); } catch (e) { /* ignore */ }
    }
    scannerRunning = false;
  }

  function onScanSuccess(decodedText) {
    if (awaitingContinue) return;
    handleCode(decodedText);
  }

  function handleCode(rawCode) {
    if (awaitingContinue) return;
    const code = (rawCode || "").trim();
    const expected = hunt.stops[progress.index];
    if (!expected) return;

    if (code.toLowerCase() === expected.qrValue.trim().toLowerCase()) {
      awaitingContinue = true;
      setStatus("Marker confirmed.", "ok");
      revealClue(expected);
    } else {
      setStatus("That marker doesn't match this stop. Keep looking.", "err");
    }
  }

  function revealClue(stop) {
    el("clue-num").textContent = String(progress.index + 1);
    el("clue-text").textContent = stop.clue || "(No clue text was set for this stop.)";
    el("clue-overlay").classList.add("active");
  }

  async function onClueContinue() {
    el("clue-overlay").classList.remove("active");
    awaitingContinue = false;
    progress.index += 1;
    saveProgress();

    if (progress.index >= hunt.stops.length) {
      await stopScanner();
      renderWin();
      showScreen("win");
    } else {
      updateScanHeader();
      setStatus("Point the camera at the next marker.");
    }
  }

  function renderWin() {
    el("win-title").textContent = hunt.winTitle || "Case Closed";
    el("win-message").textContent = hunt.winMessage || "You found every marker.";
  }

  async function beginHunt() {
    if (progress.index >= hunt.stops.length) resetProgress();
    showScreen("scan");
    updateScanHeader();
    await startScanner();
  }

  el("btn-start").addEventListener("click", beginHunt);

  el("btn-reset").addEventListener("click", () => {
    resetProgress();
    renderIntro();
    toast("Progress reset.");
  });

  el("btn-quit").addEventListener("click", async () => {
    await stopScanner();
    renderIntro();
    showScreen("intro");
  });

  el("btn-manual-submit").addEventListener("click", () => {
    const input = el("manual-code");
    if (input.value.trim()) {
      handleCode(input.value);
      input.value = "";
    }
  });
  el("manual-code").addEventListener("keydown", (e) => {
    if (e.key === "Enter") el("btn-manual-submit").click();
  });

  el("btn-clue-continue").addEventListener("click", onClueContinue);

  el("btn-play-again").addEventListener("click", async () => {
    resetProgress();
    renderIntro();
    showScreen("intro");
  });

  (async function init() {
    loadProgress();
    try {
      hunt = await loadHunt();
      if (!hunt.stops || !hunt.stops.length) throw new Error("Hunt has no stops");
      renderIntro();
    } catch (err) {
      el("hunt-title").textContent = "Hunt not found";
      el("hunt-blurb").textContent = "Ask the organizer to set up the hunt in the admin panel.";
      el("btn-start").disabled = true;
    }
  })();
})();
