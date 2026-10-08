/* Amőba – frontend logika
 * Minden játékszabályt a backend kezel (F-04), ez a fájl csak megjelenít és kommunikál.
 */
(function () {
  "use strict";

  
  const API = {
    newGame: "/new-game",
    turn: "/turn",
    state: "/state",
  };

  const STATUS_MAP = {
    "folyamatban": "playing", "in_progress": "playing", "playing": "playing", "ongoing": "playing",
    "x nyert": "x_won", "x_won": "x_won", "x_win": "x_won", "x_wins": "x_won", "x won!": "x_won",
    "o nyert": "o_won", "o_won": "o_won", "o_win": "o_won", "o_wins": "o_won", "o won!": "o_won",
    "döntetlen": "draw", "dontetlen": "draw", "draw": "draw", "tie": "draw",
  };

  const MSG = {
    occupied: "Ez a mező már foglalt.",
    gameOver: "A játék véget ért. Indíts új játékot.",
    outOfRange: "Érvénytelen mező.",
    badSize: "Ez a táblaméret nem támogatott.",
    network: "A szerver nem érhető el.",
    generic: "Ismeretlen hiba történt. Próbáld újra.",
  };

  const game = {
    table: [],
    size: 3,
    next: "X",
    status: "playing",
    winning: [],
  };
  let busy = false; // kérés közben ne lehessen duplán kattintani

  const $ = (id) => document.getElementById(id);
  const boardEl = $("board");
  const statusEl = $("status-bar");
  const errorEl = $("error-msg");
  const resultEl = $("result");
  const resultTextEl = $("result-text");
  const sizeSelect = $("size-select");

  function normalizeStatus(s) {
    if (s === undefined || s === null) return "playing";
    return STATUS_MAP[String(s).trim().toLowerCase()] || "playing";
  }

  function normalizeCell(v) {
    const s = String(v ?? "").trim().toUpperCase();
    return s === "X" || s === "O" ? s : "";
  }

  function normalizeWinning(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map((f) => {
        if (Array.isArray(f)) return { r: f[0], c: f[1] };
        if (f && typeof f === "object") {
          return { r: f.row ?? f.r, c: f.column ?? f.col ?? f.c };
        }
        return null;
      })
      .filter(Boolean);
  }

  function applyServerState(data, fallbackSize) {
    if (Array.isArray(data.table)) {
      game.table = data.table.map((row) => row.map(normalizeCell));
      game.size = data.size || game.table.length || fallbackSize || game.size;
    } else if (fallbackSize) {
      game.size = fallbackSize;
    }
    game.next = data.next ? String(data.next).toUpperCase() : "";
    game.status = normalizeStatus(data.status);
    game.winning = normalizeWinning(data.winning_fields);
  }

  function errorMessageFor(httpStatus, body) {
    const code = String((body && (body.error || body.code)) || "").toLowerCase();
    if (code.includes("occupied") || code.includes("foglalt")) return MSG.occupied;
    if (code.includes("over") || code.includes("ended") || code.includes("vege")) return MSG.gameOver;
    if (code.includes("range") || code.includes("bounds") || code.includes("coord")) return MSG.outOfRange;
    if (code.includes("size") || code.includes("meret")) return MSG.badSize;

    if (httpStatus === 409) return game.status !== "playing" ? MSG.gameOver : MSG.occupied;
    if (httpStatus === 400) return MSG.outOfRange;
    return MSG.generic;
  }

  async function request(url, options) {
    let res;
    try {
      res = await fetch(url, options);
    } catch (e) {
      throw { message: MSG.network };
    }
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      /* nem JSON válasz */
    }
    if (!res.ok) {
      throw { message: errorMessageFor(res.status, body), status: res.status };
    }
    return body || {};
  }

  const postJSON = (url, payload) =>
    request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  function markHTML(player) {
    const cls = player === "X" ? "mark-x" : "mark-o";
    return `<span class="mark ${cls}">${player}</span>`;
  }

  function isWinningCell(r, c) {
    return game.winning.some((f) => f.r === r && f.c === c);
  }

  function renderBoard() {
    const n = game.size;
    boardEl.style.setProperty("--size", n);
    boardEl.dataset.size = n;
    boardEl.innerHTML = "";

    const over = game.status !== "playing";

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const value = (game.table[r] && game.table[r][c]) || "";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cell" + (value ? ` filled ${value.toLowerCase()}` : "");
        btn.textContent = value;
        btn.dataset.row = r;
        btn.dataset.column = c;
        btn.setAttribute("role", "gridcell");
        btn.setAttribute(
          "aria-label",
          `${r + 1}. sor, ${c + 1}. oszlop: ${value || "üres"}`
        );
        if (over) btn.disabled = true; // F-09: játék végén inaktív mezők
        if (isWinningCell(r, c)) btn.classList.add("win");
        boardEl.appendChild(btn);
      }
    }
  }

  function renderStatus() {
    const s = game.status;
    if (s === "playing") {
      statusEl.innerHTML = game.next
        ? `Következik: ${markHTML(game.next)}`
        : "";
      resultEl.hidden = true;
      return;
    }

    statusEl.textContent = "A játék véget ért";
    if (s === "x_won") resultTextEl.innerHTML = `${markHTML("X")} nyert! 🎉`;
    else if (s === "o_won") resultTextEl.innerHTML = `${markHTML("O")} nyert! 🎉`;
    else resultTextEl.textContent = "Döntetlen!";
    resultEl.hidden = false;
  }

  function render() {
    renderBoard();
    renderStatus();
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  async function startNewGame(size) {
    if (busy) return;
    busy = true;
    try {
      const data = await postJSON(API.newGame, { size: Number(size) });
      applyServerState(data, Number(size));
      clearError();
      sizeSelect.value = String(game.size);
      render();
    } catch (err) {
      showError(err.message || MSG.generic);
    } finally {
      busy = false;
    }
  }

  async function makeMove(row, column) {
    if (busy) return;
    busy = true;
    try {
      const data = await postJSON(API.turn, { row, column });
      applyServerState(data);
      clearError();
      render();
    } catch (err) {
      showError(err.message || MSG.generic); // a tábla nem változik
    } finally {
      busy = false;
    }
  }

  async function loadState() {
    try {
      const data = await request(API.state);
      if (!Array.isArray(data.table) || data.table.length === 0) {
        // Még nem volt játék: indítsunk egyet az alapméretben
        await startNewGame(sizeSelect.value);
        return;
      }
      applyServerState(data);
      sizeSelect.value = String(game.size);
      clearError();
      render();
    } catch (err) {
      statusEl.textContent = "";
      showError(err.message || MSG.generic);
    }
  }

  boardEl.addEventListener("click", (ev) => {
    const cell = ev.target.closest(".cell");
    if (!cell || cell.disabled) return;
    makeMove(Number(cell.dataset.row), Number(cell.dataset.column));
  });

  $("new-game-btn").addEventListener("click", () => startNewGame(sizeSelect.value));

  $("replay-btn").addEventListener("click", () => startNewGame(game.size));

  loadState();
})();
