#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function readDotEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1);
  }
  return out;
}

function flattenRequests(items, acc = []) {
  for (const item of items || []) {
    if (item.request?.url?.path) {
      acc.push({
        method: String(item.request.method || "GET").toUpperCase(),
        path: `/${item.request.url.path.map(String).join("/")}`,
        rawBody: item.request.body?.raw ?? null,
      });
    }
    if (item.item) flattenRequests(item.item, acc);
  }
  return acc;
}

function summarize(payload) {
  if (Array.isArray(payload)) return `array(${payload.length})`;
  if (payload && typeof payload === "object") return Object.keys(payload).slice(0, 10).join(", ");
  return typeof payload;
}

async function callEndpoint(baseUrl, apiKey, req) {
  const headers = {
    Accept: "application/json",
    "x-api-key": apiKey,
  };
  if (req.method === "POST") headers["Content-Type"] = "application/json";

  const res = await fetch(`${baseUrl}${req.path}`, {
    method: req.method,
    headers,
    body: req.method === "POST" ? req.rawBody || "{}" : undefined,
  });

  const text = await res.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }

  const quotaHeaders = [];
  for (const [k, v] of res.headers.entries()) {
    if (/remaining|quota|credit|usage|rate|limit/i.test(k)) {
      quotaHeaders.push(`${k}=${v}`);
    }
  }

  return {
    endpoint: `${req.method} ${req.path}`,
    status: res.status,
    quotaHeaders: quotaHeaders.join("; "),
    summary: payload ? summarize(payload) : text.slice(0, 200).replace(/\s+/g, " "),
  };
}

async function main() {
  const cwd = process.cwd();
  const env = { ...readDotEnv(path.join(cwd, ".env.local")), ...process.env };
  const apiKey = env.ASTROLOGY_API_KEY;
  const baseUrl = (env.ASTROLOGY_API_BASE_URL || "https://api.astrology-api.io").replace(/\/+$/, "");
  if (!apiKey) {
    console.error("Missing ASTROLOGY_API_KEY in .env.local");
    process.exit(1);
  }

  const collectionPath =
    process.argv[2] || "C:/Users/dream/Downloads/best-astrology-api-postman.json";
  if (!fs.existsSync(collectionPath)) {
    console.error(`Collection file not found: ${collectionPath}`);
    process.exit(1);
  }

  const collection = JSON.parse(fs.readFileSync(collectionPath, "utf8"));
  const requests = flattenRequests(collection.item);

  const targetSet = [
    ["GET", "/api/v3/data/now"],
    ["POST", "/api/v3/data/lunar-metrics"],
    ["POST", "/api/v3/lunar/events"],
    ["POST", "/api/v3/data/global-positions"],
    ["POST", "/api/v3/data/aspects"],
    ["POST", "/api/v3/charts/transit"],
    ["POST", "/api/v3/charts/natal"],
    ["POST", "/api/v3/charts/natal-transits"],
    ["POST", "/api/v3/analysis/compatibility-score"],
    ["POST", "/api/v3/numerology/core-numbers"],
    ["POST", "/api/v3/horoscope/sign/daily/text"],
    ["GET", "/api/v3/tarot/cards/daily"],
    ["POST", "/api/v3/tarot/cards/draw"],
  ];

  const runnable = targetSet.map(([method, p]) => {
    const req = requests.find((r) => r.method === method && r.path === p);
    return req || { method, path: p, rawBody: null, missing: true };
  });

  const results = [];
  for (const req of runnable) {
    if (req.missing) {
      results.push({
        endpoint: `${req.method} ${req.path}`,
        status: "NOT_FOUND_IN_COLLECTION",
        quotaHeaders: "",
        summary: "",
      });
      continue;
    }
    try {
      const row = await callEndpoint(baseUrl, apiKey, req);
      results.push(row);
    } catch (err) {
      results.push({
        endpoint: `${req.method} ${req.path}`,
        status: "ERROR",
        quotaHeaders: "",
        summary: String(err?.message || err),
      });
    }
  }

  console.table(results);

  const outPath = path.join(cwd, "docs", "backend-plan", "astrology_api_io-smoke-results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`Saved ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

