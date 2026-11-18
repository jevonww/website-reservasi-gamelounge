#!/usr/bin/env node
// Small helper around the project-local PostgreSQL cluster in `.pgdata`.
// Usage: node scripts/db.mjs <start|stop|status>
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, ".pgdata");
const ENV_FILE = path.join(ROOT, ".env");
const LOG_FILE = path.join(DATA_DIR, "server.log");
const PG_CTL = process.platform === "win32" ? "pg_ctl.exe" : "pg_ctl";

function readDatabaseUrl() {
  if (!existsSync(ENV_FILE)) return null;
  const line = readFileSync(ENV_FILE, "utf8")
    .split(/\r?\n/)
    .find((entry) => /^\s*DATABASE_URL\s*=/.test(entry));
  if (!line) return null;
  return line
    .slice(line.indexOf("=") + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

function target() {
  const url = readDatabaseUrl();
  if (url) {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname || "localhost",
        port: parsed.port || "5432",
        database: parsed.pathname.replace(/^\//, "") || "levelup",
        url,
      };
    } catch {
      // Fall through to the local cluster defaults below.
    }
  }
  return {
    host: "localhost",
    port: "55432",
    database: "levelup",
    url: "postgresql://postgres@localhost:55432/levelup",
  };
}

function runPgCtl(args, { quiet = false } = {}) {
  const result = spawnSync(PG_CTL, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: quiet ? "pipe" : "inherit",
  });
  if (result.error?.code === "ENOENT") {
    console.error(
      `Tidak menemukan ${PG_CTL}. Pastikan PostgreSQL terpasang dan folder bin-nya ada di PATH.`,
    );
    process.exit(1);
  }
  return result;
}

function isRunning() {
  const result = runPgCtl(["-D", DATA_DIR, "status"], { quiet: true });
  return result.status === 0;
}

function describeTarget() {
  const { host, port, database } = target();
  console.log(`Target: postgresql://${host}:${port}/${database}`);
}

function start() {
  if (!existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
    console.error(
      `Cluster belum dibuat di ${DATA_DIR}.\n` +
        `Jalankan sekali: initdb -D .pgdata --auth=trust\n` +
        `lalu: createdb -p 55432 levelup`,
    );
    process.exit(1);
  }

  if (isRunning()) {
    console.log("Database lokal sudah berjalan.");
    describeTarget();
    return;
  }

  const { port } = target();
  console.log(`Menyalakan PostgreSQL di port ${port}...`);
  const result = runPgCtl([
    "-D",
    DATA_DIR,
    "-o",
    `-p ${port}`,
    "-l",
    LOG_FILE,
    "start",
  ]);

  if (result.status !== 0 || !isRunning()) {
    console.error(
      "Database gagal dinyalakan. Periksa pesan di atas dan log di .pgdata/server.log.\n" +
        "Jika port dipakai proses lain, hentikan proses tersebut atau sesuaikan DATABASE_URL.",
    );
    process.exit(1);
  }

  console.log("Database siap.");
  describeTarget();
}

function stop() {
  if (!existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
    console.error(`Cluster belum dibuat di ${DATA_DIR}.`);
    process.exit(1);
  }
  if (!isRunning()) {
    console.log("Database lokal tidak sedang berjalan.");
    return;
  }
  const result = runPgCtl(["-D", DATA_DIR, "stop", "-m", "fast"]);
  if (result.status !== 0) {
    console.error("Gagal menghentikan database. Periksa pesan di atas.");
    process.exit(1);
  }
  console.log("Database dihentikan dengan rapi.");
}

function status() {
  if (!existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
    console.log("Cluster database belum dibuat di .pgdata.");
    return;
  }
  if (isRunning()) {
    console.log("Database lokal: BERJALAN");
  } else {
    console.log("Database lokal: TIDAK BERJALAN (jalankan `npm run db:start`)");
  }
  describeTarget();
}

const command = process.argv[2];

switch (command) {
  case "start":
    start();
    break;
  case "stop":
    stop();
    break;
  case "status":
    status();
    break;
  default:
    console.error("Pemakaian: node scripts/db.mjs <start|stop|status>");
    process.exit(1);
}
