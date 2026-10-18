"use strict";
/* ============ Grafik SVG ringan (tanpa library) ============ */
function barChart(data) {
  const W = 320, H = 156, pb = 24, pt = 18, n = data.length;
  const max = Math.max(1, ...data.map(d => d.v));
  const step = W / n, bw = Math.min(30, step * 0.56);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik batang">`;
  [0.5, 1].forEach(f => { const y = H - pb - (H - pb - pt) * f; s += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" class="grid"/>`; });
  data.forEach((d, i) => {
    const h = Math.max(d.v ? 3 : 0, (H - pb - pt) * d.v / max), x = step * i + (step - bw) / 2, y = H - pb - h;
    s += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="7" class="bar ${d.hi ? "hi" : ""}"/>`;
    if (d.v) s += `<text x="${x + bw / 2}" y="${y - 5}" class="val">${short(d.v)}</text>`;
    s += `<text x="${x + bw / 2}" y="${H - 7}" class="lbl ${d.hi ? "on" : ""}">${esc(d.l)}</text>`;
  });
  return s + "</svg>";
}

function trendChart(data) {
  const W = 320, H = 160, pb = 24, pt = 16, n = data.length;
  const max = Math.max(1, ...data.map(d => Math.max(d.a, d.b)));
  const step = W / n, bw = Math.min(16, step * 0.3);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tren pemasukan dan pengeluaran">`;
  [0.5, 1].forEach(f => { const y = H - pb - (H - pb - pt) * f; s += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" class="grid"/>`; });
  data.forEach((d, i) => {
    const cx = step * i + step / 2;
    [[d.a, "pos", -bw - 1.5], [d.b, "neg", 1.5]].forEach(([v, c, dx]) => {
      const h = Math.max(v ? 3 : 0, (H - pb - pt) * v / max);
      s += `<rect x="${cx + dx}" y="${H - pb - h}" width="${bw}" height="${h}" rx="5" class="bar2 ${c}"/>`;
    });
    s += `<text x="${cx}" y="${H - 7}" class="lbl">${esc(d.l)}</text>`;
  });
  return s + "</svg>";
}

function donut(items, center) {
  const total = sum(items, i => i.v);
  if (!total) return "";
  const r = 50, C = 2 * Math.PI * r;
  let acc = 0, s = `<svg class="donut" viewBox="0 0 140 140" role="img" aria-label="Grafik kategori"><circle cx="70" cy="70" r="${r}" class="donut-bg"/>`;
  items.forEach(it => {
    const len = C * it.v / total;
    s += `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${it.c}" stroke-width="18" stroke-dasharray="${Math.max(0, len - 1.5)} ${C - Math.max(0, len - 1.5)}" stroke-dashoffset="${-acc}" transform="rotate(-90 70 70)"/>`;
    acc += len;
  });
  return s + `<text x="70" y="66" class="d-top">${esc(center[0])}</text><text x="70" y="84" class="d-main">${esc(center[1])}</text></svg>`;
}

function catBreakdown(r, cats, type = "out") {
  const entries = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return `<p class="empty-note">Belum ada data bulan ini.</p>`;
  const total = sum(entries, e => e[1]);
  const top = entries.slice(0, 6), rest = sum(entries.slice(6), e => e[1]);
  const items = top.map(([n, v], i) => ({ n, v, c: PALETTE[i] }));
  if (rest) items.push({ n: "Lainnya", v: rest, c: PALETTE[8] });
  return `<div class="donut-wrap">${donut(items, [type === "out" ? "Keluar" : "Masuk", short(total)])}
    <ul class="legend">${items.map(i => `<li><i style="background:${i.c}"></i><span>${catIcon(r, type, i.n)} ${esc(i.n)}</span><b>${Math.round(i.v / total * 100)}%</b></li>`).join("")}</ul></div>`;
}
