const { app, BrowserWindow, protocol } = require('electron');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.bin': 'application/octet-stream',
    '.wasm': 'application/wasm',
  };
  return types[ext] || 'application/octet-stream';
}

function resolveAppPath(url) {
  const parsedUrl = new URL(url);
  const decodedPath = decodeURIComponent(parsedUrl.pathname);
  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  const targetPath = path.normalize(path.join(DIST_DIR, relativePath));
  const distRoot = path.normalize(DIST_DIR + path.sep);

  if (!targetPath.startsWith(distRoot)) {
    return null;
  }

  return targetPath;
}

function registerAppProtocol() {
  protocol.handle('app', async (request) => {
    const filePath = resolveAppPath(request.url);

    if (!filePath || !fs.existsSync(filePath)) {
      return new Response('Not found', { status: 404 });
    }

    const data = await fs.promises.readFile(filePath);
    return new Response(data, {
      headers: {
        'content-type': getContentType(filePath),
      },
    });
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 700,
    backgroundColor: '#0a0a1a',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL('app://atari-portal/index.html');
}

app.whenReady().then(() => {
  registerAppProtocol();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
