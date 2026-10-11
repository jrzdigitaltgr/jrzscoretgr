# Panduan Integrasi Aplikasi Kategori Seni Eksternal ke Portal IPSI

Panduan ini menjelaskan langkah demi langkah untuk mengintegrasikan aplikasi penilaian kategori Seni/Jurus yang telah Anda miliki atau buat secara terpisah (di luar repositori ini) agar bersatu ke dalam **Portal Utama IPSI**.

Terdapat dua (2) metode utama untuk melakukan integrasi ini:
1. **Metode A: Integrasi Kode Langsung (React Component)** — *Sangat direkomendasikan jika aplikasi luar Anda juga berbasis React.*
2. **Metode B: Integrasi Iframe (Web-based)** — *Paling cepat jika aplikasi luar Anda sudah di-deploy/di-host secara online di server lain.*

---

## 🛠️ METODE A: Integrasi Kode Langsung (React Component)

Jika aplikasi luar Anda ditulis menggunakan React, Anda dapat memindahkan kode komponennya langsung ke dalam proyek ini.

### Langkah 1: Pindahkan Berkas Komponen Anda
1. Salin berkas komponen utama aplikasi seni luar Anda (misalnya `SeniScoringLuar.tsx` atau `AppSeni.tsx`).
2. Tempelkan berkas tersebut ke dalam folder `/src/components/` di proyek ini.
3. Pastikan ekspor komponen tersebut menggunakan format default atau bernama yang jelas, contoh:
   ```tsx
   export default function SeniScoringLuar({ onBack }: { onBack: () => void }) { ... }
   ```

### Langkah 2: Daftarkan Komponen di `src/App.tsx`
1. Buka berkas `/src/App.tsx`.
2. Tambahkan baris impor komponen Anda di bagian atas:
   ```typescript
   import SeniScoringLuar from "./components/SeniScoringLuar";
   ```
3. Cari blok percabangan router tampilan di sekitar baris `330-360` (`if (activeApp === "seni")`):
   ```tsx
   // Ganti komponen SeniScoringView bawaan dengan komponen baru Anda:
   if (activeApp === "seni") {
     return (
       <SeniScoringLuar 
         onBack={() => handleSetActiveApp("portal")}
         isFullscreen={isFullscreen}
       />
     );
   }
   ```

### Langkah 3: Sesuaikan Sinkronisasi Data Atlit (Opsional)
Agar aplikasi seni eksternal Anda dapat membaca database atlit yang terdaftar dari menu **Pendaftaran** secara langsung, gunakan kunci `localStorage` yang sama:
- Di dalam kode aplikasi seni luar Anda, muat data atlit terdaftar dengan memanggil:
  ```typescript
  const savedAthletes = localStorage.getItem("registered_athletes");
  if (savedAthletes) {
    const list = JSON.parse(savedAthletes);
    // Masukkan ke state pilihan atlit di aplikasi Anda
  }
  ```

---

## 🌐 METODE B: Integrasi Menggunakan Iframe (Embed Link)

Jika aplikasi luar Anda dideploy secara terpisah di platform lain (seperti Netlify, Vercel, Firebase Hosting, dll.) atau dikembangkan menggunakan teknologi non-React (HTML murni, Vue, Angular, dll.), Anda dapat menampilkannya secara langsung di dalam portal menggunakan `<iframe>`.

### Langkah 1: Buka `src/components/SeniScoringView.tsx`
1. Buka berkas `/src/components/SeniScoringView.tsx`.
2. Ubah seluruh struktur isi komponen tersebut untuk me-render `<iframe>` yang mengarah ke URL aplikasi eksternal Anda.

### Contoh Implementasi Kode Iframe:
```tsx
import React from "react";
import { ArrowLeft, Maximize2 } from "lucide-react";

export default function SeniScoringView({ onBack, isFullscreen }: { onBack: () => void; isFullscreen: boolean }) {
  // GANTI URL DI BAWAH INI DENGAN URL APLIKASI SENI EKSTERNAL ANDA
  const EXTERNAL_SENI_APP_URL = "https://aplikasi-seni-anda.netlify.app";

  return (
    <div className="w-full h-screen bg-[#070116] flex flex-col font-sans select-none overflow-hidden text-white">
      {/* Header Kendali Atas */}
      <header className="border-b border-purple-950/80 bg-[#0b0422]/90 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full border border-purple-900/50 hover:border-purple-400 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="text-[10px] font-mono font-bold text-yellow-400 uppercase tracking-widest block">PORTAL DIGITAL SKORING</span>
            <h1 className="text-md font-black tracking-wider uppercase text-white">APLIKASI SENI EKSTERNAL</h1>
          </div>
        </div>
        <div className="text-xs text-zinc-500 font-mono">
          EMBEDDED VIEW
        </div>
      </header>

      {/* Frame Kontainer */}
      <div className="flex-1 w-full h-full relative bg-[#070116]">
        <iframe
          src={EXTERNAL_SENI_APP_URL}
          title="Aplikasi Kategori Seni Eksternal"
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; camera; microphone"
          sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
```

---

## ⚡ Sinkronisasi Pengundian & Bagan (Bracket)

Setiap atlit yang didaftarkan dan diundi nomor urutnya dari menu **3. Pendaftaran** disimpan ke dalam penyimpanan lokal peramban (`localStorage`) dengan struktur data sebagai berikut:

- `registered_athletes`: Daftar seluruh atlit yang diinputkan.
- `match_schedules`: Daftar bagan pertandingan yang diatur.

Jika aplikasi luar Anda berjalan di domain yang sama (misalnya berada dalam satu bundle aplikasi build), Anda dapat saling membaca data tersebut untuk meminimalisir entri data berulang.
