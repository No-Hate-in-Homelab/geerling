import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT || 8765);
const clients = new Set();
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

async function snapshot(directory = root, files = new Map()) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await snapshot(path, files);
    else {
      const info = await stat(path);
      files.set(path, `${info.mtimeMs}:${info.size}`);
    }
  }
  return files;
}

let knownFiles = await snapshot();
setInterval(async () => {
  const nextFiles = await snapshot();
  const changed = nextFiles.size !== knownFiles.size || [...nextFiles].some(([path, stamp]) => knownFiles.get(path) !== stamp);
  knownFiles = nextFiles;
  if (changed) for (const client of clients) client.write('data: reload\n\n');
}, 500).unref();

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/__dev_events') {
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    response.write(': connected\n\n');
    clients.add(response);
    request.on('close', () => clients.delete(response));
    return;
  }

  let decodedPath;
  try { decodedPath = decodeURIComponent(pathname); } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.slice(1);
  const filePath = resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const body = await readFile(filePath);
    const contentType = mimeTypes[extname(filePath)] || 'application/octet-stream';
    if (extname(filePath) === '.html') {
      const html = body.toString('utf8').replace('</body>', '<script>new EventSource("/__dev_events").onmessage=()=>location.reload()</script></body>');
      response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' }).end(html);
    } else {
      response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' }).end(body);
    }
  } catch {
    response.writeHead(404).end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Local preview with hot reload: http://localhost:${port}\n`);
});
