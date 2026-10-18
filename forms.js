"use strict";
/* ============ Sheet, form generik, dan semua form entitas ============ */
const sheet = () => $("#sheet");
function openSheet(html) {
  const d = sheet();
  d.innerHTML = html;
  if (!d.open) d.showModal();
}
function closeSheet() { const d = sheet(); if (d.open) d.close(); }

let toastTimer;
function toast(msg, undo) {
  const el = $("#toast");
  el.innerHTML = esc(msg) + (undo ? ` <button type="button" data-undo>Urungkan</button>` : "");
  el._undo = undo || null;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), undo ? 5500 : 2600);
}
/* hapus dengan opsi urungkan: snapshot seluruh state */
function withUndo(msg, fn) {
  const snap = JSON.stringify(S);
  fn(); save(); render();
  toast(msg, () => { S = JSON.parse(snap); save(); render(); toast("Dikembalikan"); });
}
function confirmBox(msg, label = "Hapus") {
  return new Promise(res => {
    openSheet(`<div class="sheet-body"><div class="grab"></div><h2>Yakin?</h2><p class="muted">${esc(msg)}</p>
      <div class="sheet-actions"><button type="button" class="btn" data-c="0">Batal</button><button type="button" class="btn danger" data-c="1">${esc(label)}</button></div></div>`);
    const d = sheet();
    const h = e => { const b = e.target.closest("[data-c]"); if (!b) return; d.removeEventListener("click", h); closeSheet(); res(b.dataset.c === "1"); };
    d.addEventListener("click", h);
    d.addEventListener("close", () => { d.removeEventListener("click", h); res(false); }, { once: true });
  });
}

function fieldHtml(f, v) {
  const val = v ?? f.def ?? "";
  const show = f.showIf ? ` data-showif="${f.showIf}"` : "";
  const req = f.req && !f.showIf ? " required" : "";
  const hint = f.hint ? `<small class="hint">${esc(f.hint)}</small>` : "";
  let inner = "";
  switch (f.type) {
    case "seg":
      inner = `<div class="seg"><input type="hidden" name="${f.k}" value="${esc(val)}">${f.opts.map(([k, l]) => `<button type="button" data-pick="${f.k}" data-v="${esc(k)}" class="${k == val ? "on" : ""}">${esc(l)}</button>`).join("")}</div>`; break;
    case "select":
      inner = `<label>${esc(f.label)}<select name="${f.k}">${f.opts.map(([k, l]) => `<option value="${esc(k)}"${k == val ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`; break;
    case "money":
      inner = `<label>${esc(f.label)}<input name="${f.k}" inputmode="numeric" data-money class="${f.big ? "big" : ""}" placeholder="0" value="${val ? fmt(val) : ""}"${req}></label>`; break;
    case "number":
      inner = `<label>${esc(f.label)}<input name="${f.k}" type="number" inputmode="decimal" step="any" min="0" value="${val === null ? "" : esc(val)}" placeholder="${esc(f.ph || "")}"${req}></label>`; break;
    case "date":
      inner = `<label>${esc(f.label)}<input name="${f.k}" type="date" value="${esc(val)}"${req}></label>`; break;
    case "check":
      inner = `<label class="chk"><input type="checkbox" name="${f.k}"${val ? " checked" : ""}><span>${esc(f.label)}</span></label>`; break;
    case "emoji":
      inner = `<label>${esc(f.label)}<input name="${f.k}" maxlength="8" value="${esc(val)}" class="emoji-in"></label><div class="picks">${(f.picks || CAT_ICONS).map(e => `<button type="button" data-pick="${f.k}" data-v="${e}">${e}</button>`).join("")}</div>`; break;
    case "color":
      inner = `<div class="lbl-s">${esc(f.label)}</div><input type="hidden" name="${f.k}" value="${esc(val)}"><div class="swatches">${ROOM_COLORS.map(c => `<button type="button" data-pick="${f.k}" data-v="${c}" style="--c:${c}" class="${c === val ? "on" : ""}" aria-label="${c}"></button>`).join("")}</div>`; break;
    default:
      inner = `<label>${esc(f.label)}<input name="${f.k}" type="text" value="${esc(val)}" placeholder="${esc(f.ph || "")}"${req}></label>`;
  }
  return `<div class="fld"${show}>${inner}${hint}</div>`;
}
function readForm(form, fields) {
  const o = {};
  for (const f of fields) {
    const el = form.elements[f.k];
    if (!el) continue;
    if (f.type === "check") o[f.k] = el.checked;
    else if (f.type === "money") o[f.k] = num(el.value);
    else if (f.type === "number") o[f.k] = el.value === "" ? null : Number(el.value);
    else o[f.k] = String(el.value).trim();
  }
  return o;
}
function openForm(o) {
  const data = o.data || {};
  openSheet(`<form class="sheet-body" autocomplete="off" novalidate><div class="grab"></div>
    <div class="sheet-head"><div><h2>${esc(o.title)}</h2>${o.sub ? `<p class="muted">${o.sub}</p>` : ""}</div><button type="button" class="x" data-close aria-label="Tutup">✕</button></div>
    ${o.fields.map(f => fieldHtml(f, data[f.k])).join("")}
    ${o.extra || ""}
    <div class="sheet-actions">${o.danger ? `<button type="button" class="btn danger" data-danger>${esc(o.danger.label || "Hapus")}</button>` : ""}<button class="btn primary" type="submit">${esc(o.submit || "Simpan")}</button></div></form>`);
  const form = $("#sheet form");
  const refresh = () => {
    const v = readForm(form, o.fields);
    $$("[data-showif]", form).forEach(el => { const [k, vals] = el.dataset.showif.split("="); el.hidden = !vals.split("|").includes(String(v[k])); });
    if (o.onChange) o.onChange(v, form);
  };
  form.addEventListener("input", e => {
    if (e.target.matches("[data-money]")) {
      const n = num(e.target.value);
      e.target.value = n ? fmt(n) : "";
    }
    refresh();
  });
  form.addEventListener("change", refresh);
  form.addEventListener("click", e => {
    const p = e.target.closest("[data-pick]");
    if (!p) return;
    form.elements[p.dataset.pick].value = p.dataset.v;
    $$(`[data-pick="${p.dataset.pick}"]`, form).forEach(b => b.classList.toggle("on", b === p));
    refresh();
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    for (const f of o.fields) {
      if (!f.req || (f.showIf && form.elements[f.k]?.closest("[hidden]"))) continue;
      const el = form.elements[f.k];
      const empty = f.type === "money" ? num(el.value) <= 0 : !String(el.value).trim();
      if (empty) { toast(`Isi "${f.label}" dulu`); el.focus(); return; }
    }
    if (o.onSubmit(readForm(form, o.fields)) !== false) closeSheet();
  });
  if (o.danger) $("[data-danger]", form).onclick = () => o.danger.fn();
  refresh();
  const first = $("input[data-money],input[type=text]:not(.emoji-in)", form);
  if (first && !o.noFocus) setTimeout(() => first.focus({ preventScroll: true }), 120);
}

/* ---------- opsi umum ---------- */
const walletOpts = (r, none) => (none ? [["", none]] : []).concat(r.wallets.map(w => [w.id, `${w.icon} ${w.name}`]));
const catOpts = (r, t) => catList(r, t).map(c => [c.n, `${c.i} ${c.n}`]);

/* ---------- Transaksi ---------- */
function removeTx(r, id) {
  const t = r.tx.find(x => x.id === id);
  if (!t) return;
  if (t.s) {
    t.s.forEach(i => { const p = r.products.find(x => x.id === i.p); if (p && p.st != null) p.st += i.q; });
    r.debts = r.debts.filter(d => d.ref !== id);
  }
  if (t.pid) r.debts.forEach(d => { d.pays = (d.pays || []).filter(p => p.tx !== id); });
  if (t.restock) { const p = r.products.find(x => x.id === t.restock.p); if (p && p.st != null) p.st = Math.max(0, p.st - t.restock.q); }
  r.tx = r.tx.filter(x => x.id !== id);
}
function txForm(id, pre = {}) {
  const r = R(), old = id ? r.tx.find(t => t.id === id) : null;
  if (old && (old.s || old.pid || old.restock)) return txInfo(old);
  const t = old ? old.t : (pre.t || "out");
  const w2def = (r.wallets.find(w => w.id !== (old ? old.w : r.wallets[0].id)) || r.wallets[0]).id;
  const data = {
    t, a: old ? old.a : "", cOut: old && old.t === "out" ? old.c : undefined, cIn: old && old.t === "in" ? old.c : undefined,
    w: old ? old.w : r.wallets[0].id, w2: old && old.w2 ? old.w2 : w2def, d: old ? old.d : (pre.d || today()), n: old ? old.n : ""
  };
  openForm({
    title: old ? "Ubah transaksi" : "Catat transaksi", data, noFocus: false,
    fields: [
      { k: "t", type: "seg", opts: [["out", "Pengeluaran"], ["in", "Pemasukan"], ["tf", "Transfer"]] },
      { k: "a", type: "money", label: "Jumlah (Rp)", big: true, req: true },
      { k: "cOut", type: "select", label: "Kategori", opts: catOpts(r, "out"), showIf: "t=out" },
      { k: "cIn", type: "select", label: "Kategori", opts: catOpts(r, "in"), showIf: "t=in" },
      { k: "w", type: "select", label: "Dompet", opts: walletOpts(r) },
      { k: "w2", type: "select", label: "Ke dompet", opts: walletOpts(r), showIf: "t=tf" },
      { k: "d", type: "date", label: "Tanggal", req: true },
      { k: "n", type: "text", label: "Catatan", ph: "Opsional, mis. beli es batu" }
    ],
    danger: old ? { fn: async () => { if (await confirmBox("Hapus transaksi ini?")) withUndo("Transaksi dihapus", () => removeTx(R(), id)); } } : null,
    onSubmit: v => {
      if (v.t === "tf" && v.w === v.w2) { toast("Dompet asal dan tujuan harus berbeda"); return false; }
      if (v.t !== "tf" && !(v.t === "out" ? v.cOut : v.cIn)) { toast("Pilih kategori"); return false; }
      const rec = { id: old ? old.id : uid(), t: v.t, a: v.a, c: v.t === "out" ? v.cOut : v.t === "in" ? v.cIn : "Transfer", n: v.n, d: v.d || today(), w: v.w };
      if (v.t === "tf") rec.w2 = v.w2;
      const rr = R();
      if (old) { const i = rr.tx.findIndex(x => x.id === old.id); const m = Object.assign({}, old, rec); if (v.t !== "tf") delete m.w2; rr.tx[i] = m; }
      else rr.tx.push(rec);
      save(); render(); toast(old ? "Perubahan disimpan" : "Transaksi dicatat ✓");
    }
  });
}
function txInfo(t) {
  const r = R();
  if (t.s) return showNota(t);
  const what = t.pid ? "Transaksi ini bagian dari pembayaran utang/piutang. Ubah lewat menu Utang & Piutang." : "Transaksi ini adalah pembelian stok. Ubah lewat Produk & Stok.";
  openSheet(`<div class="sheet-body"><div class="grab"></div><div class="sheet-head"><h2>${esc(t.c)}</h2><button type="button" class="x" data-close>✕</button></div>
    <p class="big-amt ${t.t === "in" ? "pos" : "neg"}">${t.t === "in" ? "+" : "−"}${rp(t.a)}</p><p class="muted">${dateLabel(t.d)} · ${esc(wName(r, t.w))}${t.n ? "<br>" + esc(t.n) : ""}</p><p class="muted">${what}</p>
    <div class="sheet-actions"><button class="btn danger" data-act="delTxInfo" data-id="${t.id}">Hapus</button><button class="btn primary" data-close>Tutup</button></div></div>`);
}

/* ---------- Room ---------- */
function roomForm(id) {
  const old = id ? S.rooms.find(r => r.id === id) : null;
  const typeOpts = Object.entries(ROOM_TYPES).map(([k, v]) => [k, `${v.icon} ${v.label}`]);
  const data = old ? { name: old.name, icon: old.icon, color: old.color, pos: old.pos } : { type: "business", name: "", icon: "🏪", color: "#3b82f6", pos: true };
  const fields = [
    { k: "name", type: "text", label: "Nama room", ph: "mis. Es FTR, Keluarga, Rumah Kos", req: true },
    ...(old ? [] : [{ k: "type", type: "select", label: "Jenis (menentukan kategori bawaan)", opts: typeOpts }]),
    { k: "icon", type: "emoji", label: "Ikon", picks: ROOM_ICONS },
    { k: "color", type: "color", label: "Warna" },
    { k: "pos", type: "check", label: "Aktifkan Kasir & Stok produk (cocok untuk usaha dagang)" }
  ];
  openForm({
    title: old ? "Ubah room" : "Room baru", sub: old ? "" : "Setiap room punya dompet, kategori, anggaran, dan laporan sendiri.", data, fields, noFocus: !!old,
    onChange: (v, form) => { if (!old && form._lt !== v.type) { form._lt = v.type; const T = ROOM_TYPES[v.type]; if (T && form._touched) { form.elements.icon.value = T.icon; form.elements.color.value = T.color; $$('[data-pick="color"]', form).forEach(b => b.classList.toggle("on", b.dataset.v === T.color)); form.elements.pos.checked = v.type === "business"; } form._touched = true; } },
    danger: old && S.rooms.length > 1 ? { fn: async () => { if (await confirmBox(`Hapus room "${old.name}" beserta semua datanya?`)) withUndo("Room dihapus", () => { S.rooms = S.rooms.filter(r => r.id !== id); S.settings.active = S.rooms[0].id; go("home", false); }); } } : null,
    onSubmit: v => {
      if (old) { Object.assign(old, { name: v.name, icon: v.icon || old.icon, color: v.color || old.color, pos: v.pos }); save(); render(); toast("Room diperbarui"); return; }
      const r = mkRoom(v.type, v.name, v.icon, v.color, v.pos);
      S.rooms.push(r); S.settings.active = r.id; save(); go("home", false); toast(`Room "${r.name}" dibuat`);
    }
  });
}
function roomSwitcher() {
  const items = S.rooms.map(r => `<button type="button" class="room-row ${r.id === S.settings.active ? "on" : ""}" data-act="pickRoom" data-id="${r.id}" style="--accent:${r.color}">
    <span class="room-ic">${esc(r.icon)}</span><span class="room-nm"><b>${esc(r.name)}</b><small>${ROOM_TYPES[r.type]?.label || ""} · ${r.tx.length} transaksi</small></span><span class="room-bal">${rp(totalBal(r))}</span></button>`).join("");
  openSheet(`<div class="sheet-body"><div class="grab"></div><div class="sheet-head"><h2>Room</h2><button type="button" class="x" data-close>✕</button></div>
    <p class="muted">Pisahkan keuangan pribadi, usaha, keluarga, atau acara dalam room berbeda.</p>
    <div class="room-list">${items}</div>
    <div class="sheet-actions"><button class="btn" data-act="editRoom" data-id="${S.settings.active}">Ubah room ini</button><button class="btn primary" data-act="newRoom">＋ Room baru</button></div></div>`);
}

/* ---------- Dompet & kategori ---------- */
function walletForm(id) {
  const r = R(), old = id ? r.wallets.find(w => w.id === id) : null;
  openForm({
    title: old ? "Ubah dompet" : "Dompet baru", data: old ? { n: old.name, i: old.icon, init: old.init } : { i: "💵" },
    fields: [
      { k: "n", type: "text", label: "Nama dompet", ph: "mis. BCA, DANA, Laci kasir", req: true },
      { k: "i", type: "emoji", label: "Ikon", picks: ["💵", "🏦", "📱", "💳", "🏧", "🧰", "🐷", "👛"] },
      { k: "init", type: "money", label: "Saldo awal (Rp)", hint: "Saldo sebelum transaksi pertama yang dicatat di aplikasi." }
    ],
    danger: old ? { fn: async () => {
      if (r.wallets.length < 2) return toast("Minimal satu dompet");
      if (r.tx.some(t => t.w === id || t.w2 === id)) return toast("Dompet dipakai transaksi, tidak bisa dihapus");
      if (await confirmBox(`Hapus dompet "${old.name}"?`)) withUndo("Dompet dihapus", () => { r.wallets = r.wallets.filter(w => w.id !== id); });
    } } : null,
    onSubmit: v => {
      if (old) Object.assign(old, { name: v.n, icon: v.i || old.icon, init: v.init });
      else r.wallets.push({ id: uid(), name: v.n, icon: v.i || "💵", init: v.init });
      save(); render(); toast("Dompet disimpan");
    }
  });
}
function catForm(type) {
  openForm({
    title: type === "in" ? "Kategori pemasukan" : "Kategori pengeluaran", data: { i: "📦" },
    fields: [{ k: "n", type: "text", label: "Nama kategori", req: true }, { k: "i", type: "emoji", label: "Ikon" }],
    onSubmit: v => {
      const list = catList(R(), type);
      if (list.some(c => c.n.toLowerCase() === v.n.toLowerCase())) { toast("Kategori sudah ada"); return false; }
      list.push({ n: v.n, i: v.i || "📦" }); save(); render();
    }
  });
}

/* ---------- Anggaran ---------- */
function budgetForm() {
  const r = R(), data = { total: r.budget.total };
  const cats = catList(r, "out");
  cats.forEach((c, i) => data["c" + i] = r.budget.cat[c.n] || "");
  openForm({
    title: "Atur anggaran bulanan", sub: "Kosongkan untuk tanpa batas. Notifikasi muncul saat mendekati batas.", data,
    fields: [{ k: "total", type: "money", label: "Anggaran total per bulan (Rp)" }, ...cats.map((c, i) => ({ k: "c" + i, type: "money", label: `${c.i} Batas ${c.n}` }))],
    onSubmit: v => {
      r.budget.total = v.total; r.budget.cat = {};
      cats.forEach((c, i) => { if (v["c" + i] > 0) r.budget.cat[c.n] = v["c" + i]; });
      save(); render(); toast("Anggaran disimpan");
    }
  });
}

/* ---------- Target tabungan ---------- */
function goalForm(id) {
  const r = R(), old = id ? r.goals.find(g => g.id === id) : null;
  openForm({
    title: old ? "Ubah target" : "Target baru", data: old ? { n: old.n, i: old.i, target: old.target, saved: old.saved, due: old.due } : { i: "🎯" },
    fields: [
      { k: "n", type: "text", label: "Nama target", ph: "mis. Beli mesin es, Liburan", req: true },
      { k: "i", type: "emoji", label: "Ikon", picks: ["🎯", "🏍️", "📱", "💻", "🏠", "✈️", "🎓", "💍", "🏪", "🐷"] },
      { k: "target", type: "money", label: "Target dana (Rp)", req: true },
      { k: "saved", type: "money", label: "Sudah terkumpul (Rp)" },
      { k: "due", type: "date", label: "Tenggat (opsional)" }
    ],
    danger: old ? { fn: async () => { if (await confirmBox(`Hapus target "${old.n}"?`)) withUndo("Target dihapus", () => { r.goals = r.goals.filter(g => g.id !== id); }); } } : null,
    onSubmit: v => {
      const rec = { n: v.n, i: v.i || "🎯", target: v.target, saved: v.saved, due: v.due };
      if (old) Object.assign(old, rec); else r.goals.push({ id: uid(), ...rec });
      save(); render(); toast("Target disimpan");
    }
  });
}
function goalMoveForm(id) {
  const r = R(), g = r.goals.find(x => x.id === id);
  openForm({
    title: `${g.i} ${g.n}`, sub: `Terkumpul ${rp(g.saved)} dari ${rp(g.target)}`, data: { m: "in", w: r.wallets[0].id },
    fields: [
      { k: "m", type: "seg", opts: [["in", "Setor"], ["out", "Tarik"]] },
      { k: "a", type: "money", label: "Jumlah (Rp)", big: true, req: true },
      { k: "rec", type: "check", label: "Catat juga di arus kas dompet" },
      { k: "w", type: "select", label: "Dompet", opts: walletOpts(r), showIf: "rec=true" }
    ],
    submit: "Simpan",
    onSubmit: v => {
      if (v.m === "out" && v.a > g.saved) { toast("Melebihi dana terkumpul"); return false; }
      g.saved += v.m === "in" ? v.a : -v.a;
      if (v.rec) r.tx.push({ id: uid(), t: v.m === "in" ? "out" : "in", a: v.a, c: "Tabungan", n: g.n, d: today(), w: v.w, x: true, gl: true });
      save(); render(); toast(v.m === "in" ? "Tabungan bertambah 🎉" : "Dana ditarik");
    }
  });
}

/* ---------- Utang & Piutang ---------- */
function debtForm(id, kind) {
  const r = R(), old = id ? r.debts.find(d => d.id === id) : null;
  openForm({
    title: old ? "Ubah catatan" : "Catatan utang / piutang", data: old ? { k: old.k, who: old.who, a: old.a, due: old.due, n: old.n } : { k: kind || "piutang", w: r.wallets[0].id },
    fields: [
      { k: "k", type: "seg", opts: [["piutang", "Orang berutang ke saya"], ["utang", "Saya berutang"]] },
      { k: "who", type: "text", label: "Nama orang / pihak", req: true },
      { k: "a", type: "money", label: "Jumlah (Rp)", big: true, req: true },
      { k: "due", type: "date", label: "Jatuh tempo (opsional)" },
      { k: "n", type: "text", label: "Catatan" },
      ...(old ? [] : [{ k: "rec", type: "check", label: "Catat arus kas sekarang (uang keluar/masuk dompet)" }, { k: "w", type: "select", label: "Dompet", opts: walletOpts(r), showIf: "rec=true" }])
    ],
    danger: old ? { fn: async () => { if (await confirmBox(`Hapus catatan ${old.who}?`)) withUndo("Catatan dihapus", () => { r.debts = r.debts.filter(d => d.id !== id); }); } } : null,
    onSubmit: v => {
      if (old) { Object.assign(old, { k: v.k, who: v.who, a: v.a, due: v.due, n: v.n }); }
      else {
        r.debts.push({ id: uid(), k: v.k, who: v.who, a: v.a, due: v.due, n: v.n, pays: [], created: today() });
        if (v.rec) r.tx.push({ id: uid(), t: v.k === "utang" ? "in" : "out", a: v.a, c: v.k === "utang" ? "Pinjaman" : "Piutang", n: v.who, d: today(), w: v.w, x: true });
      }
      save(); render(); toast("Tersimpan");
    }
  });
}
function debtPayForm(id) {
  const r = R(), d = r.debts.find(x => x.id === id), left = debtLeft(d);
  openForm({
    title: d.k === "utang" ? `Bayar utang ke ${d.who}` : `Terima dari ${d.who}`, sub: `Sisa ${rp(left)}`, data: { a: left, w: r.wallets[0].id, d: today() },
    fields: [
      { k: "a", type: "money", label: "Jumlah (Rp)", big: true, req: true },
      { k: "w", type: "select", label: "Dompet", opts: walletOpts(r, "— Jangan catat di dompet —") },
      { k: "d", type: "date", label: "Tanggal" }
    ], submit: "Catat",
    onSubmit: v => {
      const a = Math.min(v.a, left), pay = { id: uid(), a, d: v.d || today() };
      if (v.w) { const t = { id: uid(), t: d.k === "utang" ? "out" : "in", a, c: d.k === "utang" ? "Bayar utang" : "Terima piutang", n: d.who, d: pay.d, w: v.w, x: true, pid: pay.id }; r.tx.push(t); pay.tx = t.id; }
      d.pays = (d.pays || []).concat(pay); save(); render(); toast(debtLeft(d) ? "Pembayaran dicatat" : "Lunas 🎉");
    }
  });
}

/* ---------- Transaksi berulang ---------- */
function recForm(id) {
  const r = R(), old = id ? r.rec.find(x => x.id === id) : null;
  openForm({
    title: old ? "Ubah transaksi berulang" : "Transaksi berulang", sub: "Dicatat otomatis saat aplikasi dibuka pada tanggalnya (mis. gaji, sewa, cicilan).",
    data: old ? { n: old.n, t: old.t, a: old.a, cOut: old.t === "out" ? old.c : undefined, cIn: old.t === "in" ? old.c : undefined, w: old.w, f: old.f, next: old.next } : { t: "out", f: "monthly", next: today(), w: r.wallets[0].id },
    fields: [
      { k: "n", type: "text", label: "Nama", ph: "mis. Sewa kios, Gaji", req: true },
      { k: "t", type: "seg", opts: [["out", "Pengeluaran"], ["in", "Pemasukan"]] },
      { k: "a", type: "money", label: "Jumlah (Rp)", req: true },
      { k: "cOut", type: "select", label: "Kategori", opts: catOpts(r, "out"), showIf: "t=out" },
      { k: "cIn", type: "select", label: "Kategori", opts: catOpts(r, "in"), showIf: "t=in" },
      { k: "w", type: "select", label: "Dompet", opts: walletOpts(r) },
      { k: "f", type: "select", label: "Ulangi", opts: [["daily", "Setiap hari"], ["weekly", "Setiap minggu"], ["monthly", "Setiap bulan"]] },
      { k: "next", type: "date", label: "Mulai / berikutnya", req: true }
    ],
    danger: old ? { fn: async () => { if (await confirmBox(`Hapus "${old.n}"? Transaksi lama tetap ada.`)) withUndo("Dihapus", () => { r.rec = r.rec.filter(x => x.id !== id); }); } } : null,
    onSubmit: v => {
      const rec = { n: v.n, t: v.t, a: v.a, c: v.t === "out" ? v.cOut : v.cIn, w: v.w, f: v.f, next: v.next, day: pd(v.next).getDate() };
      if (old) Object.assign(old, rec); else r.rec.push({ id: uid(), ...rec });
      save(); runRecurring(); render(); toast("Tersimpan");
    }
  });
}

/* ---------- Produk, stok, kasir ---------- */
function productForm(id) {
  const r = R(), old = id ? r.products.find(p => p.id === id) : null;
  openForm({
    title: old ? "Ubah produk" : "Produk baru", data: old ? { n: old.n, i: old.i, pr: old.pr, co: old.co, st: old.st, min: old.min, u: old.u } : { i: "🥤", u: "pcs", min: 5 },
    fields: [
      { k: "n", type: "text", label: "Nama produk", ph: "mis. Es Teh Jumbo", req: true },
      { k: "i", type: "emoji", label: "Ikon", picks: ["🥤", "🧋", "🍧", "🍨", "🧊", "🍜", "🍗", "☕", "🍞", "🛍️", "📦", "🍹"] },
      { k: "pr", type: "money", label: "Harga jual (Rp)", req: true },
      { k: "co", type: "money", label: "Harga modal / HPP per unit (Rp)", hint: "Dipakai untuk menghitung laba kotor." },
      { k: "st", type: "number", label: "Stok saat ini", ph: "kosongkan = tidak dihitung", hint: "Stok berkurang otomatis saat terjual di Kasir." },
      { k: "min", type: "number", label: "Peringatan stok menipis di bawah" },
      { k: "u", type: "text", label: "Satuan", ph: "pcs, cup, porsi, kg" }
    ],
    danger: old ? { fn: async () => { if (await confirmBox(`Hapus produk "${old.n}"? Riwayat penjualan tetap tersimpan.`)) withUndo("Produk dihapus", () => { r.products = r.products.filter(p => p.id !== id); }); } } : null,
    onSubmit: v => {
      const rec = { n: v.n, i: v.i || "📦", pr: v.pr, co: v.co, st: v.st, min: v.min ?? 0, u: v.u || "pcs" };
      if (old) Object.assign(old, rec); else r.products.push({ id: uid(), ...rec });
      save(); render(); toast("Produk disimpan");
    }
  });
}
function restockForm(id) {
  const r = R(), p = r.products.find(x => x.id === id);
  openForm({
    title: `Tambah stok — ${p.n}`, sub: `Stok sekarang: ${p.st ?? "tidak dihitung"} ${p.u}`, data: { rec: true, upd: true, w: r.wallets[0].id },
    fields: [
      { k: "q", type: "number", label: `Jumlah masuk (${p.u})`, req: true },
      { k: "cost", type: "money", label: "Total biaya belanja (Rp)" },
      { k: "rec", type: "check", label: "Catat sebagai pengeluaran dompet" },
      { k: "w", type: "select", label: "Dibayar dari", opts: walletOpts(r), showIf: "rec=true" },
      { k: "upd", type: "check", label: "Perbarui harga modal per unit dari biaya ini" }
    ],
    onSubmit: v => {
      if (!v.q || v.q <= 0) { toast("Isi jumlah stok"); return false; }
      p.st = (p.st || 0) + v.q;
      if (v.cost > 0 && v.upd) p.co = Math.round(v.cost / v.q);
      if (v.cost > 0 && v.rec) r.tx.push({ id: uid(), t: "out", a: v.cost, c: "Belanja stok", n: `${p.n} ×${v.q}`, d: today(), w: v.w, x: true, inv: true, restock: { p: p.id, q: v.q } });
      save(); render(); toast("Stok ditambah");
    }
  });
}
const CART = {};
const cart = () => CART[R().id] || (CART[R().id] = {});
function cartItems() {
  const r = R(), c = cart();
  return Object.entries(c).map(([id, q]) => { const p = r.products.find(x => x.id === id); return p ? { p, q } : null; }).filter(Boolean);
}
const cartTotal = () => sum(cartItems(), i => i.p.pr * i.q);
function checkoutForm() {
  const r = R(), items = cartItems(), sub = cartTotal();
  if (!items.length) return toast("Keranjang masih kosong");
  openForm({
    title: "Pembayaran", sub: `${sum(items, i => i.q)} item · Subtotal <b>${rp(sub)}</b>`, data: { pay: "lunas", w: r.wallets[0].id },
    fields: [
      { k: "disc", type: "money", label: "Diskon (Rp)" },
      { k: "pay", type: "seg", opts: [["lunas", "Lunas"], ["utang", "Belum bayar (piutang)"]] },
      { k: "w", type: "select", label: "Uang masuk ke", opts: walletOpts(r), showIf: "pay=lunas" },
      { k: "cash", type: "money", label: "Uang diterima (untuk kembalian)", showIf: "pay=lunas" },
      { k: "cust", type: "text", label: "Nama pelanggan", ph: "opsional (wajib jika piutang)" },
      { k: "due", type: "date", label: "Jatuh tempo piutang", showIf: "pay=utang" }
    ],
    extra: `<div class="total-line"><span>Total bayar</span><b id="coTotal">${rp(sub)}</b></div><div class="total-line sub"><span>Kembalian</span><b id="coChange">—</b></div>`,
    onChange: v => {
      const tot = Math.max(0, sub - v.disc), el = $("#coTotal"); if (!el) return;
      el.textContent = rp(tot);
      $("#coChange").textContent = v.pay === "lunas" && v.cash >= tot && v.cash > 0 ? rp(v.cash - tot) : "—";
    },
    submit: "Selesaikan ✓",
    onSubmit: v => {
      if (v.pay === "utang" && !v.cust) { toast("Isi nama pelanggan untuk piutang"); return false; }
      const total = Math.max(0, sub - v.disc);
      r.seq = (r.seq || 0) + 1;
      const tx = {
        id: uid(), t: "in", a: total, c: (r.cats.in.find(c => c.n === "Penjualan") || r.cats.in[0]).n,
        n: "Kasir: " + items.map(i => `${i.p.n} ×${i.q}`).join(", "), d: today(), w: v.pay === "lunas" ? v.w : null,
        s: items.map(i => ({ p: i.p.id, n: i.p.n, q: i.q, pr: i.p.pr, co: i.p.co || 0 })), cust: v.cust, disc: v.disc, cash: v.pay === "lunas" ? v.cash : 0, no: "INV-" + String(r.seq).padStart(4, "0"), ts: Date.now()
      };
      items.forEach(i => { if (i.p.st != null) i.p.st = Math.max(0, i.p.st - i.q); });
      r.tx.push(tx);
      if (v.pay === "utang") r.debts.push({ id: uid(), k: "piutang", who: v.cust, a: total, due: v.due, n: tx.no, pays: [], ref: tx.id, created: today() });
      CART[r.id] = {}; save(); render();
      setTimeout(() => showNota(tx), 80);
    }
  });
}
function notaText(r, t) {
  const L = [`*${r.name}*`, `${t.no || "Nota"} · ${dateLabel(t.d)}`, t.cust ? `Pelanggan: ${t.cust}` : "", "------------------------"];
  t.s.forEach(i => L.push(`${i.n} ×${i.q}  ${rp(i.pr * i.q)}`));
  L.push("------------------------");
  if (t.disc) L.push(`Diskon  -${rp(t.disc)}`);
  L.push(`TOTAL  ${rp(t.a)}`);
  if (!t.w) L.push("Status: BELUM LUNAS"); else if (t.cash > t.a) L.push(`Tunai ${rp(t.cash)} · Kembali ${rp(t.cash - t.a)}`);
  L.push("", "Terima kasih 🙏");
  return L.filter((x, i) => x !== "" || i > 0).join("\n");
}
function showNota(t) {
  const r = R();
  openSheet(`<div class="sheet-body"><div class="grab"></div><div class="sheet-head"><h2>Nota ${esc(t.no || "")}</h2><button type="button" class="x" data-close>✕</button></div>
    <div class="nota"><div class="nota-h"><b>${esc(r.name)}</b><small>${dateLabel(t.d)}${t.cust ? " · " + esc(t.cust) : ""}</small></div>
    ${t.s.map(i => `<div class="nota-r"><span>${esc(i.n)} ×${i.q}</span><b>${rp(i.pr * i.q)}</b></div>`).join("")}
    ${t.disc ? `<div class="nota-r"><span>Diskon</span><b>-${rp(t.disc)}</b></div>` : ""}
    <div class="nota-r tot"><span>Total</span><b>${rp(t.a)}</b></div>
    ${t.w ? (t.cash > t.a ? `<div class="nota-r"><span>Tunai ${rp(t.cash)}</span><b>Kembali ${rp(t.cash - t.a)}</b></div>` : "") : `<div class="nota-r warn"><span>Belum lunas</span><b>Piutang</b></div>`}
    <small class="muted">Laba kotor transaksi: ${rp(t.a - sum(t.s, i => i.co * i.q))}</small></div>
    <div class="sheet-actions"><button class="btn danger" data-act="delTxInfo" data-id="${t.id}">Hapus</button><button class="btn" data-act="shareNota" data-id="${t.id}">Bagikan</button><button class="btn primary" data-close>Selesai</button></div></div>`);
}

/* ---------- Pengaturan ---------- */
function pinForm() {
  openForm({
    title: S.settings.pin ? "Ganti PIN" : "Pasang PIN", sub: "PIN 4 angka akan diminta saat aplikasi dibuka.", fields: [{ k: "p", type: "text", label: "PIN baru (4 angka)", req: true }],
    onSubmit: v => {
      if (!/^\d{4}$/.test(v.p)) { toast("PIN harus 4 angka"); return false; }
      sha(v.p).then(h => { S.settings.pin = h; save(); render(); toast("PIN dipasang 🔒"); });
    }
  });
}
/* ---------- Profil ---------- */
function profileForm() {
  let photo = S.profile.photo || "";
  const prev = () => {
    $("#avPrev").innerHTML = photo ? `<img src="${photo}" alt="">` : (esc((S.profile.name || "").trim().charAt(0).toUpperCase()) || "👤");
  };
  openForm({
    title: "Profil saya", data: { name: S.profile.name },
    fields: [{ k: "name", type: "text", label: "Nama", ph: "Nama kamu" }],
    extra: `<div class="avatar-pick"><span class="avatar lg" id="avPrev"></span>
      <div class="av-btns"><label class="btn sm">📷 Pilih foto<input type="file" id="avFile" accept="image/*" hidden></label>
      <button type="button" class="btn sm" id="avDel">Hapus foto</button></div></div>`,
    onSubmit: v => { S.profile = { name: v.name, photo }; save(); render(); toast("Profil disimpan ✓"); }
  });
  prev();
  $("#avFile").onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image();
    img.onload = () => {            // potong jadi kotak & kecilkan ke 256px supaya hemat penyimpanan
      const s = 256, c = document.createElement("canvas"); c.width = c.height = s;
      const m = Math.min(img.width, img.height);
      c.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      photo = c.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(img.src); prev();
    };
    img.src = URL.createObjectURL(f);
  };
  $("#avDel").onclick = () => { photo = ""; prev(); };
}