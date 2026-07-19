// server.js — AURELİA Kuyumcu randevu sistemi backend'i.
//
// Frontend (kuyumcuweb.html) şu iki uç noktayı çağırıyor:
//   GET  /api/availability?date=YYYY-MM-DD   -> o günün saatleri + doluluk durumu
//   POST /api/bookings                       -> yeni randevu oluşturur
//
// Ayrıca dükkan sahibinin randevuları saat saat, kim-ne için görebilmesi için
// basit bir admin API'si ve admin panel arayüzü (/admin) eklenmiştir.

require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { WORKING_HOURS, MAX_ADVANCE_DAYS } = require('./config');

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// CORS — sadece kendi web sitenizden gelen isteklere izin verin.
// ALLOWED_ORIGIN ortam değişkenine sitenizin adresini yazın, örn:
//   ALLOWED_ORIGIN=https://www.aurelia.com
// Birden fazla domain için virgülle ayırıp aşağıdaki gibi split edebilirsiniz.
// Test aşamasında boş bırakırsanız tüm originlere izin verilir (*).
// ---------------------------------------------------------------------------
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
}));

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const PHONE_RE = /^[0-9\s()+-]{10,}$/;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isPastDate(dateStr) {
  return dateStr < todayStr();
}

function isTooFarAhead(dateStr) {
  const max = new Date();
  max.setDate(max.getDate() + MAX_ADVANCE_DAYS);
  const maxStr = `${max.getFullYear()}-${String(max.getMonth() + 1).padStart(2, '0')}-${String(max.getDate()).padStart(2, '0')}`;
  return dateStr > maxStr;
}

function weekdayOf(dateStr) {
  // 'YYYY-MM-DD' -> yerel saat kaymasını önlemek için parçalardan Date kur
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay(); // 0=Pazar..6=Cumartesi
}

// ---------------------------------------------------------------------------
// GET /api/availability?date=YYYY-MM-DD
// Frontend'in beklediği yanıt: { slots: [ { time: "10:00", available: true }, ... ] }
// Pazar günü veya çalışılmayan bir gün için slots: [] döner (frontend "Bu gün kapalıyız" gösterir).
// ---------------------------------------------------------------------------
app.get('/api/availability', (req, res) => {
  const { date } = req.query;

  if (!date || !DATE_RE.test(date)) {
    return res.status(400).json({ error: 'Geçerli bir tarih giriniz (YYYY-MM-DD).' });
  }
  if (isPastDate(date)) {
    return res.status(400).json({ error: 'Geçmiş bir tarih için randevu görüntülenemez.' });
  }
  if (isTooFarAhead(date)) {
    return res.status(400).json({ error: 'Bu tarih için henüz randevu alınamıyor.' });
  }

  const hours = WORKING_HOURS[weekdayOf(date)] || [];
  if (hours.length === 0) {
    return res.json({ slots: [] });
  }

  const taken = new Set(
    db.prepare(`SELECT time FROM bookings WHERE date = ? AND status != 'cancelled'`)
      .all(date)
      .map(r => r.time)
  );

  const slots = hours.map(time => ({ time, available: !taken.has(time) }));
  res.json({ slots });
});

// ---------------------------------------------------------------------------
// POST /api/bookings
// Body: { name, phone, service, date, time }
// Başarılı: 201 { id, name, phone, service, date, time, status }
// Saat doluysa: 409 { error }
// ---------------------------------------------------------------------------
app.post('/api/bookings', (req, res) => {
  const { name, phone, service, date, time } = req.body || {};

  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: 'Lütfen geçerli bir ad soyad giriniz.' });
  }
  if (!phone || !PHONE_RE.test(String(phone).trim())) {
    return res.status(400).json({ error: 'Lütfen geçerli bir telefon numarası giriniz.' });
  }
  if (!service || String(service).trim().length < 2) {
    return res.status(400).json({ error: 'Lütfen bir hizmet türü seçiniz.' });
  }
  if (!date || !DATE_RE.test(date)) {
    return res.status(400).json({ error: 'Geçerli bir tarih giriniz.' });
  }
  if (!time || !TIME_RE.test(time)) {
    return res.status(400).json({ error: 'Geçerli bir saat giriniz.' });
  }
  if (isPastDate(date)) {
    return res.status(400).json({ error: 'Geçmiş bir tarihe randevu alınamaz.' });
  }

  const validHours = WORKING_HOURS[weekdayOf(date)] || [];
  if (!validHours.includes(time)) {
    return res.status(400).json({ error: 'Seçilen saat çalışma saatleri dışında.' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO bookings (name, phone, service, date, time, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `);
    const info = stmt.run(String(name).trim(), String(phone).trim(), String(service).trim(), date, time);

    return res.status(201).json({
      id: info.lastInsertRowid,
      name: String(name).trim(),
      phone: String(phone).trim(),
      service: String(service).trim(),
      date,
      time,
      status: 'pending',
    });
  } catch (err) {
    // UNIQUE(date, time) kısıtı ihlal edildiyse, bu saat az önce dolmuş demektir.
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Bu saat az önce doldu, lütfen başka bir saat seçin.' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Randevu oluşturulurken bir hata oluştu.' });
  }
});

// ---------------------------------------------------------------------------
// ADMIN API — dükkan sahibinin randevuları görmesi için.
// Basit bir anahtar (ADMIN_KEY ortam değişkeni) ile korunur.
// İstek header'ında şu şekilde gönderilir:  x-admin-key: <ADMIN_KEY>
// ---------------------------------------------------------------------------
function requireAdmin(req, res, next) {
  const key = req.header('x-admin-key');
  const expected = process.env.ADMIN_KEY;
  if (!expected) {
    return res.status(500).json({ error: 'Sunucuda ADMIN_KEY tanımlı değil.' });
  }
  if (key !== expected) {
    return res.status(401).json({ error: 'Yetkisiz erişim.' });
  }
  next();
}

// GET /api/admin/bookings?date=YYYY-MM-DD  -> o güne ait tüm randevular, saat saat
app.get('/api/admin/bookings', requireAdmin, (req, res) => {
  const { date } = req.query;
  if (!date || !DATE_RE.test(date)) {
    return res.status(400).json({ error: 'Geçerli bir tarih giriniz (YYYY-MM-DD).' });
  }
  const hours = WORKING_HOURS[weekdayOf(date)] || [];
  const rows = db.prepare(`SELECT * FROM bookings WHERE date = ? ORDER BY time ASC`).all(date);
  const byTime = new Map(rows.map(r => [r.time, r]));

  const schedule = hours.map(time => {
    const b = byTime.get(time);
    return b
      ? { time, booked: true, id: b.id, name: b.name, phone: b.phone, service: b.service, status: b.status }
      : { time, booked: false };
  });

  res.json({ date, schedule });
});

// PATCH /api/admin/bookings/:id -> durumu güncelle (confirmed / cancelled)
app.patch('/api/admin/bookings/:id', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Geçersiz durum.' });
  }
  const info = db.prepare(`UPDATE bookings SET status = ? WHERE id = ?`).run(status, req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Randevu bulunamadı.' });
  }
  res.json({ ok: true });
});

// DELETE /api/admin/bookings/:id -> randevuyu tamamen sil (saati tekrar boşaltır)
app.delete('/api/admin/bookings/:id', requireAdmin, (req, res) => {
  const info = db.prepare(`DELETE FROM bookings WHERE id = ?`).run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Randevu bulunamadı.' });
  }
  res.json({ ok: true });
});

// Basit admin panel arayüzü (statik dosya)
app.use('/admin', express.static(require('path').join(__dirname, 'admin')));

// Sağlık kontrolü (Render/Railway gibi platformlar bunu kullanabilir)
app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AURELİA randevu backend'i ${PORT} portunda çalışıyor.`);
});
