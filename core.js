"use strict";
/* ============ DuitTrack Pro — core: util, data model, statistik ============ */
const KEY = "duittrack.v2";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = v => {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const n = Number(String(v ?? "").replace(/[^\d,-]/g, "").replace(",", "."));
  return isFinite(n) ? n : 0;
};
const fmt = n => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n || 0));
const rp = n => (n < 0 ? "-" : "") + "Rp" + fmt(Math.abs(n));
const short = n => {
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  const f = (x, u) => s + x.toFixed(1).replace(/\.0$/, "").replace(".", ",") + u;
  if (a >= 1e9) return f(a / 1e9, "M");
  if (a >= 1e6) return f(a / 1e6, "jt");
  if (a >= 1e3) return s + Math.round(a / 1e3) + "rb";
  return s + Math.round(a);
};
const pad = n => String(n).padStart(2, "0");
const dk = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = k => { const [y, m, d] = String(k).split("-").map(Number); return new Date(y, m - 1, d, 12); };
const today = () => dk(new Date());
const mkey = d => dk(d).slice(0, 7);
const addDays = (k, n) => { const d = pd(k); d.setDate(d.getDate() + n); return dk(d); };
const addMonths = (m, n) => { const [y, mo] = m.split("-").map(Number); return mkey(new Date(y, mo - 1 + n, 1, 12)); };
const monthLabel = k => { const [y, m] = k.split("-").map(Number); return new Date(y, m - 1, 1, 12).toLocaleDateString("id-ID", { month: "long", year: "numeric" }); };
const monthShort = k => { const [y, m] = k.split("-").map(Number); return new Date(y, m - 1, 1, 12).toLocaleDateString("id-ID", { month: "short" }); };
const dateLabel = k => pd(k).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
const dayHeading = k => k === today() ? "Hari ini" : k === addDays(today(), -1) ? "Kemarin" : pd(k).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
const dayShort = k => pd(k).toLocaleDateString("id-ID", { weekday: "short" }).replace(".", "");
const daysBetween = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
const sum = (arr, f) => arr.reduce((t, x) => t + (f ? f(x) : x), 0);

const PALETTE = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b"];
const ROOM_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#ef4444", "#14b8a6", "#64748b"];
const ROOM_ICONS = ["👤", "🏪", "🧊", "🍜", "🏠", "👨‍👩‍👧", "🎓", "🎉", "🚗", "💼", "🛒", "🌱"];
const CAT_ICONS = ["🍜", "🛵", "🛍️", "🧾", "💊", "📚", "🎮", "📦", "🧊", "👥", "🏠", "💡", "📣", "🔧", "🎁", "💰", "☕", "⚽", "✈️", "🐾"];

/* Template room: kategori bawaan per tipe */
const ROOM_TYPES = {
  personal: {
    label: "Pribadi", icon: "👤", color: "#10b981",
    exp: [["Makanan", "🍜"], ["Transportasi", "🛵"], ["Belanja", "🛍️"], ["Tagihan", "🧾"], ["Kesehatan", "💊"], ["Pendidikan", "📚"], ["Hiburan", "🎮"], ["Lainnya", "📦"]],
    inc: [["Gaji", "💼"], ["Bonus", "🎁"], ["Lainnya", "💰"]]
  },
  business: {
    label: "Usaha / Toko / Warung", icon: "🏪", color: "#3b82f6",
    exp: [["Bahan baku", "🧊"], ["Gaji karyawan", "👥"], ["Sewa tempat", "🏠"], ["Listrik & air", "💡"], ["Transportasi", "🛵"], ["Promosi", "📣"], ["Peralatan", "🔧"], ["Lainnya", "📦"]],
    inc: [["Penjualan", "🛒"], ["Pemasukan lain", "💰"]]
  },
  family: {
    label: "Keluarga", icon: "👨‍👩‍👧", color: "#ec4899",
    exp: [["Dapur", "🍳"], ["Listrik & air", "💡"], ["Sekolah", "📚"], ["Kesehatan", "💊"], ["Transportasi", "🛵"], ["Hiburan", "🎮"], ["Lainnya", "📦"]],
    inc: [["Gaji", "💼"], ["Usaha", "🏪"], ["Lainnya", "💰"]]
  },
  project: {
    label: "Proyek / Acara", icon: "🎉", color: "#f59e0b",
    exp: [["Konsumsi", "🍱"], ["Perlengkapan", "🧰"], ["Transportasi", "🚗"], ["Sewa tempat", "🏠"], ["Dekorasi", "🎈"], ["Lainnya", "📦"]],
    inc: [["Iuran", "🙋"], ["Sponsor", "🤝"], ["Donasi", "💝"], ["Lainnya", "💰"]]
  },
  campus: {
    label: "Kuliah / Organisasi", icon: "🎓", color: "#8b5cf6",
    exp: [["Fotokopi & cetak", "🖨️"], ["Konsumsi", "🍱"], ["Kegiatan", "🎯"], ["Transportasi", "🚗"], ["Lainnya", "📦"]],
    inc: [["Kas anggota", "🙋"], ["Dana kegiatan", "🏛️"], ["Lainnya", "💰"]]
  }
};

function mkRoom(type = "personal", name, icon, color, pos) {
  const T = ROOM_TYPES[type] || ROOM_TYPES.personal;
  return {
    id: uid(), name: name || T.label.split(" ")[0], icon: icon || T.icon, color: color || T.color, type,
    pos: pos ?? type === "business", seq: 0,
    wallets: [
      { id: uid(), name: "Tunai", icon: "💵", init: 0 },
      { id: uid(), name: "Bank", icon: "🏦", init: 0 },
      { id: uid(), name: "E-Wallet", icon: "📱", init: 0 }
    ],
    cats: { out: T.exp.map(([n, i]) => ({ n, i })), in: T.inc.map(([n, i]) => ({ n, i })) },
    budget: { total: 0, cat: {} },
    goals: [], rec: [], debts: [], products: [], tx: []
  };
}

/* ---------- State ---------- */
let S;
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) S = JSON.parse(raw); } catch (e) { console.warn(e); }
  if (!S || !Array.isArray(S.rooms) || !S.rooms.length) { S = { v: 2, settings: {}, rooms: [mkRoom("personal", "Pribadi")] }; migrateV1(); }
  S.settings = Object.assign({ theme: "auto", pin: null, active: null }, S.settings);
  S.profile = Object.assign({ name: "", photo: "" }, S.profile);
  if (!S.rooms.find(r => r.id === S.settings.active)) S.settings.active = S.rooms[0].id;
}
function migrateV1() {
  try {
    const o = JSON.parse(localStorage.getItem("duittrack.v1") || "null");
    if (!o) return;
    const r = S.rooms[0], w = r.wallets[0];
    (o.transactions || []).forEach(t => r.tx.push({ id: t.id || uid(), t: "out", a: Number(t.amount) || 0, c: t.category || "Lainnya", n: [t.title, t.note].filter(Boolean).join(" — "), d: t.date, w: w.id }));
    w.init = sum(r.tx, t => t.a); // saldo awal disesuaikan agar saldo tidak minus
    r.budget.total = Math.max(0, Number(o.budget) || 0);
    if (o.savings && (o.savings.goal || o.savings.current)) r.goals.push({ id: uid(), n: o.savings.name || "Dana impian", i: "🎯", target: Number(o.savings.goal) || 0, saved: Number(o.savings.current) || 0, due: "" });
    S.migrated = true;
  } catch (e) { console.warn("Migrasi v1 gagal", e); }
}
let saveFail = false;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); saveFail = false; }
  catch (e) { if (!saveFail) toast("Penyimpanan penuh/diblokir. Ekspor backup sekarang!"); saveFail = true; }
}
const R = () => S.rooms.find(r => r.id === S.settings.active) || S.rooms[0];
const catList = (r, t) => r.cats[t === "in" ? "in" : "out"];
const catIcon = (r, t, n) => (catList(r, t).find(c => c.n === n) || {}).i || "📦";
const wName = (r, id) => { const w = r.wallets.find(x => x.id === id); return w ? w.name : "Belum diterima"; };
const wIcon = (r, id) => { const w = r.wallets.find(x => x.id === id); return w ? w.icon : "⏳"; };

/* ---------- Perhitungan ---------- */
function walletBal(r, w) {
  let b = w.init || 0;
  for (const t of r.tx) {
    if (t.t === "in" && t.w === w.id) b += t.a;
    else if (t.t === "out" && t.w === w.id) b -= t.a;
    else if (t.t === "tf") { if (t.w === w.id) b -= t.a; if (t.w2 === w.id) b += t.a; }
  }
  return b;
}
const totalBal = r => sum(r.wallets, w => walletBal(r, w));

/* m = "YYYY-MM" atau null (semua). t.x = arus kas non-laba (utang, stok) */
function stats(r, m) {
  const list = m ? r.tx.filter(t => t.d.startsWith(m)) : r.tx;
  const o = { inc: 0, out: 0, hpp: 0, stock: 0, cats: {}, incCats: {}, n: 0, sales: 0, items: {} };
  for (const t of list) {
    if (t.t === "tf") continue;
    if (t.x) { if (t.inv) o.stock += t.a; continue; }
    o.n++;
    if (t.t === "in") {
      o.inc += t.a; o.incCats[t.c] = (o.incCats[t.c] || 0) + t.a;
      if (t.s) {
        o.sales++;
        for (const i of t.s) { o.hpp += (i.co || 0) * i.q; const k = i.n; o.items[k] = o.items[k] || { n: i.n, q: 0, rev: 0, profit: 0 }; o.items[k].q += i.q; o.items[k].rev += i.pr * i.q; o.items[k].profit += (i.pr - (i.co || 0)) * i.q; }
      }
    } else { o.out += t.a; o.cats[t.c] = (o.cats[t.c] || 0) + t.a; }
  }
  o.gross = o.inc - o.hpp; o.profit = o.gross - o.out; o.net = o.inc - o.out;
  return o;
}
const dayOut = (r, k) => sum(r.tx.filter(t => t.d === k && t.t === "out" && !t.x), t => t.a);
const debtPaid = d => sum(d.pays || [], p => p.a);
const debtLeft = d => Math.max(0, d.a - debtPaid(d));

/* ---------- Transaksi berulang ---------- */
function nextDate(x) {
  if (x.f === "daily") return addDays(x.next, 1);
  if (x.f === "weekly") return addDays(x.next, 7);
  const d = pd(x.next), t = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(x.day || d.getDate(), last));
  return dk(t);
}
function runRecurring() {
  let added = 0;
  const td = today();
  S.rooms.forEach(r => (r.rec || []).forEach(x => {
    let g = 0;
    while (x.next <= td && g++ < 120) {
      r.tx.push({ id: uid(), t: x.t, a: x.a, c: x.c, n: "🔁 " + x.n, d: x.next, w: x.w });
      x.next = nextDate(x); added++;
    }
  }));
  if (added) { save(); setTimeout(() => toast(`${added} transaksi berulang dicatat otomatis`), 600); }
}

/* ---------- CSV / Backup ---------- */
function csvCell(v) { v = String(v ?? ""); return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }
function toCSV(r, m) {
  const rows = [["Tanggal", "Jenis", "Kategori", "Catatan", "Dompet", "Ke Dompet", "Jumlah", "Non-laba"]];
  r.tx.filter(t => !m || t.d.startsWith(m)).sort((a, b) => a.d.localeCompare(b.d)).forEach(t =>
    rows.push([t.d, { in: "Masuk", out: "Keluar", tf: "Transfer" }[t.t], t.c || "", t.n || "", t.w ? wName(r, t.w) : "", t.w2 ? wName(r, t.w2) : "", t.a, t.x ? "ya" : ""]));
  return "﻿" + rows.map(x => x.map(csvCell).join(",")).join("\n");
}
function download(name, text, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
async function sha(s) {
  try { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("dt:" + s)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join(""); }
  catch (e) { return "p:" + btoa(s); }
}
