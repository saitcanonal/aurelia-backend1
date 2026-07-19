// config.js — Mağaza çalışma saatleri ve randevu ayarları.
// Frontend'deki "Pzt–Cmt: 10:00–19:00 · Pazar: Kapalı" bilgisiyle uyumludur.
module.exports = {
  // Her gün için randevu saatleri (24 saat formatı). Pazar kapalı olduğundan listede yok.
  WORKING_HOURS: {
    1: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'], // Pazartesi
    2: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'], // Salı
    3: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'], // Çarşamba
    4: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'], // Perşembe
    5: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'], // Cuma
    6: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'], // Cumartesi
    0: [], // Pazar — kapalı
  },
  // Randevu talep edilebilecek en uzak tarih (gün olarak, bugünden itibaren)
  MAX_ADVANCE_DAYS: 60,
};
