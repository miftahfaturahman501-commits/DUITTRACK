"use strict";
/* ============ Router, aksi, kunci PIN, inisialisasi ============ */
const navFor = r => [["home", "🏠", "Beranda"], ["tx", "🧾", "Transaksi"], "fab", r.pos ? ["pos", "🛒", "Kasir"] : ["budget", "🎯", "Anggaran"], ["more", "☰", "Menu"]];

function applyTheme() {
  const t = S.settings.theme, el = document.documentElement;
  if (t === "auto") el.removeAttribute("data-theme"); else el.setAttribute("data-theme", t);
  const dark = t === "dark" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = dark ? "#0b110e" : "#f3f6f4";
}
function render() {
  const r = R();
  document.documentElement.style.setProperty("--accent", r.color);
  applyTheme();
  if (view === "products" && !r.pos) view = "home";
  $("#view").innerHTML = (VIEWS[view] || VIEWS.home)(r);
  const tabs = navFor(r), active = tabs.some(t => t[0] === view) ? view : "more";
  $("#nav").innerHTML = tabs.map(t => t === "fab" ? `<button class="fab" data-act="addTx" data-t="out" aria-label="Tambah transaksi">＋</button>` :
    `<button class="${t[0] === active ? "on" : ""}" data-act="go" data-v="${t[0]}"><span>${t[1]}</span><small>${t[2]}</small></button>`).join("");
}
function go(v, push = true) {
  if (v === view && push) return;
  const isTab = TABS.includes(v), st = history.state || {};
  if (push && !isTab) history.pushState({ v, d: (st.d || 0) + 1 }, "");
  else history.replaceState({ v, d: isTab ? 0 : (st.d || 0) }, "");
  view = v; render(); window.scrollTo(0, 0);
}
window.addEventListener("popstate", e => { view = (e.state && e.state.v) || "home"; render(); window.scrollTo(0, 0); });

const refreshPos = () => { const r = R(); const g = $("#posGrid"), c = $("#cartBar"); if (g) g.innerHTML = posGridHtml(r); if (c) c.innerHTML = cartBarHtml(); };
async function shareText(text) {
  try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(text); toast("Disalin ke clipboard"); } catch (e) { toast("Tidak bisa membagikan di perangkat ini"); }
}
function adoptState(d) {
  S = d; S.settings = Object.assign({ theme: "auto", pin: null, active: null }, S.settings || {});
  if (!S.rooms.find(r => r.id === S.settings.active)) S.settings.active = S.rooms[0].id;
  save(); view = "home"; history.replaceState({ v: "home", d: 0 }, ""); render();
  S.profile = Object.assign({ name: "", photo: "" }, S.profile);
}

const ACT = {
  go: d => go(d.v),
  back: () => { if ((history.state && history.state.d) > 0) history.back(); else go("more", false); },
  rooms: () => roomSwitcher(),
  profile: () => profileForm(),
  pickRoom: d => { S.settings.active = d.id; save(); closeSheet(); if (view === "pos" && !R().pos) view = "home"; render(); window.scrollTo(0, 0); },
  newRoom: () => roomForm(), editRoom: d => roomForm(d.id),
  addTx: d => txForm(null, { t: d.t }), editTx: d => txForm(d.id),
  delTxInfo: async d => { if (await confirmBox("Hapus transaksi ini? Stok/piutang terkait ikut dikembalikan.")) withUndo("Transaksi dihapus", () => removeTx(R(), d.id)); },
  series: d => { homeSeries = d.v; render(); },
  txMonth: d => { const m = addMonths(TX.m, +d.d); if (m <= mkey(new Date())) { TX.m = m; render(); } },
  txType: d => { TX.t = d.v; render(); },
  repMonth: d => { const m = addMonths(repM, +d.d); if (m <= mkey(new Date())) { repM = m; render(); } },
  debtTab: d => { debtTab = d.v; render(); },
  addWallet: () => walletForm(), editWallet: d => walletForm(d.id),
  addCat: d => catForm(d.t),
  delCat: async d => { const l = catList(R(), d.t); if (l.length < 2) return toast("Minimal satu kategori"); if (await confirmBox(`Hapus kategori "${d.n}"? Transaksi lama tetap tersimpan.`)) { const r = R(); r.cats[d.t] = l.filter(c => c.n !== d.n); save(); render(); } },
  editBudget: () => budgetForm(),
  addGoal: () => goalForm(), editGoal: d => goalForm(d.id), goalMove: d => goalMoveForm(d.id),
  addDebt: () => debtForm(null, debtTab), editDebt: d => debtForm(d.id), payDebt: d => debtPayForm(d.id),
  addRec: () => recForm(), editRec: d => recForm(d.id),
  addProduct: () => productForm(), editProduct: d => productForm(d.id), restock: d => restockForm(d.id),
  enablePos: () => { R().pos = true; save(); render(); toast("Kasir & Stok aktif"); },
  addCart: d => { const p = R().products.find(x => x.id === d.id), c = cart(), cur = c[d.id] || 0; if (!p) return; if (p.st != null && cur + 1 > p.st) return toast("Stok tidak cukup"); c[d.id] = cur + 1; refreshPos(); },
  subCart: d => { const c = cart(); if (c[d.id] > 1) c[d.id]--; else delete c[d.id]; refreshPos(); },
  clearCart: () => { CART[R().id] = {}; refreshPos(); },
  checkout: () => checkoutForm(),
  shareNota: d => { const r = R(), t = r.tx.find(x => x.id === d.id); if (t) shareText(notaText(r, t)); },
  theme: d => { S.settings.theme = d.v; save(); render(); },
  setPin: () => pinForm(),
  delPin: async () => { if (await confirmBox("Hapus PIN? Aplikasi tidak akan terkunci lagi.", "Hapus PIN")) { S.settings.pin = null; save(); render(); toast("PIN dihapus"); } },
  backup: () => { download(`duittrack-backup-${today()}.json`, JSON.stringify(S, null, 1), "application/json"); toast("Backup diunduh"); },
  restore: () => $("#fileRestore").click(),
  exportAll: () => download(`duittrack-${R().name}-semua.csv`, toCSV(R(), null), "text/csv"),
  exportCsv: () => download(`duittrack-${R().name}-${repM}.csv`, toCSV(R(), repM), "text/csv"),
  printReport: () => window.print(),
  shareReport: () => {
    const r = R(), s = stats(r, repM);
    const L = [`*Laporan ${r.name} — ${monthLabel(repM)}*`, `Pemasukan: ${rp(s.inc)}`];
    if (r.pos) L.push(`HPP: ${rp(s.hpp)}`, `Laba kotor: ${rp(s.gross)}`);
    L.push(`Pengeluaran: ${rp(s.out)}`, `${r.pos ? "Laba bersih" : "Selisih"}: ${rp(r.pos ? s.profit : s.net)}`);
    const top3 = Object.entries(s.cats).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top3.length) L.push("", "Pengeluaran terbesar:", ...top3.map(([n, v]) => `• ${n}: ${rp(v)}`));
    shareText(L.join("\n"));
  },
  resetAll: async () => { if (await confirmBox("Semua room dan transaksi akan dihapus permanen. Sudah backup?", "Hapus semua")) { localStorage.removeItem(KEY); localStorage.removeItem("duittrack.v1"); S = null; load(); save(); view = "home"; render(); toast("Data direset"); } },
  install: async () => { const e = window._installEvt; if (!e) return; e.prompt(); await e.userChoice; window._installEvt = null; render(); }
};

document.addEventListener("click", e => {
  if (e.target === sheet()) return closeSheet();
  const un = e.target.closest("[data-undo]");
  if (un) { const t = $("#toast"); const f = t._undo; t.classList.remove("show"); if (f) f(); return; }
  if (e.target.closest("[data-close]")) return closeSheet();
  const el = e.target.closest("[data-act]");
  if (el && !el.disabled && ACT[el.dataset.act]) ACT[el.dataset.act](el.dataset, el);
});
document.addEventListener("input", e => {
  if (e.target.id === "txQ") { TX.q = e.target.value; $("#txList").innerHTML = txListHtml(R()); }
  else if (e.target.id === "posQ") { posQ = e.target.value; refreshPos(); }
});
document.addEventListener("change", e => {
  if (e.target.id === "txC") { TX.c = e.target.value; $("#txList").innerHTML = txListHtml(R()); }
  else if (e.target.id === "fileRestore" && e.target.files[0]) {
    const f = e.target.files[0], rd = new FileReader();
    rd.onload = async () => {
      try {
        const d = JSON.parse(rd.result);
        if (!d || !Array.isArray(d.rooms) || !d.rooms.length) throw new Error("format");
        if (await confirmBox(`Pulihkan ${d.rooms.length} room dari backup? Data saat ini akan ditimpa.`, "Pulihkan")) { adoptState(d); toast("Data dipulihkan ✓"); }
      } catch (err) { toast("File backup tidak valid"); }
    };
    rd.readAsText(f); e.target.value = "";
  }
});

/* ---------- Kunci PIN ---------- */
let lockBuf = "", hiddenAt = 0;
function renderLock(msg, bad) {
  const L = $("#lock");
  L.innerHTML = `<div class="lock-box ${bad ? "shake" : ""}"><div class="lock-ic">🔒</div><h2>DuitTrack</h2><p>${msg || "Masukkan PIN"}</p>
    <div class="dots">${[0, 1, 2, 3].map(i => `<i class="${i < lockBuf.length ? "on" : ""}"></i>`).join("")}</div>
    <div class="keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map(k => k === "" ? "<span></span>" : `<button type="button" data-key="${k}">${k}</button>`).join("")}</div></div>`;
}
function lockApp() {
  if (!S.settings.pin) return;
  lockBuf = ""; $("#lock").hidden = false; document.body.classList.add("locked"); renderLock();
}
$("#lock").addEventListener("click", async e => {
  const b = e.target.closest("[data-key]"); if (!b) return;
  const k = b.dataset.key;
  if (k === "⌫") lockBuf = lockBuf.slice(0, -1); else if (lockBuf.length < 4) lockBuf += k;
  renderLock();
  if (lockBuf.length === 4) {
    if ((await sha(lockBuf)) === S.settings.pin) { $("#lock").hidden = true; document.body.classList.remove("locked"); lockBuf = ""; }
    else { lockBuf = ""; renderLock("PIN salah, coba lagi", true); }
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (hiddenAt && Date.now() - hiddenAt > 30000) lockApp();
});

/* ---------- Init ---------- */
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); window._installEvt = e; if (view === "settings") render(); });
window.addEventListener("appinstalled", () => { window._installEvt = null; toast("Aplikasi terpasang 🎉"); });

(function init() {
  load(); save();
  runRecurring();
  const q = new URLSearchParams(location.search);
  if (q.get("view") && VIEWS[q.get("view")]) view = q.get("view");
  history.replaceState({ v: view, d: 0 }, "");
  render(); lockApp();
  if (q.get("add")) setTimeout(() => txForm(null, { t: q.get("add") }), 200);
  if (S.migrated) { delete S.migrated; save(); setTimeout(() => toast("Data DuitTrack lama berhasil dipindahkan ✓"), 700); }
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => { });
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", applyTheme);
})();
