const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const Database = require('better-sqlite3');

const PORT = Number(process.env.PORT || 3000);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me';
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 8;

const app = express();
const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'rsvps.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbFile);
db.exec(`
  CREATE TABLE IF NOT EXISTS rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    attendance TEXT NOT NULL CHECK(attendance IN ('ja', 'nee', 'twijfel')),
    guests INTEGER NOT NULL,
    contact TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

app.use(express.json({ limit: '200kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const rateLimitStore = new Map();

function getClientIp(req) {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function enforceRateLimit(req, res) {
  const now = Date.now();
  const key = getClientIp(req);
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryInSeconds = Math.ceil((record.resetAt - now) / 1000);
    res.set('Retry-After', String(Math.max(retryInSeconds, 1)));
    res.status(429).json({
      ok: false,
      errors: ['Te veel RSVP-verzoeken vanaf dit apparaat. Probeer het over een paar minuten opnieuw.']
    });
    return false;
  }

  record.count += 1;
  return true;
}

function normalizeText(value, maxLen = 2000) {
  return String(value || '').trim().slice(0, maxLen);
}

function validatePayload(payload) {
  const errors = [];

  const fullName = normalizeText(payload.fullName, 120);
  const attendance = normalizeText(payload.attendance, 10).toLowerCase();
  const guestsRaw = Number(payload.guests);
  const contact = normalizeText(payload.contact, 120);
  const notes = normalizeText(payload.notes, 800);
  const website = normalizeText(payload.website, 120);

  if (!fullName || fullName.length < 2) {
    errors.push('Vul een geldige naam in.');
  }

  if (!['ja', 'nee', 'twijfel'].includes(attendance)) {
    errors.push('Kies of je aanwezig bent: ja, nee of twijfel.');
  }

  if (!Number.isInteger(guestsRaw) || guestsRaw < 1 || guestsRaw > 10) {
    errors.push('Aantal personen moet tussen 1 en 10 liggen.');
  }

  if (!contact || contact.length < 5) {
    errors.push('Vul een telefoonnummer of e-mailadres in.');
  }

  if (website) {
    errors.push('Botcheck mislukt.');
  }

  return {
    errors,
    data: {
      fullName,
      attendance,
      guests: guestsRaw,
      contact,
      notes,
      website
    }
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'feest-50jaar-rsvp' });
});

app.post('/api/rsvp', (req, res) => {
  if (!enforceRateLimit(req, res)) {
    return;
  }

  const { errors, data } = validatePayload(req.body || {});

  if (errors.length > 0) {
    return res.status(400).json({ ok: false, errors });
  }

  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO rsvps (full_name, attendance, guests, contact, notes, created_at, updated_at)
    VALUES (@fullName, @attendance, @guests, @contact, @notes, @createdAt, @updatedAt)
  `);

  const result = stmt.run({
    fullName: data.fullName,
    attendance: data.attendance,
    guests: data.guests,
    contact: data.contact,
    notes: data.notes,
    createdAt: now,
    updatedAt: now
  });

  return res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

function isAuthorized(req) {
  const tokenFromHeader = req.get('x-admin-token');
  const tokenFromQuery = String(req.query.token || '');
  const token = tokenFromHeader || tokenFromQuery;
  return token && token === ADMIN_TOKEN;
}

app.get('/api/admin/rsvps', (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: 'Niet geautoriseerd.' });
  }

  const rows = db.prepare(`
    SELECT id, full_name, attendance, guests, contact, notes, created_at
    FROM rsvps
    ORDER BY created_at DESC
  `).all();

  const summary = db.prepare(`
    SELECT
      COUNT(*) AS totaal,
      COALESCE(SUM(CASE WHEN attendance = 'ja' THEN 1 ELSE 0 END), 0) AS ja,
      COALESCE(SUM(CASE WHEN attendance = 'nee' THEN 1 ELSE 0 END), 0) AS nee,
      COALESCE(SUM(CASE WHEN attendance = 'twijfel' THEN 1 ELSE 0 END), 0) AS twijfel,
      COALESCE(SUM(CASE WHEN attendance = 'ja' THEN guests ELSE 0 END), 0) AS personen_ja
    FROM rsvps
  `).get();

  return res.json({ ok: true, summary, rows });
});

app.post('/api/admin/reset', (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: 'Niet geautoriseerd.' });
  }

  db.prepare('DELETE FROM rsvps').run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name = 'rsvps'").run();
  return res.json({ ok: true });
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`RSVP app draait op http://localhost:${PORT}`);
});
