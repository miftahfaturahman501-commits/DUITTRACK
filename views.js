"use strict";
/* ============ Tampilan (views) ============ */
let view = "home";
const TX = { m: mkey(new Date()), q: "", t: "", c: "" };
let repM = mkey(new Date()), debtTab = "piutang", posQ = "", homeSeries = "out";
const TABS = ["home", "tx", "pos", "budget", "more"];

const empty = (ic, title, text, btn = "") => `<div class="empty"><div class="e-ic">${ic}</div><b>${title}</b><p>${text}</p>${btn}</div>`;
const topBar = r => `<header class="top"><button class="room-chip" data-act="rooms"><span class="rc-ic">${esc(r.icon)}</span><span class="rc-t"><small>Room aktif</small><b>${esc(r.name)}</b></span><span class="caret">▾</span></button>
    <div class="top-r"><button class="ib avatar-btn" data-act="profile" aria-label="Profil">${avatar()}</button><button class="ib" data-act="go" data-v="settings" aria-label="Pengaturan">⚙️</button></div></header>`;
const subHead = (t, right = "") => `<header class="top sub"><button class="ib" data-act="back" aria-label="Kembali">←</button><h1>${t}</h1><div class="top-r">${right}</div></header>`;
const monthNav = (m, act) => `<div class="mnav"><button class="ib" data-act="${act}" data-d="-1" aria-label="Bulan sebelumnya">‹</button><b>${monthLabel(m)}</b><button class="ib" data-act="${act}" data-d="1" aria-label="Bulan berikutnya" ${m >= mkey(new Date()) ? "disabled" : ""}>›</button></div>`;
const prog = (p, cls = "") => `<div class="prog ${cls}"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></div>`;
const avatar = (cls = "") => {
  const p = S.profile || {};
  return `<span class="avatar ${cls}">${p.photo ? `<img src="${p.photo}" alt="Foto profil">` : (esc((p.name || "").trim().charAt(0).toUpperCase()) || "👤")}</span>`;
};
const txIcon = (r, t) => t.t === "tf" ? "🔁" : t.s ? "🧾" : t.x ? (t.inv ? "📦" : t.gl ? "🎯" : "🤝") : catIcon(r, t.t, t.c);
function txRow(r, t) {
  const title = t.t === "tf" ? `${wName(r, t.w)} → ${wName(r, t.w2)}` : (t.n || t.c);
  const sub = t.t === "tf" ? "Transfer antar dompet" : `${t.c} · ${wName(r, t.w)}${t.x ? " · non-laba" : ""}`;
  const cls = t.t === "in" ? "pos" : t.t === "out" ? "neg" : "";
  return `<button type="button" class="tx" data-act="editTx" data-id="${t.id}"><span class="tx-ic">${txIcon(r, t)}</span><span class="tx-m"><b>${esc(title)}</b><small>${esc(sub)}</small></span><span class="tx-a ${cls}">${t.t === "in" ? "+" : t.t === "out" ? "−" : ""}${rp(t.a)}</span></button>`;
}
const sortTx = list => list.slice().sort((a, b) => b.d.localeCompare(a.d) || b.id.localeCompare(a.id));
function groupedTx(r, list) {
  if (!list.length) return "";
  const g = {};
  list.forEach(t => (g[t.d] = g[t.d] || []).push(t));
  return Object.keys(g).sort().reverse().map(d => {
    const day = sum(g[d].filter(t => t.t === "out" && !t.x), t => t.a), inc = sum(g[d].filter(t => t.t === "in" && !t.x), t => t.a);
    return `<div class="grp"><div class="grp-h"><span>${dayHeading(d)}</span><small>${inc ? `<i class="pos">+${short(inc)}</i> ` : ""}${day ? `<i class="neg">−${short(day)}</i>` : ""}</small></div><div class="card flush">${g[d].map(t => txRow(r, t)).join("")}</div></div>`;
  }).join("");
}

/* ---------- Insight ---------- */
function insights(r) {
  const o = [], m = mkey(new Date()), st = stats(r, m), pm = stats(r, addMonths(m, -1)), td = today();
  if (r.budget.total > 0) {
    const p = st.out / r.budget.total * 100;
    if (p >= 100) o.push(["🚨", "Anggaran bulan ini terlampaui", `${rp(st.out)} dari ${rp(r.budget.total)}`, "budget", "bad"]);
    else if (p >= 80) o.push(["⚠️", "Anggaran hampir habis", `${Math.round(p)}% terpakai, sisa ${rp(r.budget.total - st.out)}`, "budget", "warn"]);
  }
  Object.entries(r.budget.cat).forEach(([c, l]) => { if ((st.cats[c] || 0) > l) o.push(["⚠️", `Batas ${c} terlewati`, `${rp(st.cats[c])} dari batas ${rp(l)}`, "budget", "warn"]); });
  if (r.pos) {
    const low = r.products.filter(p => p.st != null && p.st <= (p.min || 0));
    if (low.length) o.push(["📦", `${low.length} produk stok menipis`, low.slice(0, 3).map(p => `${p.n} (${p.st})`).join(", "), "products", "warn"]);
  }
  r.debts.forEach(d => {
    const left = debtLeft(d); if (!left || !d.due) return;
    const df = daysBetween(td, d.due), who = `${d.k === "utang" ? "Utang ke" : "Piutang dari"} ${d.who}`;
    if (df < 0) o.push(["⏰", `${who} lewat tempo`, `${rp(left)} · terlambat ${-df} hari`, "debts", "bad"]);
    else if (df <= 3) o.push(["📅", `${who} jatuh tempo ${df === 0 ? "hari ini" : df + " hari lagi"}`, rp(left), "debts", "warn"]);
  });
  const day = new Date().getDate(), dim = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  if (day >= 7 && pm.out > 0) {
    const proj = st.out / day * dim;
    if (proj > pm.out * 1.15) o.push(["📈", "Pengeluaran cenderung naik", `Proyeksi ${rp(proj)} bulan ini vs ${rp(pm.out)} bulan lalu`, "report", "warn"]);
    else if (proj < pm.out * 0.85 && st.out > 0) o.push(["🌱", "Pengeluaran lebih hemat", `Proyeksi ${rp(proj)} vs ${rp(pm.out)} bulan lalu`, "report", "good"]);
  }
  return o.sort((a, b) => (b[4] === "bad") - (a[4] === "bad")).slice(0, 4);
}

const VIEWS = {};

/* ---------- Beranda ---------- */
VIEWS.home = r => {
  const m = mkey(new Date()), st = stats(r, m), bal = totalBal(r), ins = insights(r);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));
  const series = days.map(d => ({ l: dayShort(d), v: sum(r.tx.filter(t => t.d === d && t.t === homeSeries && !t.x), t => t.a), hi: d === today() }));
  const w7 = sum(series, s => s.v);
  const recent = sortTx(r.tx).slice(0, 5);
  const main = r.pos ? st.profit : st.net;
  return `${topBar(r)}
  <section class="hero"><small>${S.profile.name ? "Halo, " + esc(S.profile.name) + " 👋 · " : ""}Total saldo</small>
    <div class="hero-row"><div><span>▲ Masuk</span><b>${rp(st.inc)}</b></div><div><span>▼ Keluar</span><b>${rp(st.out)}</b></div><div><span>${r.pos ? "Laba bersih" : "Selisih"}</span><b class="${main >= 0 ? "" : "neg-l"}">${rp(main)}</b></div></div>
    <div class="hero-foot">${monthLabel(m)} · ${st.n} transaksi</div></section>
  <nav class="qa">
    <button data-act="addTx" data-t="out"><i>➖</i>Keluar</button>
    <button data-act="addTx" data-t="in"><i>➕</i>Masuk</button>
    <button data-act="addTx" data-t="tf"><i>🔁</i>Transfer</button>
    ${r.pos ? `<button data-act="go" data-v="pos"><i>🛒</i>Kasir</button>` : `<button data-act="go" data-v="goals"><i>🎯</i>Target</button>`}
  </nav>
  <div class="sec-h"><h3>Dompet</h3><button class="link" data-act="go" data-v="wallets">Kelola</button></div>
  <div class="wallets">${r.wallets.map(w => `<div class="wcard"><span>${esc(w.icon)}</span><small>${esc(w.name)}</small><b>${rp(walletBal(r, w))}</b></div>`).join("")}<button class="wcard add" data-act="addWallet"><span>＋</span><small>Dompet</small></button></div>
  ${ins.length ? `<div class="sec-h"><h3>Perlu perhatian</h3></div><div class="insights">${ins.map(i => `<button class="insight ${i[4]}" data-act="go" data-v="${i[3]}"><span class="in-ic">${i[0]}</span><span><b>${esc(i[1])}</b><small>${esc(i[2])}</small></span></button>`).join("")}</div>` : ""}
  <div class="sec-h"><h3>7 hari terakhir</h3><div class="chips s"><button class="chip ${homeSeries === "out" ? "on" : ""}" data-act="series" data-v="out">Keluar</button><button class="chip ${homeSeries === "in" ? "on" : ""}" data-act="series" data-v="in">Masuk</button></div></div>
  <div class="card">${barChart(series)}<div class="card-foot"><span>Total 7 hari</span><b>${rp(w7)}</b></div></div>
  <div class="sec-h"><h3>Kategori ${r.pos ? "biaya" : "pengeluaran"} bulan ini</h3></div>
  <div class="card">${catBreakdown(r, st.cats)}</div>
  <div class="sec-h"><h3>Terbaru</h3><button class="link" data-act="go" data-v="tx">Lihat semua</button></div>
  ${recent.length ? `<div class="card flush">${recent.map(t => txRow(r, t)).join("")}</div>` : empty("🧾", "Belum ada transaksi", "Catat pemasukan atau pengeluaran pertama Anda.", `<button class="btn primary" data-act="addTx" data-t="out">Catat sekarang</button>`)}
  ${S.rooms.length > 1 ? `<div class="sec-h"><h3>Semua room</h3></div><div class="card flush">${S.rooms.map(x => `<button class="room-row ${x.id === r.id ? "on" : ""}" data-act="pickRoom" data-id="${x.id}" style="--accent:${x.color}"><span class="room-ic">${esc(x.icon)}</span><span class="room-nm"><b>${esc(x.name)}</b><small>Bulan ini: ${rp(stats(x, m).inc)} masuk · ${rp(stats(x, m).out)} keluar</small></span><span class="room-bal">${rp(totalBal(x))}</span></button>`).join("")}<div class="room-total"><span>Gabungan semua room</span><b>${rp(sum(S.rooms, totalBal))}</b></div></div>` : ""}`;
};

/* ---------- Transaksi ---------- */
function txFiltered(r) {
  const f = TX, q = f.q.toLowerCase();
  return sortTx(r.tx.filter(t => t.d.startsWith(f.m) && (!f.t || t.t === f.t) && (!f.c || t.c === f.c) && (!q || `${t.n || ""} ${t.c || ""} ${t.cust || ""}`.toLowerCase().includes(q))));
}
function txListHtml(r) {
  const list = txFiltered(r);
  const inc = sum(list.filter(t => t.t === "in" && !t.x), t => t.a), out = sum(list.filter(t => t.t === "out" && !t.x), t => t.a);
  return `<div class="sum3"><div><small>Masuk</small><b class="pos">${rp(inc)}</b></div><div><small>Keluar</small><b class="neg">${rp(out)}</b></div><div><small>Selisih</small><b>${rp(inc - out)}</b></div></div>` +
    (list.length ? groupedTx(r, list) : empty("🔍", "Tidak ada transaksi", r.tx.length ? "Coba ubah bulan atau filter pencarian." : "Tekan tombol ＋ untuk mencatat transaksi pertama."));
}
VIEWS.tx = r => {
  const cats = [...new Set([...catList(r, "out"), ...catList(r, "in")].map(c => c.n))];
  return `${topBar(r)}<h1 class="h1">Transaksi</h1>${monthNav(TX.m, "txMonth")}
  <div class="search"><input id="txQ" type="search" placeholder="Cari catatan, kategori, pelanggan…" value="${esc(TX.q)}"></div>
  <div class="chips"><button class="chip ${!TX.t ? "on" : ""}" data-act="txType" data-v="">Semua</button><button class="chip ${TX.t === "in" ? "on" : ""}" data-act="txType" data-v="in">Masuk</button><button class="chip ${TX.t === "out" ? "on" : ""}" data-act="txType" data-v="out">Keluar</button><button class="chip ${TX.t === "tf" ? "on" : ""}" data-act="txType" data-v="tf">Transfer</button>
  <select id="txC" class="chip sel"><option value="">Semua kategori</option>${cats.map(c => `<option ${TX.c === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
  <div id="txList">${txListHtml(r)}</div>`;
};

/* ---------- Kasir ---------- */
function posGridHtml(r) {
  const q = posQ.toLowerCase(), c = cart();
  const list = r.products.filter(p => !q || p.n.toLowerCase().includes(q));
  if (!r.products.length) return empty("🧊", "Belum ada produk", "Tambahkan produk dagangan (harga jual & modal) agar bisa dijual lewat kasir.", `<button class="btn primary" data-act="addProduct">＋ Tambah produk</button>`);
  if (!list.length) return empty("🔍", "Produk tidak ditemukan", "Coba kata kunci lain.");
  return `<div class="pgrid">${list.map(p => {
    const q2 = c[p.id] || 0, out = p.st != null && p.st <= 0, low = p.st != null && p.st > 0 && p.st <= (p.min || 0);
    return `<div class="pcard ${q2 ? "in" : ""} ${out ? "out" : ""}"><button class="p-main" data-act="addCart" data-id="${p.id}" ${out ? "disabled" : ""}><span class="p-ic">${esc(p.i)}</span><b>${esc(p.n)}</b><span class="p-pr">${rp(p.pr)}</span><small class="${low || out ? "warn" : ""}">${out ? "Habis" : p.st != null ? `Stok ${p.st} ${esc(p.u)}` : "Tanpa stok"}</small></button>${q2 ? `<div class="p-q"><button data-act="subCart" data-id="${p.id}" aria-label="Kurangi">−</button><b>${q2}</b><button data-act="addCart" data-id="${p.id}" aria-label="Tambah">+</button></div>` : ""}</div>`;
  }).join("")}</div>`;
}
function cartBarHtml() {
  const items = cartItems(), n = sum(items, i => i.q);
  if (!n) return "";
  return `<div class="cartbar"><button class="cb-info" data-act="clearCart"><span>🛒 ${n} item</span><small>Kosongkan</small></button><button class="btn primary" data-act="checkout">Bayar ${rp(cartTotal())}</button></div>`;
}
VIEWS.pos = r => {
  if (!r.pos) return `${topBar(r)}${empty("🛒", "Kasir belum aktif", "Aktifkan fitur Kasir & Stok untuk room ini agar bisa berjualan dan menghitung laba otomatis.", `<button class="btn primary" data-act="enablePos">Aktifkan Kasir & Stok</button>`)}`;
  const todayTx = r.tx.filter(t => t.d === today() && t.s), rev = sum(todayTx, t => t.a);
  const profit = sum(todayTx, t => t.a - sum(t.s, i => i.co * i.q));
  return `${topBar(r)}<div class="pos-head"><h1 class="h1">Kasir</h1><button class="btn sm" data-act="go" data-v="products">📦 Produk & stok</button></div>
  <div class="sum3"><div><small>Penjualan hari ini</small><b class="pos">${rp(rev)}</b></div><div><small>Transaksi</small><b>${todayTx.length}</b></div><div><small>Laba kotor</small><b>${rp(profit)}</b></div></div>
  <div class="search"><input id="posQ" type="search" placeholder="Cari produk…" value="${esc(posQ)}"></div>
  <div id="posGrid">${posGridHtml(r)}</div>
  ${todayTx.length ? `<div class="sec-h"><h3>Penjualan hari ini</h3></div><div class="card flush">${sortTx(todayTx).map(t => txRow(r, t)).join("")}</div>` : ""}
  <div id="cartBar">${cartBarHtml()}</div>`;
};

/* ---------- Produk & stok ---------- */
VIEWS.products = r => {
  const low = r.products.filter(p => p.st != null && p.st <= (p.min || 0)).length;
  const val = sum(r.products, p => (p.st || 0) * (p.co || 0));
  return `${subHead("Produk & Stok", `<button class="btn primary sm" data-act="addProduct">＋ Produk</button>`)}
  <div class="sum3"><div><small>Jumlah produk</small><b>${r.products.length}</b></div><div><small>Stok menipis</small><b class="${low ? "neg" : ""}">${low}</b></div><div><small>Nilai stok (modal)</small><b>${short(val)}</b></div></div>
  ${r.products.length ? `<div class="card flush">${r.products.map(p => {
    const mg = p.pr ? Math.round((p.pr - (p.co || 0)) / p.pr * 100) : 0, isLow = p.st != null && p.st <= (p.min || 0);
    return `<div class="prow"><span class="tx-ic">${esc(p.i)}</span><span class="tx-m"><b>${esc(p.n)}</b><small>${rp(p.pr)} · modal ${rp(p.co || 0)} · margin ${mg}%</small></span><span class="stk ${isLow ? "low" : ""}">${p.st == null ? "—" : p.st + " " + esc(p.u)}</span><span class="prow-b"><button class="btn sm" data-act="restock" data-id="${p.id}">＋Stok</button><button class="btn sm" data-act="editProduct" data-id="${p.id}">Ubah</button></span></div>`;
  }).join("")}</div>` : empty("📦", "Belum ada produk", "Tambahkan produk dagangan Anda.", `<button class="btn primary" data-act="addProduct">＋ Tambah produk</button>`)}`;
};

/* ---------- Anggaran ---------- */
VIEWS.budget = r => {
  const m = mkey(new Date()), st = stats(r, m), tot = r.budget.total;
  const now = new Date(), dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), left = dim - now.getDate() + 1;
  const p = tot ? st.out / tot * 100 : 0;
  const cats = catList(r, "out").filter(c => (st.cats[c.n] || 0) > 0 || r.budget.cat[c.n]);
  const head = r.pos ? subHead("Anggaran", `<button class="btn sm" data-act="editBudget">Atur</button>`) : `${(r)}<div class="pos-head"><h1 class="h1">Anggaran</h1><button class="btn sm" data-act="editBudget">Atur</button></div>`;
  return `${head}
  <section class="card big-card"><small>${monthLabel(m)}</small>
    ${tot ? `<h2>${rp(Math.max(0, tot - st.out))}<span> tersisa</span></h2>${prog(p, p >= 100 ? "bad" : p >= 80 ? "warn" : "")}<div class="card-foot"><span>${rp(st.out)} dari ${rp(tot)} (${Math.round(p)}%)</span><b>${tot > st.out ? rp((tot - st.out) / left) + "/hari" : "Terlampaui"}</b></div>` : `<h2>${rp(st.out)}<span> terpakai</span></h2><p class="muted">Belum ada anggaran bulanan. Atur batas agar dapat peringatan sebelum boros.</p><button class="btn primary" data-act="editBudget">Atur anggaran</button>`}</section>
  <div class="sec-h"><h3>Per kategori</h3></div>
  ${cats.length ? `<div class="card">${cats.map(c => {
    const v = st.cats[c.n] || 0, l = r.budget.cat[c.n], pp = l ? v / l * 100 : (st.out ? v / st.out * 100 : 0);
    return `<div class="brow"><div class="brow-t"><span>${c.i} ${esc(c.n)}</span><b>${rp(v)}${l ? ` <small>/ ${rp(l)}</small>` : ""}</b></div>${prog(pp, l ? (pp >= 100 ? "bad" : pp >= 80 ? "warn" : "") : "mute")}</div>`;
  }).join("")}</div>` : empty("📊", "Belum ada pengeluaran bulan ini", "Rincian per kategori akan muncul di sini.")}
  <div class="sec-h"><h3>Target tabungan</h3><button class="link" data-act="go" data-v="goals">Semua</button></div>
  ${r.goals.length ? `<div class="card flush">${r.goals.slice(0, 3).map(g => goalHtml(g, true)).join("")}</div>` : `<button class="card add-card" data-act="addGoal">🎯 Buat target tabungan</button>`}`;
};

/* ---------- Target ---------- */
function goalHtml(g, compact) {
  const p = g.target ? g.saved / g.target * 100 : 0;
  let need = "";
  if (g.due && g.target > g.saved) {
    const dl = daysBetween(today(), g.due);
    if (dl > 0) need = `Perlu ${rp((g.target - g.saved) / Math.max(1, dl / 30))}/bulan sampai ${dateLabel(g.due)}`;
    else need = "Tenggat sudah lewat";
  }
  return `<div class="goal"><div class="goal-t"><span class="tx-ic">${esc(g.i)}</span><span class="tx-m"><b>${esc(g.n)}</b><small>${p >= 100 ? "Tercapai 🎉" : need || `${Math.round(p)}% tercapai`}</small></span><b class="g-p">${Math.round(p)}%</b></div>${prog(p, p >= 100 ? "good" : "")}
    <div class="card-foot"><span>${rp(g.saved)} / ${rp(g.target)}</span>${compact ? "" : `<span class="g-b"><button class="btn sm" data-act="goalMove" data-id="${g.id}">＋ Setor/Tarik</button><button class="btn sm" data-act="editGoal" data-id="${g.id}">Ubah</button></span>`}</div></div>`;
}
VIEWS.goals = r => `${subHead("Target Tabungan", `<button class="btn primary sm" data-act="addGoal">＋ Target</button>`)}
  ${r.goals.length ? `<div class="stack">${r.goals.map(g => `<div class="card">${goalHtml(g)}</div>`).join("")}</div>` : empty("🎯", "Belum ada target", "Buat target (mesin baru, liburan, dana darurat) dan pantau progresnya.", `<button class="btn primary" data-act="addGoal">＋ Buat target</button>`)}`;

/* ---------- Utang & piutang ---------- */
VIEWS.debts = r => {
  const list = r.debts.filter(d => d.k === debtTab).sort((a, b) => (!debtLeft(a) - !debtLeft(b)) || (a.due || "9").localeCompare(b.due || "9"));
  const left = sum(list, debtLeft), td = today();
  return `${subHead("Utang & Piutang", `<button class="btn primary sm" data-act="addDebt">＋ Catat</button>`)}
  <div class="seg wide"><button class="${debtTab === "piutang" ? "on" : ""}" data-act="debtTab" data-v="piutang">Piutang (ke saya)</button><button class="${debtTab === "utang" ? "on" : ""}" data-act="debtTab" data-v="utang">Utang (saya)</button></div>
  <div class="card sum-card"><small>${debtTab === "piutang" ? "Total yang belum diterima" : "Total yang harus dibayar"}</small><h2 class="${debtTab === "utang" && left ? "neg" : ""}">${rp(left)}</h2></div>
  ${list.length ? `<div class="stack">${list.map(d => {
    const lf = debtLeft(d), p = d.a ? debtPaid(d) / d.a * 100 : 0, df = d.due ? daysBetween(td, d.due) : null;
    const badge = !lf ? `<span class="pill good">Lunas</span>` : df === null ? "" : df < 0 ? `<span class="pill bad">Telat ${-df} hari</span>` : `<span class="pill ${df <= 3 ? "warn" : ""}">${df === 0 ? "Hari ini" : df + " hari lagi"}</span>`;
    return `<div class="card debt ${!lf ? "done" : ""}"><div class="goal-t"><span class="tx-ic">${debtTab === "piutang" ? "🙋" : "🧾"}</span><span class="tx-m"><b>${esc(d.who)}</b><small>${esc(d.n || "")}${d.due ? " · tempo " + dateLabel(d.due) : ""}</small></span>${badge}</div>
    <div class="debt-amt"><b>${rp(lf)}</b><small>dari ${rp(d.a)}</small></div>${prog(p, "good")}
    <div class="g-b right">${lf ? `<button class="btn sm primary" data-act="payDebt" data-id="${d.id}">${d.k === "utang" ? "Bayar" : "Terima"}</button>` : ""}<button class="btn sm" data-act="editDebt" data-id="${d.id}">Ubah</button></div></div>`;
  }).join("")}</div>` : empty(debtTab === "piutang" ? "🙋" : "🧾", "Belum ada catatan", debtTab === "piutang" ? "Catat pelanggan/teman yang berutang agar tidak lupa menagih." : "Catat utang agar pembayaran tidak terlewat.", `<button class="btn primary" data-act="addDebt">＋ Catat</button>`)}`;
};

/* ---------- Berulang ---------- */
VIEWS.rec = r => `${subHead("Transaksi Berulang", `<button class="btn primary sm" data-act="addRec">＋ Baru</button>`)}
  <p class="muted pad">Dicatat otomatis saat aplikasi dibuka pada tanggalnya. Cocok untuk gaji, sewa, listrik, cicilan, langganan.</p>
  ${r.rec.length ? `<div class="card flush">${r.rec.map(x => `<button class="tx" data-act="editRec" data-id="${x.id}"><span class="tx-ic">${catIcon(r, x.t, x.c)}</span><span class="tx-m"><b>${esc(x.n)}</b><small>${{ daily: "Harian", weekly: "Mingguan", monthly: "Bulanan" }[x.f]} · berikutnya ${dateLabel(x.next)}</small></span><span class="tx-a ${x.t === "in" ? "pos" : "neg"}">${x.t === "in" ? "+" : "−"}${rp(x.a)}</span></button>`).join("")}</div>` : empty("🔁", "Belum ada transaksi berulang", "Tambahkan agar tidak perlu mencatat hal yang sama setiap bulan.", `<button class="btn primary" data-act="addRec">＋ Tambah</button>`)}`;

/* ---------- Dompet ---------- */
VIEWS.wallets = r => `${subHead("Dompet", `<button class="btn primary sm" data-act="addWallet">＋ Dompet</button>`)}
  <div class="card sum-card"><small>Total saldo</small><h2>${rp(totalBal(r))}</h2></div>
  <div class="card flush">${r.wallets.map(w => `<button class="tx" data-act="editWallet" data-id="${w.id}"><span class="tx-ic">${esc(w.icon)}</span><span class="tx-m"><b>${esc(w.name)}</b><small>Saldo awal ${rp(w.init || 0)}</small></span><span class="tx-a">${rp(walletBal(r, w))}</span></button>`).join("")}</div>
  <button class="btn block" data-act="addTx" data-t="tf">🔁 Transfer antar dompet</button>`;

/* ---------- Kategori ---------- */
VIEWS.cats = r => `${subHead("Kategori")}
  ${["out", "in"].map(t => `<div class="sec-h"><h3>${t === "out" ? "Pengeluaran" : "Pemasukan"}</h3><button class="link" data-act="addCat" data-t="${t}">＋ Tambah</button></div>
  <div class="card"><div class="tags">${catList(r, t).map(c => `<span class="tag">${c.i} ${esc(c.n)}<button data-act="delCat" data-t="${t}" data-n="${esc(c.n)}" aria-label="Hapus ${esc(c.n)}">×</button></span>`).join("")}</div></div>`).join("")}`;

/* ---------- Laporan ---------- */
VIEWS.report = r => {
  const st = stats(r, repM), pm = stats(r, addMonths(repM, -1));
  const months = Array.from({ length: 6 }, (_, i) => addMonths(repM, i - 5));
  const trend = months.map(m => { const s = stats(r, m); return { l: monthShort(m), a: s.inc, b: s.out + (r.pos ? s.hpp : 0) }; });
  const delta = (a, b) => b ? `<small class="${a > b ? "neg" : "pos"}">${a > b ? "▲" : "▼"} ${Math.abs(Math.round((a - b) / b * 100))}% vs bln lalu</small>` : "";
  const items = Object.values(st.items).sort((a, b) => b.profit - a.profit).slice(0, 5);
  return `${subHead("Laporan")}${monthNav(repM, "repMonth")}
  <section class="card pl">
    ${r.pos ? `<div class="pl-r"><span>Penjualan & pemasukan</span><b>${rp(st.inc)}</b></div><div class="pl-r"><span>HPP (modal barang terjual)</span><b class="neg">−${rp(st.hpp)}</b></div><div class="pl-r sub"><span>Laba kotor</span><b>${rp(st.gross)}</b></div><div class="pl-r"><span>Biaya operasional</span><b class="neg">−${rp(st.out)}</b></div><div class="pl-r tot"><span>Laba bersih</span><b class="${st.profit >= 0 ? "pos" : "neg"}">${rp(st.profit)}</b></div>${st.stock ? `<small class="muted">Belanja stok ${rp(st.stock)} tidak dihitung sebagai biaya (sudah masuk HPP saat terjual).</small>` : ""}`
      : `<div class="pl-r"><span>Pemasukan</span><b class="pos">${rp(st.inc)}</b>${delta(st.inc, pm.inc)}</div><div class="pl-r"><span>Pengeluaran</span><b class="neg">${rp(st.out)}</b>${delta(st.out, pm.out)}</div><div class="pl-r tot"><span>Selisih</span><b class="${st.net >= 0 ? "pos" : "neg"}">${rp(st.net)}</b></div>${st.inc > 0 ? `<small class="muted">Rasio tabungan: ${Math.round(st.net / st.inc * 100)}% dari pemasukan</small>` : ""}`}
  </section>
  <div class="sec-h"><h3>Tren 6 bulan</h3><span class="legend-i"><i class="pos"></i>Masuk <i class="neg"></i>Keluar${r.pos ? " + HPP" : ""}</span></div><div class="card">${trendChart(trend)}</div>
  <div class="sec-h"><h3>${r.pos ? "Biaya" : "Pengeluaran"} per kategori</h3></div><div class="card">${catBreakdown(r, st.cats)}</div>
  ${Object.keys(st.incCats).length ? `<div class="sec-h"><h3>Sumber pemasukan</h3></div><div class="card">${catBreakdown(r, st.incCats, "in")}</div>` : ""}
  ${r.pos && items.length ? `<div class="sec-h"><h3>Produk terlaris (laba)</h3></div><div class="card flush">${items.map((i, n) => `<div class="prow"><span class="rank">${n + 1}</span><span class="tx-m"><b>${esc(i.n)}</b><small>${i.q} terjual · omzet ${rp(i.rev)}</small></span><b class="pos">${rp(i.profit)}</b></div>`).join("")}</div>` : ""}
  <div class="actions-row"><button class="btn" data-act="exportCsv">⬇ CSV bulan ini</button><button class="btn" data-act="shareReport">📤 Bagikan</button><button class="btn" data-act="printReport">🖨 Cetak / PDF</button></div>`;
};

/* ---------- Menu ---------- */
VIEWS.more = r => {
  const tiles = [
    ["report", "📊", "Laporan", "Laba rugi & tren"], ["budget", "🎯", "Anggaran", "Batas per kategori"], ["goals", "🐷", "Target", "Tabungan impian"],
    ["debts", "🤝", "Utang & Piutang", `${r.debts.filter(d => debtLeft(d)).length} aktif`], ["rec", "🔁", "Berulang", `${r.rec.length} jadwal`], ["wallets", "👛", "Dompet", `${r.wallets.length} dompet`],
    ...(r.pos ? [["pos", "🛒", "Kasir", "Jual & nota"], ["products", "📦", "Produk & Stok", `${r.products.length} produk`]] : []),
    ["cats", "🏷️", "Kategori", "Atur kategori"], ["settings", "⚙️", "Pengaturan", "Tema, PIN, backup"]
  ];
  return `${topBar(r)}<h1 class="h1">Menu</h1>
  <div class="tiles">${tiles.map(t => `<button class="tile" data-act="go" data-v="${t[0]}"><span>${t[1]}</span><b>${t[2]}</b><small>${t[3]}</small></button>`).join("")}</div>
  <div class="sec-h"><h3>Room</h3><button class="link" data-act="newRoom">＋ Room baru</button></div>
  <div class="card flush">${S.rooms.map(x => `<button class="room-row ${x.id === r.id ? "on" : ""}" data-act="pickRoom" data-id="${x.id}" style="--accent:${x.color}"><span class="room-ic">${esc(x.icon)}</span><span class="room-nm"><b>${esc(x.name)}</b><small>${ROOM_TYPES[x.type]?.label || ""}${x.pos ? " · Kasir aktif" : ""}</small></span><span class="room-bal">${rp(totalBal(x))}</span></button>`).join("")}</div>
  <button class="btn block" data-act="editRoom" data-id="${r.id}">✏️ Ubah room "${esc(r.name)}"</button>`;
};

/* ---------- Pengaturan ---------- */
VIEWS.settings = r => `${subHead("Pengaturan")}
  <div class="card flush" style="margin-top:6px"><button class="tx" data-act="profile">${avatar("md")}<span class="tx-m"><b>${esc(S.profile.name || "Atur profil")}</b><small>Ubah nama & foto</small></span><span class="caret">›</span></button></div>
  <div class="sec-h"><h3>Tampilan</h3></div>
  <div class="seg wide">${[["auto", "Otomatis"], ["light", "Terang"], ["dark", "Gelap"]].map(([k, l]) => `<button class="${S.settings.theme === k ? "on" : ""}" data-act="theme" data-v="${k}">${l}</button>`).join("")}</div>
  <div class="sec-h"><h3>Keamanan</h3></div>
  <div class="card flush"><button class="tx" data-act="setPin"><span class="tx-ic">🔒</span><span class="tx-m"><b>${S.settings.pin ? "Ganti PIN" : "Pasang PIN"}</b><small>${S.settings.pin ? "Aplikasi terkunci saat dibuka" : "Kunci aplikasi dengan 4 angka"}</small></span></button>
  ${S.settings.pin ? `<button class="tx" data-act="delPin"><span class="tx-ic">🔓</span><span class="tx-m"><b>Hapus PIN</b></span></button>` : ""}</div>
  <div class="sec-h"><h3>Data</h3></div>
  <div class="card flush">
    <button class="tx" data-act="backup"><span class="tx-ic">💾</span><span class="tx-m"><b>Backup semua data</b><small>Simpan file JSON (semua room)</small></span></button>
    <button class="tx" data-act="restore"><span class="tx-ic">📥</span><span class="tx-m"><b>Pulihkan dari backup</b><small>Menimpa data saat ini</small></span></button>
    <button class="tx" data-act="exportAll"><span class="tx-ic">📄</span><span class="tx-m"><b>Ekspor CSV room ini</b><small>Semua transaksi, buka di Excel</small></span></button>
    <button class="tx" data-act="resetAll"><span class="tx-ic">🗑️</span><span class="tx-m"><b>Hapus semua data</b><small>Tidak bisa dibatalkan</small></span></button></div>
      <div class="sec-h"><h3>Tentang</h3></div>
  <div class="card flush">
    <button class="tx" data-act="go" data-v="about"><span class="tx-ic">ℹ️</span><span class="tx-m"><b>Tentang aplikasi</b><small>Fitur dan versi</small></span><span class="caret">›</span></button>
    <button class="tx" data-act="go" data-v="dev"><span class="tx-ic">👨‍💻</span><span class="tx-m"><b>Tentang developer</b><small>Kenalan dengan pembuatnya</small></span><span class="caret">›</span></button>
  </div>
  <input type="file" id="fileRestore" accept="application/json,.json" hidden>
  ${window._installEvt ? `<button class="btn primary block" data-act="install">📲 Pasang aplikasi di perangkat</button>` : ""}
  <p class="muted pad center">DuitTrack Pro v2.0<br>Data tersimpan di perangkat ini (localStorage). Lakukan backup berkala.</p>`;
/* ===== ISI SENDIRI: info developer & aplikasi ===== */
const DEV = {
  name: "Miftah Faturahman",                       // ← ganti nama Anda
  role: "Developer DuitTrack Pro",         // ← ganti jabatan/julukan
  photo: "icons/developer.jpg",            // ← foto Anda (lihat langkah 5)
  quote: "Building Digital Experiences Saya Fatur, developer independen yang terus belajar, bereksperimen, dan mengembangkan solusi digital melalui kode. DuitTrack merupakan salah satu proyek saya yang berfokus pada pengelolaan keuangan pribadi dengan antarmuka modern, fitur yang praktis, dan pengalaman pengguna yang nyaman.Setiap proyek adalah kesempatan untuk belajar, berkembang, dan menciptakan sesuatu yang lebih baik.Designed to be useful. Built to keep improving. © 2026 @panggilsayafatur.",  // ← ganti kata-kata Anda
  links: [                                 // ← hapus/tambah/ganti sesuai kebutuhan
    ["📸", "Instagram", "https://instagram.com/@panggilsayafatur"],
    ["💬", "WhatsApp", "https://wa.me/6285935103665"],
    ["🌐", "Website", "https://miftahfaturahman501-commits.github.io/PORTOFOLIO-/"]
  ]
};
const APP_INFO = {
  version: "2.0",
  tagline: "Catat keuangan pribadi, keluarga, dan usaha dalam satu aplikasi.",
  features: [
    ["🏠", "Multi-Room", "Pisahkan keuangan pribadi, usaha, keluarga, dan acara dalam room berbeda."],
    ["👛", "Banyak Dompet", "Tunai, bank, dan e-wallet lengkap dengan transfer antar dompet."],
    ["🛒", "Kasir & Stok", "Jual produk, hitung kembalian, cetak nota, stok berkurang otomatis."],
    ["📊", "Laporan Laba Rugi", "Penjualan, modal, biaya, dan laba bersih. Bisa ekspor CSV atau PDF."],
    ["🎯", "Anggaran & Target", "Batas pengeluaran per kategori dan target tabungan."],
    ["🤝", "Utang & Piutang", "Pantau cicilan dan jatuh tempo."],
    ["🔁", "Transaksi Berulang", "Gaji, sewa, dan cicilan tercatat otomatis."],
    ["🔒", "PIN & Backup", "Kunci aplikasi dan simpan cadangan data kapan saja."],
    ["📴", "Bisa Offline", "Data tersimpan di perangkat Anda, tanpa perlu internet."]
  ]
};

/* ---------- Tentang Aplikasi ---------- */
VIEWS.about = () => `${subHead("Tentang Aplikasi")}
  <section class="about-hero"><img src="icons/icon-192.png" alt="Logo"><h2>DuitTrack Pro</h2><small>Versi ${APP_INFO.version}</small>
    <p class="muted">${esc(APP_INFO.tagline)}</p></section>
  <div class="sec-h"><h3>Fitur</h3></div>
  <div class="card flush">${APP_INFO.features.map(f => `<div class="feat"><span class="tx-ic">${f[0]}</span><span><b>${esc(f[1])}</b><small>${esc(f[2])}</small></span></div>`).join("")}</div>
  <p class="muted pad center">Data Anda tersimpan di perangkat ini dan tidak dikirim ke server mana pun. Lakukan backup secara berkala.</p>`;

/* ---------- Tentang Developer ---------- */
VIEWS.dev = () => `${subHead("Tentang Developer")}
  <section class="card dev-card">
    <div class="dev-photo"><img src="${esc(DEV.photo)}" alt="Foto ${esc(DEV.name)}" onerror="this.remove()"><span>${esc(DEV.name.trim().charAt(0).toUpperCase())}</span></div>
    <h2 class="dev-name">${esc(DEV.name)}</h2><p class="dev-role">${esc(DEV.role)}</p>
    <blockquote class="dev-quote">“${esc(DEV.quote)}”</blockquote>
  </section>
  ${DEV.links.length ? `<div class="sec-h"><h3>Hubungi saya</h3></div><div class="card flush">${DEV.links.map(l => `<a class="tx" href="${esc(l[2])}" target="_blank" rel="noopener noreferrer"><span class="tx-ic">${l[0]}</span><span class="tx-m"><b>${esc(l[1])}</b><small>${esc(l[2].replace(/^https?:\/\//, ""))}</small></span><span class="caret">›</span></a>`).join("")}</div>` : ""}`;