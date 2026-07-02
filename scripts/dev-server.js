import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const port = Number(process.env.PORT) || 4321;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

async function resolveFile(pathname) {
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(rootDir, safePath === "/" ? "" : safePath);

  const stats = await stat(filePath).catch(() => null);
  if (stats?.isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  return filePath;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const filePath = await resolveFile(decodeURIComponent(url.pathname));
    const body = await readFile(filePath);
    const contentType = MIME_TYPES[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(body);
  } catch (error) {
    if (error.code === "ENOENT") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("500 Internal Server Error");
  }
});

server.listen(port, () => {
  console.log(`Dev server running at http://localhost:${port}`);
});
