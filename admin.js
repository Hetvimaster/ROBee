/* ScanQuest — admin app
   Edits the hunt config, saves a live test-mode copy to localStorage
   (read by index.html when present), and exports data/hunt.json for
   deployment. Also renders printable QR codes for each marker,
   generated entirely client-side with qrcodejs. */

(() => {
  const OVERRIDE_KEY = "scanquest_hunt_override_v1";
  const el = (id) => document.getElementById(id);

  const DEFAULT_HUNT = {
    title: "ScanQuest",
    intro: "A physical scavenger hunt. Find each marker, scan it, follow the clue.",
    winTitle: "Case Closed",
    winMessage: "You found every marker and cracked the whole route. Nice work, agent.",
    stops: [
      { qrValue: "SCANQUEST-STOP-1", clue: "" },
      { qrValue: "SCANQUEST-STOP-2", clue: "" },
    ],
  };

  let hunt = null;

  function toast(msg) {
    const t = el("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2400);
  }

  function randomSuffix() {
    return Math.random().toString(36).slice(2, 7).toUpperCase();
  }

  function fillForm() {
    el("f-title").value = hunt.title || "";
    el("f-intro").value = hunt.intro || "";
    el("f-win-title").value = hunt.winTitle || "";
    el("f-win-message").value = hunt.winMessage || "";
    renderStops();
    renderQrCodes();
  }

  function readFormIntoHunt() {
    hunt.title = el("f-title").value.trim() || "ScanQuest";
    hunt.intro = el("f-intro").value.trim();
    hunt.winTitle = el("f-win-title").value.trim() || "Case Closed";
    hunt.winMessage = el("f-win-message").value.trim();
    const rows = document.querySelectorAll(".stop-row");
    hunt.stops = Array.from(rows).map((row) => ({
      qrValue: row.querySelector(".f-qr").value.trim(),
      clue: row.querySelector(".f-clue").value.trim(),
    }));
  }

  function renderStops() {
    const list = el("stops-list");
    list.innerHTML = "";
    hunt.stops.forEach((stop, i) => {
      const row = document.createElement("div");
      row.className = "stop-row";
      row.innerHTML = `
        <div class="stop-head">
          <span class="num">MARKER ${i + 1}</span>
          <span class="ops">
            <button class="btn-ghost btn-small" data-act="up" ${i === 0 ? "disabled" : ""}>↑</button>
            <button class="btn-ghost btn-small" data-act="down" ${i === hunt.stops.length - 1 ? "disabled" : ""}>↓</button>
            <button class="btn-danger btn-small" data-act="remove">Remove</button>
          </span>
        </div>
        <div class="field-grid">
          <div>
            <label>Marker code (encoded in this stop's QR)</label>
            <input type="text" class="f-qr" value="${escapeAttr(stop.qrValue)}" />
          </div>
          <div>
            <label>Clue shown after this marker is scanned</label>
            <textarea class="f-clue" placeholder="Where should the player go next?">${escapeHtml(stop.clue)}</textarea>
          </div>
        </div>
      `;
      row.querySelector('[data-act="up"]').addEventListener("click", () => moveStop(i, -1));
      row.querySelector('[data-act="down"]').addEventListener("click", () => moveStop(i, 1));
      row.querySelector('[data-act="remove"]').addEventListener("click", () => removeStop(i));
      list.appendChild(row);
    });
  }

  function escapeHtml(s) {
    return (s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  function moveStop(i, dir) {
    readFormIntoHunt();
    const j = i + dir;
    if (j < 0 || j >= hunt.stops.length) return;
    [hunt.stops[i], hunt.stops[j]] = [hunt.stops[j], hunt.stops[i]];
    renderStops();
    renderQrCodes();
  }

  function removeStop(i) {
    readFormIntoHunt();
    hunt.stops.splice(i, 1);
    renderStops();
    renderQrCodes();
  }

  el("btn-add-stop").addEventListener("click", () => {
    readFormIntoHunt();
    hunt.stops.push({ qrValue: `SCANQUEST-STOP-${hunt.stops.length + 1}-${randomSuffix()}`, clue: "" });
    renderStops();
    renderQrCodes();
  });

  function renderQrCodes() {
    const area = el("print-area");
    area.innerHTML = "";
    hunt.stops.forEach((stop, i) => {
      const card = document.createElement("div");
      card.className = "qr-card";
      const box = document.createElement("div");
      box.className = "qr-box";
      card.appendChild(box);
      const label = document.createElement("div");
      label.className = "qr-label";
      label.textContent = `Marker ${i + 1}: ${stop.qrValue || "(empty code)"}`;
      card.appendChild(label);
      area.appendChild(card);

      if (stop.qrValue) {
        new QRCode(box, {
          text: stop.qrValue,
          width: 140,
          height: 140,
          colorDark: "#221A0F",
          colorLight: "#EDE6D6",
        });
      }
    });
  }

  function validate() {
    const codes = hunt.stops.map((s) => s.qrValue);
    if (hunt.stops.length === 0) return "Add at least one marker.";
    if (codes.some((c) => !c)) return "Every marker needs a code.";
    if (new Set(codes.map((c) => c.toLowerCase())).size !== codes.length) {
      return "Marker codes must be unique.";
    }
    return null;
  }

  el("btn-save").addEventListener("click", () => {
    readFormIntoHunt();
    const problem = validate();
    if (problem) { toast(problem); return; }
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(hunt));
    renderQrCodes();
    toast("Saved to test mode — open index.html to try it.");
  });

  el("btn-download").addEventListener("click", () => {
    readFormIntoHunt();
    const problem = validate();
    if (problem) { toast(problem); return; }
    const blob = new Blob([JSON.stringify(hunt, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hunt.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("Downloaded — replace data/hunt.json with this file to go live.");
  });

  el("btn-load-file").addEventListener("click", () => el("file-input").click());
  el("file-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      hunt = JSON.parse(text);
      hunt.stops = hunt.stops || [];
      fillForm();
      toast("Loaded from file.");
    } catch (err) {
      toast("Couldn't read that file as JSON.");
    }
    e.target.value = "";
  });

  el("btn-load-live").addEventListener("click", async () => {
    try {
      const res = await fetch("data/hunt.json", { cache: "no-store" });
      hunt = await res.json();
      fillForm();
      toast("Reloaded from data/hunt.json.");
    } catch (err) {
      toast("Couldn't reach data/hunt.json.");
    }
  });

  el("btn-clear-test").addEventListener("click", () => {
    localStorage.removeItem(OVERRIDE_KEY);
    toast("Test override cleared — index.html will use data/hunt.json again.");
  });

  el("btn-print").addEventListener("click", () => window.print());

  (async function init() {
    const override = localStorage.getItem(OVERRIDE_KEY);
    if (override) {
      try { hunt = JSON.parse(override); } catch (e) { hunt = null; }
    }
    if (!hunt) {
      try {
        const res = await fetch("data/hunt.json", { cache: "no-store" });
        hunt = await res.json();
      } catch (e) {
        hunt = JSON.parse(JSON.stringify(DEFAULT_HUNT));
      }
    }
    hunt.stops = hunt.stops || [];
    fillForm();
  })();
})();
