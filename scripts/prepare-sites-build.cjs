const fs = require("fs");
const path = require("path");

const root = process.cwd();
const distDir = path.join(root, "dist");
const serverDir = path.join(distDir, "server");
const openaiDistDir = path.join(distDir, ".openai");

fs.mkdirSync(serverDir, { recursive: true });
fs.mkdirSync(openaiDistDir, { recursive: true });
fs.copyFileSync(path.join(root, ".openai", "hosting.json"), path.join(openaiDistDir, "hosting.json"));

const assets = new Map();
const addAsset = (routePath, filePath, contentType) => {
  assets.set(routePath, {
    body: fs.readFileSync(filePath, "utf8"),
    contentType,
  });
};

addAsset("/index.html", path.join(distDir, "index.html"), "text/html; charset=utf-8");

for (const fileName of fs.readdirSync(path.join(distDir, "assets"))) {
  const ext = path.extname(fileName);
  if (ext === ".js") {
    addAsset(`/assets/${fileName}`, path.join(distDir, "assets", fileName), "text/javascript; charset=utf-8");
  }
  if (ext === ".css") {
    addAsset(`/assets/${fileName}`, path.join(distDir, "assets", fileName), "text/css; charset=utf-8");
  }
}

const serializedAssets = JSON.stringify(Object.fromEntries(assets), null, 2);

fs.writeFileSync(
  path.join(serverDir, "index.js"),
  `const assets = ${serializedAssets};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const asset = assets[url.pathname] ?? (url.pathname.includes(".") ? null : assets["/index.html"]);

    if (!asset) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(asset.body, {
      headers: {
        "content-type": asset.contentType,
        "cache-control": url.pathname.includes("/assets/") ? "public, max-age=31536000, immutable" : "no-cache"
      }
    });
  }
};
`,
  "utf8",
);
