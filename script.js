// ===== STATE =====
let currentUser = null;
let balances = {};
let historyData = {};
let cardIntervals = [];
window.schemePrimary = "#0f0"; // sync with matrix

// ===== DATA LOAD / SAVE =====
async function loadData() {
  try { balances = await (await fetch("balances.json")).json(); }
  catch(e){ balances = { kristen: 999999, joe: 260 }; }
  try { historyData = await (await fetch("history.json")).json(); }
  catch(e){ historyData = { kristen: [], joe: [] }; }
}
function saveData(){ console.log("Data changed", balances, historyData); }

// ===== HELPERS =====
function playSound(file){ new Audio(`./assets/${file}`).play().catch(()=>{}); }
function flashMessage(msg,color){
  const el=document.createElement("div");
  el.textContent=msg; el.className="flash-message"; el.style.color=color;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1000);
}
function formatCardDigits(str){ return str.replace(/\s+/g,"").replace(/(.{4})/g,"$1 ").trim(); }
function randomDigit(){ return String(Math.floor(Math.random()*10)); }

// ===== LOGIN =====
function login(){
  const code = document.getElementById("login-code").value.trim();
  if(code==="0002") currentUser="kristen";
  else if(code==="0824") currentUser="joe";
  else { playSound("access-denied.mp3"); flashMessage("ACCESS DENIED","red"); return; }
  playSound("access-granted.mp3"); flashMessage("ACCESS GRANTED","lime"); showHome();
}
document.getElementById("login-btn").onclick=login;
document.getElementById("login-code").addEventListener("keydown", e=>{ if(e.key==="Enter") login(); });

// ===== SCREENS =====
function showHome(){
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("home-screen").classList.remove("hidden");
  document.getElementById("username").textContent=currentUser==="kristen"?"Kristén":"Joe";
  renderAll();
}
document.getElementById("logout-btn").onclick=()=>location.reload();

// ===== RENDER =====
function renderAll(){
  updateBalances();
  renderCards();
  renderHistory();
  renderStore();
  bindSendCredits();
  applyColorScheme(document.getElementById("color-picker").value);
}

function updateBalances(){
  const el=document.getElementById("balances");
  if(currentUser==="kristen") el.textContent=`Kristén: ∞ credits | Joe: ${balances.joe} credits`;
  else el.textContent=`Your Balance: ${balances.joe} credits`;
}

function renderHistory(){
  const list=document.getElementById("history"); list.innerHTML="";
  (historyData[currentUser]||[]).forEach(entry=>{
    const li=document.createElement("li"); li.textContent=`${entry.date} - ${entry.action}`;
    list.appendChild(li);
  });
}

// ===== STORE =====
const STORE=[ {name:"One hole",cost:3},{name:"Two holes",cost:6},{name:"Three holes",cost:12} ];
function renderStore(){
  const wrap=document.getElementById("store"); wrap.innerHTML="";
  STORE.forEach(item=>{
    const b=document.createElement("button");
    b.textContent=`${item.name} - ${item.cost} credits`;
    b.onclick=()=>redeem(item.name,item.cost);
    wrap.appendChild(b);
  });
}
function redeem(item,cost){
  if(currentUser==="joe" && balances.joe<cost){ alert("Not enough credits."); return; }
  if(currentUser==="joe") balances.joe-=cost;
  if(!historyData[currentUser]) historyData[currentUser]=[];
  historyData[currentUser].push({ date:new Date().toISOString().split("T")[0], action:`Redeemed ${item} (-${cost} credits)` });
  flashMessage(`Redeemed ${item}`,"#0ff");
  saveData(); updateBalances(); renderHistory();
}

// ===== CARDS =====
function renderCards(){
  cardIntervals.forEach(id=>clearInterval(id)); cardIntervals=[];
  const wrap=document.getElementById("cards"); wrap.innerHTML="";
  function makeCard(owner,numberSeed){
    const card=document.createElement("div"); card.className="card";
    const label=document.createElement("div"); label.className="card-label";
    label.textContent=owner==="kristen"?"Kristén • Card":"Joe • Card";
    const num=document.createElement("div"); num.className="card-number"; num.textContent=formatCardDigits(numberSeed);
    const bal=document.createElement("div");
    bal.textContent=(owner==="kristen"?currentUser==="kristen"?"Balance: ∞ credits": "":`Balance: ${balances.joe} credits`);
    if(currentUser==="joe" && owner==="kristen") bal.style.display="none";
    card.appendChild(label); card.appendChild(num); card.appendChild(bal); wrap.appendChild(card);
    const base=numberSeed.replace(/\s+/g,"");
    const tick=setInterval(()=>{ const mutated=base.split("").map(d=>Math.random()<0.10?randomDigit():d).join(""); num.textContent=formatCardDigits(mutated); },110);
    cardIntervals.push(tick);
  }
  if(currentUser==="kristen"){ makeCard("kristen","9999 9999 9999 9999"); makeCard("joe","1234 5678 9012 3456"); }
  else makeCard("joe","1234 5678 9012 3456");
}

// ===== SEND CREDITS =====
function bindSendCredits(){
  document.getElementById("send-button").onclick=()=>{
    const input=document.getElementById("send-amount"); const amount=parseInt(input.value,10);
    if(!amount||amount<=0){ alert("Enter a valid amount."); return; }
    const recipient=currentUser==="kristen"?"joe":"kristen";
    if(currentUser==="joe" && balances.joe<amount){ alert("Not enough credits."); return; }
    if(currentUser==="joe") balances.joe-=amount; if(recipient==="joe") balances.joe+=amount;
    if(!historyData[currentUser]) historyData[currentUser]=[]; if(!historyData[recipient]) historyData[recipient]=[];
    historyData[currentUser].push({ date:new Date().toISOString().split("T")[0], action:`Sent ${amount} credits to ${recipient}` });
    historyData[recipient].push({ date:new Date().toISOString().split("T")[0], action:`Received ${amount} credits from ${currentUser}` });
    input.value=""; flashMessage(`Sent ${amount} credits to ${recipient}`,"#0ff");
    saveData(); updateBalances(); renderHistory(); renderCards(); applyColorScheme(document.getElementById("color-picker").value);
  };
}

// ===== COLOR =====
function applyColorScheme(color){
  window.schemePrimary=color;
  const nodes=[...document.querySelectorAll("#cards .card, #cards .card *, #history li, #store button, button:not(#store button), input")];
  nodes.forEach(el=>{ el.style.color=color; if(el.style && getComputedStyle(el).borderStyle!=="none") el.style.borderColor=color; });
}
document.getElementById("color-picker").addEventListener("change",()=>applyColorScheme(document.getElementById("color-picker").value));

// ===== INIT =====
document.addEventListener("DOMContentLoaded",async()=>{
  await loadData();
});
