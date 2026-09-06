const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = '/Users/brachahaviv/Documents/Claude/Projects/nestincity-website/dist';
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.mp4':'video/mp4'};
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
  try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch {}
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, {'Content-Type':'text/plain'}); res.end('404'); return; }
    res.writeHead(200, {'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control':'no-store'});
    res.end(data);
  });
}).listen(5178, () => console.log('serving dist on http://localhost:5178'));
