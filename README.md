# DuitTrack Pro v2

PWA keuangan pribadi + usaha, tanpa library eksternal, bisa offline.

## Fitur
- **Multi-Room**: pisahkan Pribadi, Usaha (mis. Es FTR), Keluarga, Proyek/Acara, Kuliah. Tiap room punya dompet, kategori, anggaran, target, utang, laporan sendiri.
- **Dompet** (tunai/bank/e-wallet) + transfer antar dompet, saldo otomatis.
- **Pemasukan / pengeluaran / transfer**, cari, filter bulan/jenis/kategori, edit, hapus + tombol Urungkan.
- **Kasir (POS)** untuk usaha: produk, harga jual & modal, stok otomatis berkurang, diskon, kembalian, bayar nanti (piutang), nota yang bisa dibagikan.
- **Produk & Stok**: peringatan stok menipis, tambah stok + catat belanja, HPP otomatis.
- **Laporan**: laba rugi (penjualan, HPP, laba kotor, biaya, laba bersih), tren 6 bulan, kategori, produk terlaris, ekspor CSV, bagikan, cetak/PDF.
- **Anggaran** total & per kategori, **Target tabungan** banyak, **Utang & Piutang** dengan cicilan & jatuh tempo, **Transaksi berulang**.
- Insight otomatis, tema terang/gelap, **PIN 4 angka**, backup/restore JSON.
- Data DuitTrack v1 lama otomatis dipindahkan ke room "Pribadi" jika dibuka di alamat yang sama.

## Pasang di GitHub Pages
1. Unggah semua isi folder ini (index.html, style.css, sw.js, manifest.json, folder js/ dan icons/) ke repositori.
2. Settings > Pages > branch `main`, folder `/ (root)`.
3. Buka URL di Chrome Android > menu ⋮ > Install app / Tambahkan ke layar utama.

## Update versi
Ubah `CACHE` di `sw.js` (mis. `duittrack-pro-v2.0.1`) setiap mengubah file.

Data tersimpan di localStorage perangkat: lakukan Backup berkala (Menu > Pengaturan).
