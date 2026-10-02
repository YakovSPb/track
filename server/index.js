"use strict";

const fs = require("fs");
const path = require("path");
const express = require("express");
const Database = require("better-sqlite3");

const PORT = Number(process.env.TRACK_PORT || 3010);
const PIN = String(process.env.TRACK_PIN || "111");
const DATA_DIR = process.env.TRACK_DATA_DIR || path.join(__dirname, "data");

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "track.db"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS habits (
    day TEXT NOT NULL,
    task_id TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (day, task_id)
  );
`);

const app = express();
app.use(express.json({ limit: "1mb" }));

function authorized(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === PIN;
}

function requireAuth(req, res, next) {
  if (!authorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

function loadAll() {
  const rows = db.prepare("SELECT day, task_id FROM habits WHERE done = 1").all();
  const out = {};
  for (const row of rows) {
    if (!out[row.day]) out[row.day] = {};
    out[row.day][row.task_id] = true;
  }
  return out;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/login", (req, res) => {
  const pin = String((req.body && req.body.pin) || "");
  if (pin !== PIN) {
    res.status(401).json({ error: "bad_pin" });
    return;
  }
  res.json({ token: PIN });
});

app.get("/habits", requireAuth, (_req, res) => {
  res.json(loadAll());
});

app.put("/habits", requireAuth, (req, res) => {
  const data = req.body && typeof req.body === "object" ? req.body : {};
  const now = new Date().toISOString();
  const wipe = db.prepare("DELETE FROM habits");
  const insert = db.prepare(
    "INSERT INTO habits (day, task_id, done, updated_at) VALUES (?, ?, 1, ?)",
  );
  const tx = db.transaction((payload) => {
    wipe.run();
    for (const [day, tasks] of Object.entries(payload)) {
      if (!tasks || typeof tasks !== "object") continue;
      for (const [taskId, done] of Object.entries(tasks)) {
        if (done) insert.run(day, taskId, now);
      }
    }
  });
  tx(data);
  res.json(loadAll());
});

app.put("/habits/:day", requireAuth, (req, res) => {
  const day = req.params.day;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    res.status(400).json({ error: "bad_day" });
    return;
  }
  const tasks = req.body && typeof req.body === "object" ? req.body : {};
  const now = new Date().toISOString();
  const del = db.prepare("DELETE FROM habits WHERE day = ?");
  const insert = db.prepare(
    "INSERT INTO habits (day, task_id, done, updated_at) VALUES (?, ?, 1, ?)",
  );
  const tx = db.transaction((payload) => {
    del.run(day);
    for (const [taskId, done] of Object.entries(payload)) {
      if (done) insert.run(day, taskId, now);
    }
  });
  tx(tasks);
  res.json(tasks);
});

app.patch("/habits/:day/:taskId", requireAuth, (req, res) => {
  const day = req.params.day;
  const taskId = req.params.taskId;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !taskId) {
    res.status(400).json({ error: "bad_params" });
    return;
  }
  const done = !!(req.body && req.body.done);
  const now = new Date().toISOString();
  if (done) {
    db.prepare(
      `INSERT INTO habits (day, task_id, done, updated_at)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(day, task_id) DO UPDATE SET done = 1, updated_at = excluded.updated_at`,
    ).run(day, taskId, now);
  } else {
    db.prepare("DELETE FROM habits WHERE day = ? AND task_id = ?").run(day, taskId);
  }
  res.json({ day, taskId, done });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`track-api on 127.0.0.1:${PORT}`);
});
