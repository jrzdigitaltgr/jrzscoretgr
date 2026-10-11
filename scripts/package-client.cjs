const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('   JRZ SCORE TGR - PEMBUAT PAKET KLIEN OFFLINE');
console.log('====================================================\n');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const clientPackageDir = path.join(projectRoot, 'dist-client');

// 1. Build client bundle using Vite
console.log('[1/4] Menjalankan Vite Build untuk paket klien...');
try {
  execSync('npx vite build', { stdio: 'inherit', cwd: projectRoot });
  console.log('✓ Build klien berhasil.\n');
} catch (err) {
  console.error('✗ Gagal melakukan build klien:', err.message);
  process.exit(1);
}

// 2. Prepare output directory
console.log('[2/4] Menyiapkan direktori paket klien: dist-client/ ...');
if (fs.existsSync(clientPackageDir)) {
  fs.rmSync(clientPackageDir, { recursive: true, force: true });
}
fs.mkdirSync(clientPackageDir, { recursive: true });

// Copy all built assets from dist to dist-client
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDirSync(distDir, clientPackageDir);
console.log('✓ Berkas klien berhasil disalin ke dist-client/.\n');

// 3. Create zero-dependency standalone local runner script for the client
console.log('[3/4] Membuat launcher offline mandiri (jalankan-klien.cjs)...');
const launcherScript = `// JRZ Score TGR - Standalone Zero-Dependency Local Static Server
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Server Error: ' + err.message);
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('========================================================');
  console.log('   JRZ SCORE TGR - KLIEN OFFLINE BERJALAN');
  console.log('========================================================');
  console.log(\`Aplikasi dapat diakses di: http://localhost:\${PORT}\`);
  console.log(\`Untuk perangkat klien/tablet dalam jaringan lokal (Wi-Fi):\`);
  console.log(\`Buka IP Komputer ini, contoh: http://192.168.1.X:\${PORT}\`);
  console.log('Tekan Ctrl+C untuk menghentikan server.');
});
`;

fs.writeFileSync(path.join(clientPackageDir, 'jalankan-klien.cjs'), launcherScript, 'utf8');

// 4. Create README guide for clients
console.log('[4/4] Membuat berkas panduan penggunaan klien...');
const readmeContent = `===================================================================
      JRZ SCORE TGR - PAKET KLIEN RESMI (STANDAR IPSI 2026 & PERSILAT)
===================================================================

Paket ini berisi seluruh berkas antarmuka pengguna (Frontend Client)
yang dapat dijalankan secara 100% OFFLINE tanpa sambungan internet.

CARA MENJALANKAN DI KOMPUTER / LAPTOP:
-------------------------------------------------------------------
1. Menggunakan Node.js (Rekomendasi Utama):
   Buka terminal / CMD di folder ini, lalu jalankan:
     node jalankan-klien.cjs
   Buka browser di: http://localhost:8080

2. Menggunakan web server statis lainnya:
   - npx serve .
   - python -m http.server 8080
   - Live Server di VS Code
   - Web server Apache / Nginx / XAMPP (taruh di htdocs)

TAUTAN LANGSUNG PERAN KLIEN:
-------------------------------------------------------------------
- Portal Utama:          http://localhost:8080/
- Panel Sekretaris:      http://localhost:8080/?role=sekretaris
- Panel Ketua Dewan:     http://localhost:8080/?role=dewan
- Panel Operator Timer:  http://localhost:8080/?role=timer
- Monitor Arena:         http://localhost:8080/?role=monitor
- Juri 1 sampai 10:      http://localhost:8080/?role=juri&id=1 (ganti angka 1-10)

FITUR PWA (PROGRESSIVE WEB APP):
-------------------------------------------------------------------
Aplikasi ini sudah mendukung PWA. Saat dibuka di Google Chrome / Edge
di laptop maupun tablet Android / iPad, tekan tombol "Install App"
pada bilah menu atas untuk memasang aplikasi ke layar beranda (homescreen)
sehingga dapat dibuka langsung layaknya aplikasi native tanpa browser bar.
`;

fs.writeFileSync(path.join(clientPackageDir, 'PANDUAN_KLIEN.txt'), readmeContent, 'utf8');

console.log('✓ Paket klien berhasil dibuat di folder: dist-client/\n');
console.log('====================================================');
console.log('   PAKET KLIEN SIAP DIGUNAKAN DI dist-client/');
console.log('====================================================\n');
