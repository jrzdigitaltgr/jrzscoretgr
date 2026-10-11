import React, { useState, useMemo } from 'react';
import { 
  X, Share2, Copy, Check, QrCode, Download, Upload, 
  Smartphone, Monitor, Users, Shield, Timer, Award,
  Wifi, HelpCircle, HardDriveDownload, FileJson
} from 'lucide-react';
import { generateQRCodeMatrix } from '../utils/qrCode';

interface ShareClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentName?: string;
}

export const ShareClientModal: React.FC<ShareClientModalProps> = ({
  isOpen,
  onClose,
  tournamentName = "JRZ SCORE TGR"
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'backup' | 'guide'>('link');
  const [selectedRole, setSelectedRole] = useState<'portal' | 'sekretaris' | 'dewan' | 'juri' | 'timer' | 'monitor'>('portal');
  const [juriNumber, setJuriNumber] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Compute origin and full link
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  
  const targetUrl = useMemo(() => {
    switch (selectedRole) {
      case 'sekretaris':
        return `${origin}/?role=sekretaris`;
      case 'dewan':
        return `${origin}/?role=dewan`;
      case 'juri':
        return `${origin}/?role=juri&id=${juriNumber}`;
      case 'timer':
        return `${origin}/?role=timer`;
      case 'monitor':
        return `${origin}/?role=monitor`;
      case 'portal':
      default:
        return `${origin}/`;
    }
  }, [origin, selectedRole, juriNumber]);

  // Generate QR code matrix for targetUrl
  const qrMatrix = useMemo(() => {
    try {
      return generateQRCodeMatrix(targetUrl);
    } catch {
      return [];
    }
  }, [targetUrl]);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `JRZ Score TGR - ${selectedRole.toUpperCase()}`,
          text: `Tautan Aplikasi Skoring JRZ Score TGR untuk ${selectedRole.toUpperCase()}`,
          url: targetUrl
        });
      } catch (err) {
        // User dismissed or share error
      }
    } else {
      handleCopy();
    }
  };

  // Export full tournament JSON
  const handleExportTournamentData = () => {
    try {
      const exportObject: Record<string, any> = {
        app: "JRZ Score TGR",
        version: "2026.1",
        exportedAt: new Date().toISOString(),
        tournamentName,
        data: {}
      };

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          exportObject.data[key] = localStorage.getItem(key);
        }
      }

      const jsonStr = JSON.stringify(exportObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JRZ_Score_TGR_${tournamentName.replace(/\s+/g, '_')}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Gagal mengekspor data: " + e);
    }
  };

  // Import tournament JSON
  const handleImportTournamentData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed && parsed.data) {
          Object.keys(parsed.data).forEach(key => {
            const val = parsed.data[key];
            if (val !== null && val !== undefined) {
              localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
            }
          });
          setImportStatus("Data turnamen berhasil dipulihkan! Memuat ulang...");
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          setImportStatus("Format berkas tidak valid.");
        }
      } catch (err) {
        setImportStatus("Gagal membaca berkas JSON: " + err);
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-gradient-to-b from-[#0a182d] via-[#061122] to-[#030814] border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(6,182,212,0.35)] text-white relative overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Glow ambient background */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#162a4a] pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Share2 size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-mono">
                BAGIKAN KE KLIEN &amp; AKSES OFFLINE
              </h2>
              <p className="text-[11px] text-cyan-300 font-mono">
                JRZ Score TGR • Sinkronisasi Multi-Perangkat Tanpa Internet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#08152c] border border-cyan-500/30 text-zinc-400 hover:text-white flex items-center justify-center transition hover:bg-[#0e2448] cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 border-b border-[#162a4a] pb-3 shrink-0">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'link'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'bg-[#08152c] text-zinc-400 hover:text-white hover:bg-[#0e2448]'
            }`}
          >
            <QrCode size={14} />
            <span>Tautan &amp; QR Code Peran</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'bg-[#08152c] text-zinc-400 hover:text-white hover:bg-[#0e2448]'
            }`}
          >
            <HardDriveDownload size={14} />
            <span>Ekspor / Impor Data</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'bg-[#08152c] text-zinc-400 hover:text-white hover:bg-[#0e2448]'
            }`}
          >
            <Wifi size={14} />
            <span>Panduan Offline Arena</span>
          </button>
        </div>

        {/* Tab 1: Links & QR Code */}
        {activeTab === 'link' && (
          <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
            
            {/* Role selector chips */}
            <div>
              <label className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-widest block mb-2">
                PILIH PERAN LAYAR KLIEN:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'portal', label: 'Portal Utama', icon: Monitor, color: 'border-cyan-500/50' },
                  { id: 'sekretaris', label: 'Sekretaris & Data', icon: Users, color: 'border-purple-500/50' },
                  { id: 'dewan', label: 'Ketua Dewan', icon: Shield, color: 'border-amber-500/50' },
                  { id: 'juri', label: 'Juri Tanding/Seni', icon: Award, color: 'border-blue-500/50' },
                  { id: 'timer', label: 'Operator Timer', icon: Timer, color: 'border-amber-400/50' },
                  { id: 'monitor', label: 'Monitor Penonton', icon: Smartphone, color: 'border-emerald-500/50' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSel = selectedRole === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedRole(item.id as any)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-mono font-bold transition-all text-left cursor-pointer ${
                        isSel
                          ? 'bg-[#0e274f] border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)] scale-[1.02]'
                          : 'bg-[#061226] border-[#162a4a] text-zinc-400 hover:text-zinc-200 hover:bg-[#0a1e3f]'
                      }`}
                    >
                      <Icon size={14} className={isSel ? 'text-cyan-400' : 'text-zinc-500'} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Juri Selector (if Juri is selected) */}
            {selectedRole === 'juri' && (
              <div className="bg-[#051124] border border-blue-500/30 p-3 rounded-2xl flex items-center justify-between gap-3">
                <span className="text-xs font-mono text-blue-300 font-bold">NOMOR JURI KLIEN:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setJuriNumber(num)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                        juriNumber === num
                          ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.6)]'
                          : 'bg-[#0b1c38] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* QR Code and Target URL Display */}
            <div className="bg-[#050e1f] border border-[#162c52] p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-5">
              
              {/* Standalone SVG QR Code */}
              <div className="bg-white p-3 rounded-2xl shadow-xl shrink-0 flex items-center justify-center">
                {qrMatrix.length > 0 ? (
                  <svg 
                    viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                    className="w-36 h-36 sm:w-40 sm:h-40"
                    shapeRendering="crispEdges"
                  >
                    <rect width={qrMatrix.length} height={qrMatrix.length} fill="#ffffff" />
                    {qrMatrix.map((row, r) =>
                      row.map((val, c) =>
                        val ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#000000" /> : null
                      )
                    )}
                  </svg>
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-black text-xs font-mono">
                    Membuat QR...
                  </div>
                )}
              </div>

              {/* URL and Share actions */}
              <div className="flex-1 w-full space-y-3">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">
                    TAUTAN LANGSUNG KLIEN:
                  </span>
                  <div className="mt-1 bg-[#030914] border border-[#162540] p-2.5 rounded-xl font-mono text-xs text-zinc-300 break-all select-all flex items-center justify-between gap-2">
                    <span className="truncate">{targetUrl}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs font-mono py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer uppercase tracking-wider"
                  >
                    {copied ? <Check size={14} className="stroke-[3]" /> : <Copy size={14} />}
                    <span>{copied ? 'Tersalin!' : 'Salin Tautan'}</span>
                  </button>

                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                      onClick={handleNativeShare}
                      className="bg-[#0b1c38] hover:bg-[#122b54] border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <Share2 size={14} />
                      <span>Bagikan</span>
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-zinc-400 font-mono leading-tight">
                  Pindai QR ini dari kamera smartphone / tablet juri di gelanggang untuk langsung masuk ke layar nilai.
                </p>
              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Export & Import */}
        {activeTab === 'backup' && (
          <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1 font-sans">
            <div className="bg-[#050e1f] border border-[#162c52] p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2.5 text-cyan-300 font-mono font-bold text-xs uppercase">
                <FileJson size={16} />
                <span>Cadangkan &amp; Pindahkan Data Turnamen (.json)</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Anda dapat mengekspor seluruh data atlet, bagan braket, nomor undian, parameter pertandingan, dan skor ke dalam satu berkas cadangan mandiri untuk dipindahkan ke laptop panitia lain tanpa internet.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleExportTournamentData}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-slate-950 font-black text-xs font-mono py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition active:scale-95 cursor-pointer uppercase tracking-wider"
                >
                  <Download size={16} className="stroke-[2.5]" />
                  <span>Unduh Berkas Turnamen (.json)</span>
                </button>

                <label className="flex-1 bg-[#0b1c38] hover:bg-[#122b54] border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer uppercase tracking-wider text-center">
                  <Upload size={16} />
                  <span>Pulihkan Berkas (.json)</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportTournamentData}
                    className="hidden"
                  />
                </label>
              </div>

              {importStatus && (
                <div className="bg-[#091830] border border-cyan-400/50 p-2.5 rounded-xl text-center text-xs font-mono text-cyan-300 animate-pulse">
                  {importStatus}
                </div>
              )}
            </div>

            <div className="bg-[#050e1f] border border-[#162c52] p-4 rounded-2xl space-y-2">
              <h4 className="text-xs font-black text-amber-400 font-mono uppercase tracking-wider">
                💡 KEAMANAN PENYIMPANAN DATA 100% LOKAL:
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Aplikasi <strong>JRZ Score TGR</strong> menyimpan semua perubahan secara otomatis di peramban (Local Storage). Mematikan komputer atau menutup peramban tidak akan menghilangkan data selama peramban tidak dihapus cache-nya.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Offline Arena Guide */}
        {activeTab === 'guide' && (
          <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1 font-sans text-xs">
            <div className="bg-[#050e1f] border border-[#162c52] p-4 rounded-2xl space-y-3">
              <h4 className="font-mono font-black text-cyan-400 text-sm uppercase flex items-center gap-2">
                <Wifi size={16} />
                CARA PENGGUNAAN ARENA 100% OFFLINE (TANPA KUOTA)
              </h4>
              
              <div className="space-y-3 text-zinc-300 leading-relaxed">
                <div className="flex items-start gap-2.5 bg-[#091528] p-3 rounded-xl border border-cyan-900/40">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-black flex items-center justify-center shrink-0 text-xs">1</span>
                  <p><strong>Satu Jaringan Wi-Fi / Hotspot:</strong> Nyalakan Hotspot dari HP atau Router Wi-Fi portabel tanpa perlu terhubung ke internet.</p>
                </div>

                <div className="flex items-start gap-2.5 bg-[#091528] p-3 rounded-xl border border-cyan-900/40">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-black flex items-center justify-center shrink-0 text-xs">2</span>
                  <p><strong>Hubungkan Seluruh Perangkat:</strong> Sambungkan Laptop Server/Sekretaris, Tablet Juri, dan Monitor Arena ke Wi-Fi yang sama.</p>
                </div>

                <div className="flex items-start gap-2.5 bg-[#091528] p-3 rounded-xl border border-cyan-900/40">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-black flex items-center justify-center shrink-0 text-xs">3</span>
                  <p><strong>Pindai QR / Buka Alamat IP:</strong> Buka alamat IP laptop host (misal <code>http://192.168.1.10:3000</code>) di tablet juri atau proyektor.</p>
                </div>

                <div className="flex items-start gap-2.5 bg-[#091528] p-3 rounded-xl border border-cyan-900/40">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-black flex items-center justify-center shrink-0 text-xs">4</span>
                  <p><strong>Pasang Aplikasi (PWA):</strong> Klik tombol <em>"Install App"</em> di browser agar aplikasi tersimpan permanen di memori perangkat dan dapat dibuka kapan saja tanpa jaringan.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-4 border-t border-[#162a4a] flex items-center justify-between text-[11px] font-mono text-zinc-400 shrink-0">
          <span>JRZ SCORE TGR • SISTEM RESMI IPSI 2026 &amp; PERSILAT</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition active:scale-95 cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
