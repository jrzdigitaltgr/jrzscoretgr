const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow = null;

function startBackend() {
  // Set production environment variables
  process.env.NODE_ENV = 'production';
  process.env.PORT = '3000';
  
  try {
    // Run the compiled production Express server in-process natively
    require(path.join(__dirname, 'dist', 'server.cjs'));
    console.log('Backend server successfully started in-process');
  } catch (err) {
    console.error('Failed to start backend server:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Sistem Scoring Pencak Silat - Offline Edition",
    icon: path.join(__dirname, 'dist', 'Iconinstalasiwindows.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true, // Menyembunyikan menu bar bawaan agar lebih bersih dan profesional
  });

  // Load local full-stack server
  mainWindow.loadURL('http://localhost:3000');

  // Jika gagal dimuat (misal server belum siap), coba muat kembali secara berkala
  mainWindow.webContents.on('did-fail-load', () => {
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.loadURL('http://localhost:3000');
      }
    }, 1000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  
  // Berikan jeda waktu sejenak agar server Express siap menerima koneksi
  setTimeout(createWindow, 500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
