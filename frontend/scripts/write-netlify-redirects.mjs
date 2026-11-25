import { writeFile } from "node:fs/promises";

const apiOrigin = process.env.RAILWAY_API_URL;
const isNetlifyBuild = process.env.NETLIFY === "true" && process.env.CONTEXT !== "dev";

if (isNetlifyBuild && !apiOrigin) {
  throw new Error("Set RAILWAY_API_URL in Netlify's build environment.");
}

const redirects = [];
if (apiOrigin) {
  const parsedOrigin = new URL(apiOrigin);
  if (parsedOrigin.pathname !== "/" || parsedOrigin.search || parsedOrigin.hash) {
    throw new Error("RAILWAY_API_URL must be the API origin only, without a path.");
  }
  if (isNetlifyBuild && parsedOrigin.protocol !== "https:") {
    throw new Error("RAILWAY_API_URL must use HTTPS on Netlify.");
  }
  redirects.push(`/api/* ${parsedOrigin.origin}/api/:splat 200`);
}

redirects.push("/* /index.html 200");
await writeFile("dist/_redirects", `${redirects.join("\n")}\n`, "utf8");
