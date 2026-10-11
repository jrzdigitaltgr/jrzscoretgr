# Panduan Tutorial: Menambahkan Aplikasi Kategori Seni/Jurus Eksternal ke IPSI Digital Corner

Panduan ini menjelaskan langkah demi langkah cara mengintegrasikan kode aplikasi kategori Seni/Jurus digital skoring yang dibuat dari luar proyek ke dalam platform terpadu **IPSI Digital Corner** saat ini.

---

## Ringkasan Arsitektur Integrasi
Aplikasi IPSI Digital Corner menggunakan arsitektur **Modular Component Switch** berbasis React dan Vite. Setiap sub-aplikasi diletakkan di dalam folder `/src/components/` dan dirender secara kondisional oleh `src/App.tsx` berdasarkan status state `activeApp`.

### Lokasi Berkas Utama:
1. `src/App.tsx` - Menu portal utama & pengatur peralihan modul (Tanding, Seni, Pendaftaran).
2. `src/components/SeniScoringView.tsx` - Berkas utama modul Seni / Jurus.

---

## Langkah 1: Mempersiapkan Komponen Aplikasi Eksternal Anda
Sebelum mengimpor, pastikan aplikasi Seni eksternal Anda telah disesuaikan agar dapat berjalan sebagai komponen React fungsional standar:

1. **Gunakan Ekspor Bernama atau Default**:  
   Bungkus seluruh kode aplikasi eksternal Anda dalam satu komponen React utama, misalnya `KomponenSeniEksternal`.
   ```tsx
   // Contoh pembungkusan di file eksternal Anda (misal: KomponenSeniEksternal.tsx)
   import React, { useState } from "react";
   import { Swords } from "lucide-react";

   export default function KomponenSeniEksternal({ onBack }) {
     return (
       <div className="min-h-screen bg-[#070116] text-white p-6">
         <button onClick={onBack} className="mb-4 bg-purple-700 px-4 py-2 rounded">
           Kembali ke Portal
         </button>
         {/* Seluruh logika scoring Anda diletakkan di sini */}
         <h1 className="text-2xl font-bold">Skoring Seni IPSI Eksternal</h1>
       </div>
     );
   }
   ```

2. **Gunakan Ikon dari `lucide-react`**:  
   Ganti pustaka ikon eksternal (seperti FontAwesome atau Heroicons) dengan `lucide-react` agar seragam dengan tema utama proyek.

3. **Gunakan Tailwind CSS**:  
   Pastikan penataan visual menggunakan kelas utilitas Tailwind standar yang sudah aktif di proyek ini.

---

## Langkah 2: Menyalin Berkas Komponen ke Struktur Proyek
1. Salin berkas komponen Seni eksternal Anda (misal: `KomponenSeniEksternal.tsx`) dan letakkan ke dalam direktori:
   `src/components/KomponenSeniEksternal.tsx`
2. Jika aplikasi Anda memiliki helper statis atau file audio khusus, salin ke:
   * File Utilitas/Helper: `/src/utils/`
   * Aset Suara (mp3): `/public/sounds/`

---

## Langkah 3: Mengimpor dan Mendaftarkan Aplikasi Baru di `src/App.tsx`
Untuk mengaktifkan navigasi aplikasi eksternal Anda dari menu portal utama, edit berkas `src/App.tsx`:

1. **Tambahkan Import Komponen Baru** di bagian atas berkas `src/App.tsx`:
   ```tsx
   import KomponenSeniEksternal from "./components/KomponenSeniEksternal";
   ```

2. **Daftarkan ID Aplikasi Baru** di dalam tipe state `activeApp` di `src/App.tsx`:
   ```tsx
   // Tambahkan opsi tipe baru, misalnya "seni_eksternal"
   const [activeApp, setActiveApp] = useState<"portal" | "tanding" | "seni" | "pendaftaran" | "seni_eksternal">("portal");
   ```

3. **Perbarui fungsi Switcher Aplikasi**:
   ```tsx
   const handleSetActiveApp = (app: "portal" | "tanding" | "seni" | "pendaftaran" | "seni_eksternal") => {
     setActiveApp(app);
     localStorage.setItem("silat_active_app", app);
     if (app !== "tanding") {
       handleSetRole(null);
     }
   };
   ```

4. **Tambahkan Kartu Menu pada Tampilan Grid Portal Utama**:  
   Cari baris kartu menu **Jurus / Seni** di `src/App.tsx` (sekitar baris 411) dan Anda dapat menduplikasi kartu tersebut atau mengubah klik target kartu Seni saat ini agar mengarah ke aplikasi eksternal Anda:
   ```tsx
   {/* MENU 2: JURUS / SENI EKSTERNAL */}
   <button
     id="portal-card-seni-eksternal"
     onClick={() => handleSetActiveApp("seni_eksternal")} // Membuka modul baru
     className="group relative flex flex-col items-center justify-between text-center bg-[#130737]/35 hover:bg-[#1c0c4c]/50 backdrop-blur-md border border-[#3b0764] hover:border-yellow-400/60 rounded-3xl p-8 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(234,179,8,0.15)] cursor-pointer focus:outline-none min-h-[380px]"
   >
     {/* Desain Kartu Menu Sama Seperti Jurus/Seni Saat Ini */}
   </button>
   ```

5. **Tambahkan Conditional Rendering Komponen Baru** di bagian bawah berkas `src/App.tsx` (di atas render utama):
   ```tsx
   // Render KomponenSeniEksternal langsung jika activeApp === "seni_eksternal"
   if (activeApp === "seni_eksternal") {
     return (
       <KomponenSeniEksternal 
         onBack={() => handleSetActiveApp("portal")}
         isFullscreen={isFullscreen}
       />
     );
   }
   ```

---

## Langkah 4: Sinkronisasi State Offline (Opsional tapi Sangat Direkomendasikan)
Jika aplikasi Seni eksternal Anda juga memerlukan fitur sinkronisasi multi-layar (Sekretaris, Juri, Dewan, Monitor) secara offline, Anda dapat memanfaatkan metode `localStorage` yang sudah terintegrasi di proyek ini:

1. **Menyimpan State**:  
   Gunakan fungsi utilitas penyimpanan terpusat agar layar monitor/juri lain menerima perubahan:
   ```typescript
   localStorage.setItem("silat_seni_match_state", JSON.stringify(stateAplikasiAnda));
   ```

2. **Mendengarkan Perubahan di Layar Monitor/Juri**:  
   Tambahkan listener di komponen Juri/Monitor eksternal Anda:
   ```typescript
   useEffect(() => {
     const handleSync = () => {
       const saved = localStorage.getItem("silat_seni_match_state");
       if (saved) {
         const parsed = JSON.parse(saved);
         // Perbarui state lokal komponen Anda di sini
       }
     };
     window.addEventListener("storage", handleSync);
     return () => window.removeEventListener("storage", handleSync);
   }, []);
   ```

---

## Langkah 5: Verifikasi dan Pengujian
Setelah mengintegrasikan aplikasi baru Anda, lakukan verifikasi melalui terminal workspace dengan menjalankan perintah:
1. `npm run lint` untuk memastikan tidak ada kesalahan tipe TypeScript (`tsc`).
2. `npm run build` untuk memvalidasi keberhasilan kompilasi bundel produksi Vite.

---
*Panduan ini dibuat secara eksklusif untuk membantu Tim IT IPSI agar proses digitalisasi penilaian Pencak Silat berjalan mulus, cepat, dan terintegrasi.*
