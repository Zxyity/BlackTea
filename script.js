// ===== STATE =====
let currentUser = null;           // "kristen" or "joe"
let balances = {};                // loaded from balances.json
let historyData = {};             // loaded from history.json
let cardIntervals = [];           // to clear flicker timers on re-render
let schemePrimary = "#0f0";       // sync matrix color (single) or first of a pair
let lastAnimatedBalance = null;   // to control balance flicker animation

// expose to matrix script (inline) if it reads window.schemePrimary
window.schemePrimary = schemePrimary;

// ===== DATA LOAD / SAVE (read-only without backend) =====
async function loadData() {
  try {
    const rb = await fetch("balances.json", { cache: "no-store" });
    balances = await rb.json();
  } catch (e) {
    console.error("balances.json load failed", e);
    balances = { kristen: 999999, joe: 260 }; // fallback
  }

  try {
    const rh = await fetch("history.json", { cache: "no-store" });
    historyData = await rh.json();
  } catch (e) {
    console.error("history.json load failed", e);
    historyData = { kristen: [], joe: [] }; // fallback
  }
}

function saveData() {
  // No backend: this is just a placeholder.
  console.log("Data changed. Add backend to persist:", { balances, historyData });
}

// ===== HELPERS =====
function playSound(file) {
  const audio = new Audio(`./assets/${file}`);
  audio.play().catch(() => {});
}

function flashMessage(msg, color) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.className = "flash-message";
  el.style.color = color;
  el.style.textShadow = `0 0 8px ${color}`;
  document.body.appendChild(el);
  // quick "glitch" wiggle
  let n = 0;
  const jig = setInterval(() => {
    el.style.transform =
      `translate(-50%, -50%) translate(${(Math.random()-0.5)*6}px, ${(Math.random()-0.5)*4}px)`;
    if (++n > 12) { clearInterval(jig); el.style.transform = "translate(-50%, -50%)"; }
  }, 40);
  setTimeout(() => el.remove(), 900);
}

function formatCardDigits(str) {
  // group into 4s with spaces
  return str.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

function randomDigit() { return String(Math.floor(Math.random() * 10)); }

function todayISO() { return new Date().toISOString().split("T")[0]; }

// Animate a numeric value by flickering random digits, then settling to final
function flickerToValue(el, finalStr, duration = 900, interval = 50) {
  const clean = String(finalStr);
  const endAt = Date.now() + duration;
  const tick = setInterval(() => {
    if (Date.now() >= endAt) {
      clearInterval(tick);
      el.textContent = clean;
      return;
    }
    el.textContent = clean.replace(/./g, ch => (/\d/.test(ch) ? randomDigit() : ch));
  }, interval);
}

// ===== LOGIN =====
function login() {
  const code = document.getElementById("login-code").value.trim();
  if (code === "0002") {
    currentUser = "kristen";
  } else if (code === "0824") {
    currentUser = "joe";
  } else {
    playSound("access-denied.mp3");
    flashMessage("ACCESS DENIED", "red");
    return;
  }
  playSound("access-granted.mp3");
  flashMessage("ACCESS GRANTED", "lime");
  showHome();
}

function bindLogin() {
  const btn = document.getElementById("login-btn");
  const input = document.getElementById("login-code");
  if (btn) btn.onclick = login;
  if (input) input.addEventListener("keydown", e => { if (e.key === "Enter") login(); });
}

// ===== SCREENS =====
function showHome() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("home-screen").classList.remove("hidden");
  document.getElementById("username").textContent =
    currentUser === "kristen" ? "Kristén" : "Joe";
  lastAnimatedBalance = null; // force first-time balance animation
  renderAll(true);
}

function logout() {
  location.reload();
}

function bindLogout() {
  const b = document.getElementById("logout-btn");
  if (b) b.onclick = logout;
}

// ===== RENDER =====
function renderAll(firstLoad = false) {
  updateBalances(firstLoad);
  renderCards();
  renderHistory();
  renderStore();
  bindSendCredits();
  setupSettings(); // keep last so new nodes get colored
}

function updateBalances(animate = false) {
  const el = document.getElementById("balances");
  const joeBalance = balances.joe ?? 0;

  if (currentUser === "kristen") {
    // animate Joe's number on first load / change
    if (animate || lastAnimatedBalance !== joeBalance) {
      el.textContent = `Kristén: ∞ credits | Joe: `;
      const span = document.createElement("span");
      span.id = "joe-balance-anim";
      el.appendChild(span);
      flickerToValue(span, `${joeBalance} credits`);
      lastAnimatedBalance = joeBalance;
    } else {
      el.textContent = `Kristén: ∞ credits | Joe: ${joeBalance} credits`;
    }
  } else {
    if (animate || lastAnimatedBalance !== joeBalance) {
      el.textContent = `Your Balance: `;
      const span = document.createElement("span");
      span.id = "joe-balance-anim";
      el.appendChild(span);
      flickerToValue(span, `${joeBalance} credits`);
      lastAnimatedBalance = joeBalance;
    } else {
      el.textContent = `Your Balance: ${joeBalance} credits`;
    }
  }
}

function renderHistory() {
  const list = document.getElementById("history");
  list.innerHTML = "";
  (historyData[currentUser] || []).forEach(entry => {
    const li = document.createElement("li");
    li.textContent = `${entry.date} - ${entry.action}`;
    list.appendChild(li);
  });
}

const STORE = [
  { name: "One hole", cost: 3 },
  { name: "Two holes", cost: 6 },
  { name: "Three holes", cost: 12 }
];

function renderStore() {
  const wrap = document.getElementById("store");
  wrap.innerHTML = "";
  STORE.forEach(item => {
    const b = document.createElement("button");
    b.textContent = `${item.name} - ${item.cost} credits`;
    b.onclick = () => redeem(item.name, item.cost);
    wrap.appendChild(b);
  });
}

function redeem(item, cost) {
  if (currentUser === "joe" && balances.joe < cost) {
    alert("Not enough credits.");
    return;
  }
  if (currentUser === "joe") balances.joe -= cost;

  if (!historyData[currentUser]) historyData[currentUser] = [];
  historyData[currentUser].push({
    date: todayISO(),
    action: `Redeemed ${item} (-${cost} credits)`
  });

  flashMessage(`Redeemed ${item}`, "#0ff");
  saveData();
  updateBalances(true);
  renderHistory();
}

// ===== CARDS (cards at top; Joe sees only his) =====
function renderCards() {
  // clear old flicker timers
  cardIntervals.forEach(id => clearInterval(id));
  cardIntervals = [];

  const wrap = document.getElementById("cards");
  wrap.innerHTML = "";

  // helper to create a card
  function makeCard(owner, numberSeed) {
    const card = document.createElement("div");
    card.className = "card";

    const label = document.createElement("div");
    label.className = "card-label";
    label.textContent = owner === "kristen" ? "Kristén • Card" : "Joe • Card";

    const num = document.createElement("div");
    num.className = "card-number";
    num.textContent = formatCardDigits(numberSeed);

    const bal = document.createElement("div");
    if (owner === "kristen") {
      bal.textContent = currentUser === "kristen" ? "Balance: ∞ credits" : "";
      if (currentUser === "joe") bal.style.display = "none"; // hide on Joe
    } else {
      bal.textContent = `Balance: ${balances.joe} credits`;
    }

    card.appendChild(label);
    card.appendChild(num);
    card.appendChild(bal);
    wrap.appendChild(card);

    // continuous flicker: mutate ~10% digits every tick, preserving 4-digit grouping
    const base = numberSeed.replace(/\s+/g, "");
    const tick = setInterval(() => {
      const mutated = base
        .split("")
        .map(d => (Math.random() < 0.10 ? randomDigit() : d))
        .join("");
      num.textContent = formatCardDigits(mutated);
    }, 110);
    cardIntervals.push(tick);
  }

  if (currentUser === "kristen") {
    // Kristen can see both cards
    makeCard("kristen", "9999 9999 9999 9999");
    makeCard("joe", "1234 5678 9012 3456");
  } else {
    // Joe can only see his own
    makeCard("joe", "1234 5678 9012 3456");
  }
}

// ===== SEND CREDITS =====
function bindSendCredits() {
  const btn = document.getElementById("send-button");
  btn.onclick = () => {
    const input = document.getElementById("send-amount");
    const amount = parseInt(input.value, 10);
    if (!amount || amount <= 0) { alert("Enter a valid amount."); return; }

    const recipient = currentUser === "kristen" ? "joe" : "kristen";

    // balance checks and movement (Kristen is unlimited)
    if (currentUser === "joe" && balances.joe < amount) {
      alert("Not enough credits.");
      return;
    }
    if (currentUser === "joe") balances.joe -= amount;
    if (recipient === "joe") balances.joe += amount;

    // history entries
    if (!historyData[currentUser]) historyData[currentUser] = [];
    if (!historyData[recipient]) historyData[recipient] = [];

    historyData[currentUser].push({
      date: todayISO(),
      action: `Sent ${amount} credits to ${recipient}`
    });
    historyData[recipient].push({
      date: todayISO(),
      action: `Received ${amount} credits from ${currentUser}`
    });

    input.value = ""; // reset box
    flashMessage(`Sent ${amount} credits to ${recipient}`, "#0ff");
    saveData();
    updateBalances(true);
    renderHistory();
    renderCards(); // refresh Joe's card balance
    applyColorScheme(document.getElementById("color-picker").value); // recolor new nodes
  };
}

// ===== COLOR SCHEMES =====
// Supports single color (e.g. "#0f0") or alternating pair "#0f0-#fff"
function applyColorScheme(scheme) {
  // compute primary (for matrix)
  schemePrimary = scheme.includes("-") ? scheme.split("-")[0] : scheme;
  window.schemePrimary = schemePrimary;

  // elements to color
  const clusters = [
    // cards (and contents)
    document.querySelectorAll("#cards .card, #cards .card *"),
    // history items
    document.querySelectorAll("#history li"),
    // store buttons
    document.querySelectorAll("#store button"),
    // other buttons (login/logout/send)
    document.querySelectorAll("button:not(#store button)"),
    // inputs
    document.querySelectorAll("input"),
    // headings & balances
    document.querySelectorAll("#home-screen h2, #home-screen h3, #balances, #home-screen p, #home-screen span")
  ];

  if (scheme.includes("-")) {
    const [c1, c2] = scheme.split("-");
    clusters.forEach(nodeList => {
      Array.from(nodeList).forEach((el, i) => {
        el.style.color = (i % 2 === 0 ? c1 : c2);
        // borders track color if any
        const border = getComputedStyle(el).borderStyle;
        if (border && border !== "none") {
          el.style.borderColor = (i % 2 === 0 ? c1 : c2);
        }
      });
    });
    // also set body color to c1 so default text matches
    document.body.style.color = c1;
  } else {
    clusters.forEach(nodeList => {
      Array.from(nodeList).forEach(el => {
        el.style.color = scheme;
        const border = getComputedStyle(el).borderStyle;
        if (border && border !== "none") {
          el.style.borderColor = scheme;
        }
      });
    });
    document.body.style.color = scheme;
  }
}

function setupSettings() {
  const select = document.getElementById("color-picker");
  if (!select) return;

  // If your HTML contains alternating options, e.g. value="#0f0-#fff"
  // they will be handled automatically by applyColorScheme.
  if (!select.dataset.bound) {
    select.addEventListener("change", () => {
      applyColorScheme(select.value);
    });
    select.dataset.bound = "1";
  }
  // apply current selection
  applyColorScheme(select.value);
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  bindLogin();
  bindLogout();
  // If user is on login screen, still prep color so it looks right
  setupSettings();
});
