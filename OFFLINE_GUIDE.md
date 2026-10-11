# 🏆 PANDUAN OFFLINE & BUNDLING (.EXE) APLIKASI SCORING PENCAK SILAT

Dokumen ini menjelaskan arsitektur **Offline-First** aplikasi ini, cara menggunakan sistem di arena pertandingan tanpa koneksi internet (menggunakan jaringan lokal/Wi-Fi/LAN), serta langkah-langkah mudah untuk mengemas (bundling) aplikasi menjadi file **Installer `.exe` Windows** siap pakai yang ringan, mandiri, dan berkualitas profesional tanpa risiko blank page (layar putih).

---

## ⚡ Arsitektur Jaringan Lokal Offline (LAN/Wi-Fi)

Aplikasi ini menggunakan teknologi **Server-Sent Events (SSE)** yang berjalan langsung di memori komputer utama (server) tanpa memerlukan koneksi internet Cloud. 

### Skema Alur Kerja Offline di Arena:
```
                               +------------------------+
                               |     KOMPUTER UTAMA     |
                               | (Menjalankan Aplikasi) |
                               +-----------+------------+
                                           | (Mengaktifkan Wi-Fi / LAN)
                                           v
                        +------------------+------------------+
                        |                                     |
                        v                                     v
             +----------+----------+               +----------+----------+
             |    TABLET JURI 1    |               |    LAPTOP DEWAN     |
             |   (Buka via Chrome) |               |   (Buka via Chrome) |
             +---------------------+               +---------------------+
```

### Cara Menghubungkan Juri & Dewan Tanpa Internet:
1. **Gunakan Router Wi-Fi / Hotspot Portabel**: Siapkan router Wi-Fi di arena pertandingan (tidak perlu dicolokkan ke kabel internet).
2. **Hubungkan Semua Perangkat**: Sambungkan komputer utama (server), tablet para Juri, dan laptop Ketua Dewan ke Wi-Fi yang sama.
3. **Cek IP Address Server**:
   - Di Windows: Buka Command Prompt, ketik `ipconfig`, cari bagian IPv4 Address (misal: `192.168.1.100`).
   - Di Mac/Linux: Buka Terminal, ketik `ifconfig` atau `ip a`.
4. **Buka Aplikasi di Perangkat Juri/Dewan**:
   - Di tablet Juri & laptop Dewan, buka Google Chrome lalu ketik:
     ```text
     http://192.168.1.100:3000
     ```
   - Pilih peran sesuai perangkat (Juri 1-3 atau Dewan), dan semua penilaian akan langsung terkirim secara instan ke layar monitor utama tanpa jeda!

---

## 📦 Panduan Membuat Aplikasi Installer `.exe` (Electron)

Untuk mengubah aplikasi ini menjadi aplikasi desktop Windows mandiri (.exe) dengan ikon kustom, kita menggunakan **Electron** dan **Electron Builder**.

### Langkah 1: Tambahkan Konfigurasi di `package.json`

Buka file `package.json` Anda, lalu tambahkan konfigurasi di bawah ini agar proses pengemasan berjalan mulus.

#### 1. Tambahkan `main` property di level atas:
```json
"main": "electron-main.cjs",
```

#### 2. Pastikan script di dalam bagian `"scripts"` adalah sebagai berikut:
```json
"scripts": {
  "dev": "tsx server.ts",
  "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --external:vite --sourcemap --outfile=dist/server.cjs",
  "start": "node dist/server.cjs",
  "clean": "rm -rf dist server.js",
  "lint": "tsc --noEmit",
  "electron:dev": "electron .",
  "electron:pack": "npm run build && electron-builder --dir",
  "electron:dist": "npm run build && electron-builder"
},
```

> **Mengapa ini krusial?** Perintah `esbuild` mem-bundle seluruh dependencies produksi (seperti `express` dan `dotenv`) secara mandiri ke dalam `dist/server.cjs` (tanpa menyertakan `vite` yang khusus dev). Hal ini menghasilkan file server tunggal yang mandiri dan tidak memerlukan folder `node_modules` di dalam installer .exe, sehingga aplikasi menjadi super ringan dan bebas dari masalah blank page akibat modul tidak ditemukan!

#### 3. Tambahkan konfigurasi `build` untuk `electron-builder` di level atas `package.json`:
```json
"build": {
  "appId": "com.pencaksilat.scoring",
  "productName": "ScoringSilat",
  "directories": {
    "output": "dist_desktop"
  },
  "files": [
    "dist/**/*",
    "electron-main.cjs",
    "package.json"
  ],
  "win": {
    "target": [
      "nsis"
    ],
    "icon": "dist/LogoIPSI.png"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "Scoring Pencak Silat"
  }
}
```

---

### Langkah 2: Instalasi Dependensi Desktop (Lakukan di Terminal Anda)

Jalankan perintah ini di direktori proyek Anda untuk menginstal Electron sebagai dependensi development:

```bash
npm install -D electron electron-builder
```

---

### Langkah 3: Uji Coba Mode Desktop (Development)

Untuk menguji coba jalannya aplikasi dalam jendela desktop Electron sebelum membuat installer:
1. Pastikan Anda sudah mem-build server terlebih dahulu:
   ```bash
   npm run build
   ```
2. Jalankan perintah Electron:
   ```bash
   npm run electron:dev
   ```

---

### Langkah 4: Membuat Installer `.exe` Siap Pakai!

Untuk memproduksi file installer `.exe` Windows yang ringan, mandiri, dan dapat langsung diinstal di komputer mana pun tanpa membutuhkan Node.js terinstal:

Jalankan perintah berikut:
```bash
npm run electron:dist
```

Setelah proses selesai, cari folder baru bernama **`dist_desktop/`** di dalam folder proyek Anda. Di dalamnya terdapat file installer bernama:
👉 **`ScoringSilat Setup 1.0.exe`**

---

## 💎 Tips Kinerja Ringan & Profesional

- **Penyimpanan Teraplikasi (Clean Assets)**: Seluruh file ikon dan logo diletakkan rapi di dalam folder `/public/`. Folder ini secara otomatis dikompilasi oleh Vite langsung ke dalam target `/dist/` sehingga tidak menyampah di root folder Anda.
- **Auto-Recover**: Jendela desktop telah diprogram untuk otomatis memuat ulang halaman secara cerdas jika koneksi lokal sempat terputus sesaat.
- **Sistem Backend In-Process**: Berbeda dengan fork proses latar belakang tradisional yang rawan diblokir firewall Windows, Electron pada aplikasi ini menjalankan server Express secara langsung in-process (dalam satu runtime V8) sehingga terjamin 100% andal, aman, dan instan.
