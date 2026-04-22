# 🚀 Deploy Bumil Pintar sebagai PWA ke Vercel

## 📁 File yang Harus Di-upload (5 file)

| File | Keterangan |
|------|-----------|
| `bumil_pintar.html` | Aplikasi utama |
| `manifest.json` | Konfigurasi PWA (nama, icon, warna) |
| `sw.js` | Service Worker — buat app bisa offline |
| `icon-192.png` | Icon app 192×192 px |
| `icon-512.png` | Icon app 512×512 px |
| `vercel.json` | Konfigurasi routing Vercel |

---

## 🛠️ Langkah Deploy

### 1️⃣ Buat Akun Vercel (gratis)
→ https://vercel.com/signup

### 2️⃣ Upload via Drag & Drop
1. Buka https://vercel.com/new
2. Klik **"Browse"** → pilih folder berisi semua 6 file
3. Klik **Deploy** → tunggu ~30 detik
4. Dapat URL: `https://nama-project.vercel.app` ✅

### 3️⃣ Aktifkan Web Analytics
1. Buka dashboard Vercel → pilih project
2. Klik tab **Analytics** → klik **Enable**
3. Selesai — data kunjungan langsung tercatat

---

## 📲 Cara Pasang di HP (Add to Homescreen)

### Android (Chrome):
1. Buka URL app di Chrome
2. Tap **⋮ menu** → **"Tambahkan ke layar utama"**
3. Atau tunggu banner "Install App" muncul otomatis
4. App muncul di homescreen seperti aplikasi asli ✅

### iOS (Safari):
1. Buka URL app di Safari
2. Tap ikon **Share ↑** → **"Tambahkan ke Layar Utama"**
3. Tap **Tambahkan** → selesai ✅

---

## ✅ Fitur PWA yang Aktif

| Fitur | Status |
|-------|--------|
| Install ke homescreen | ✅ |
| Bisa offline (tanpa internet) | ✅ (via Service Worker) |
| Icon di homescreen | ✅ |
| Splash screen biru | ✅ |
| Tampilan fullscreen (tanpa URL bar) | ✅ |
| Web Analytics (Vercel) | ✅ (setelah enable di dashboard) |

---

## 🔄 Update Aplikasi
Jika ada update file HTML:
1. Upload ulang file baru ke Vercel (drag & drop lagi)
2. Vercel otomatis deploy versi baru
3. Service Worker otomatis update di HP pengguna saat buka app

---

## 💡 Tips
- Domain custom (contoh: `bumilpintar.id`) bisa ditambahkan di Vercel → Settings → Domains
- Semua data pengguna tetap tersimpan LOKAL di HP — Vercel hanya serve file HTML
