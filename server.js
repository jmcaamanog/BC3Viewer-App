const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const WWW_DIR = path.join(__dirname, 'www');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.wasm': 'application/wasm',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.bc3': 'text/plain; charset=iso-8859-1',
    '.ifc': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
    // Normalizar URL
    let safePath = req.url.split('?')[0];
    if (safePath === '/' || safePath === '') {
        safePath = '/index.html';
    }

    const filePath = path.join(WWW_DIR, safePath);

    // Evitar salir del directorio www
    if (!filePath.startsWith(WWW_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found: ' + safePath);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        });

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor local iniciado correctamente.`);
    console.log(`📡 URL local: http://localhost:${PORT}`);
    console.log(`📁 Directorio raíz: ${WWW_DIR}`);
});
