// db.js — SQLite veritabanı bağlantısı ve tablo tanımı.
// SQLite dosyası, ücretsiz planlarda (ör. Render Free) her deploy/restart'ta
// SIFIRLANABİLİR çünkü disk kalıcı değildir. Kalıcılık için ya Render'da
// "Persistent Disk" ekleyin ya da DB_PATH ortam değişkenini kalıcı bir
// klasöre (ör. Render Disk mount noktası) işaret edecek şekilde ayarlayın.
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'randevu.db');

// data klasörünü garanti altına al
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    service TEXT NOT NULL,
    date TEXT NOT NULL,       -- 'YYYY-MM-DD'
    time TEXT NOT NULL,       -- 'HH:MM'
    status TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | cancelled
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(date, time)        -- aynı saate iki randevu birden alınamaz
  );
`);

module.exports = db;
