const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5503;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
};

const server = http.createServer((req, res) => {
  const reqPath = req.url.split('?')[0];
  let filePath = path.join(ROOT, reqPath === '/' ? 'index.html' : reqPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

  function serve(fp) {
    fs.readFile(fp, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found: ' + req.url); return; }
      const ext = path.extname(fp).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(data);
    });
  }

  if (!path.extname(filePath)) {
    const withHtml = filePath + '.html';
    serve(fs.existsSync(withHtml) ? withHtml : filePath);
  } else {
    serve(filePath);
  }
});

server.listen(PORT, () => {
  console.log('\n✅ Site Donora disponible sur : http://localhost:' + PORT + '\n');
});
