const fs = require("fs");
const path = require("path");

const root = process.cwd();
const distDir = path.join(root, "dist");
const serverDir = path.join(distDir, "server");
const openaiDistDir = path.join(distDir, ".openai");

fs.mkdirSync(serverDir, { recursive: true });
fs.mkdirSync(openaiDistDir, { recursive: true });
fs.copyFileSync(path.join(root, ".openai", "hosting.json"), path.join(openaiDistDir, "hosting.json"));

fs.writeFileSync(
  path.join(serverDir, "index.js"),
  `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const assetResponse = await env.ASSETS.fetch(request);

    if (assetResponse.status !== 404 || url.pathname.includes(".")) {
      return assetResponse;
    }

    return env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
  }
};
`,
  "utf8",
);
