# AURELİA Randevu Backend

`kuyumcuweb.html` sitenizdeki "Randevu Al" butonu ve takvim zaten bu backend'in
API'sini çağıracak şekilde hazır. Yapmanız gereken tek şey bu backend'i
internete deploy edip adresini siteye yazmak.

## 1) İçerik

- `server.js` — API sunucusu (Express)
- `db.js` — SQLite veritabanı bağlantısı
- `config.js` — çalışma saatleri (Pzt–Cmt 10:00–18:00, Pazar kapalı)
- `admin/index.html` — dükkan sahibi için **saat saat randevu paneli**
  (kim geldi, telefon numarası, hangi hizmet/sebep için geldiği, onay/iptal)

## 2) API uçları

| Yöntem | Yol | Açıklama |
|---|---|---|
| GET | `/api/availability?date=YYYY-MM-DD` | O günün saatlerini ve doluluk durumunu döner |
| POST | `/api/bookings` | Yeni randevu oluşturur (`name, phone, service, date, time`) — saat doluysa `409` döner |
| GET | `/api/admin/bookings?date=YYYY-MM-DD` | O güne ait tüm randevuları saat saat listeler (kim, telefon, hizmet) — `x-admin-key` header gerekir |
| PATCH | `/api/admin/bookings/:id` | Randevu durumunu günceller (`confirmed` / `cancelled`) |
| DELETE | `/api/admin/bookings/:id` | Randevuyu siler, saati tekrar boşaltır |
| GET | `/health` | Sunucunun ayakta olup olmadığını kontrol eder |

## 3) Yerelde deneme

```bash
npm install
cp .env.example .env
# .env dosyasını açıp ADMIN_KEY değerini kendi belirlediğiniz gizli bir
# şifreyle değiştirin.
npm start
```

Sunucu `http://localhost:3000` adresinde çalışır.
Admin panele `http://localhost:3000/admin` adresinden ulaşabilirsiniz
(backend adresi ve ADMIN_KEY'i panelde giriş ekranına yazacaksınız).

## 4) Render'a ücretsiz deploy (önerilen, en kolay yol)

1. Bu `aurelia-backend` klasörünü kendi GitHub hesabınızda yeni bir
   repoya yükleyin (GitHub Desktop veya `git` ile).
2. https://render.com adresine gidip ücretsiz hesap açın, GitHub'ı bağlayın.
3. **New +** → **Web Service** → az önce yüklediğiniz repoyu seçin.
4. Ayarlar:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. **Environment** sekmesinden şu değişkenleri ekleyin:
   - `ADMIN_KEY` → kendi belirlediğiniz gizli şifre
   - `ALLOWED_ORIGIN` → sitenizin adresi (örn. `https://www.aurelia.com`)
6. **Create Web Service** deyip deploy'un bitmesini bekleyin. Size
   `https://xxxxx.onrender.com` gibi bir adres verecek.

⚠️ **Önemli — kalıcı veri:** Render'ın ücretsiz planında disk kalıcı
değildir; sunucu yeniden başladığında (deploy, uykudan uyanma vb.)
SQLite dosyasındaki randevular silinebilir. Gerçek kullanım için:
- Render'da ücretli plana geçip **Persistent Disk** ekleyin ve
  `DB_PATH` değişkenini o disk yoluna ayarlayın, **veya**
- Railway.app kullanın (Volume ekleyerek kalıcı disk sağlar), **veya**
- İleride SQLite yerine Postgres gibi barındırılan bir veritabanına
  geçin (talep ederseniz bu geçişi de yapabilirim).

## 5) Railway'e deploy (alternatif)

1. https://railway.app üzerinde hesap açın, GitHub reponuzu bağlayın.
2. **New Project → Deploy from GitHub repo**.
3. **Variables** sekmesinden `ADMIN_KEY` ve `ALLOWED_ORIGIN` ekleyin.
4. **Settings → Volumes** kısmından bir volume ekleyip `DB_PATH` değişkenini
   o volume'un yoluna ayarlayın (örn. `/data/randevu.db`) — bu sayede
   veriler kalıcı olur.
5. Deploy tamamlanınca size verilen `https://xxxxx.up.railway.app`
   adresini kullanın.

## 6) Siteye bağlama (son adım)

`kuyumcuweb.html` dosyasında şu satırı bulun:

```js
const API_BASE_URL = 'https://SIZIN-BACKEND-ADRESINIZ.onrender.com';
```

ve Render/Railway'den aldığınız gerçek adresle değiştirin, örn:

```js
const API_BASE_URL = 'https://aurelia-randevu.onrender.com';
```

Başka hiçbir şey yapmanıza gerek yok — takvim, saat seçimi, form ve
hata mesajları zaten bu adrese göre çalışacak şekilde hazır.

## 7) Admin paneli kullanmak

Deploy sonrası şu adrese gidin:

```
https://sizin-backend-adresiniz.onrender.com/admin
```

Açılan ekranda:
- **Admin Anahtarı**: `.env`'de belirlediğiniz `ADMIN_KEY`
- **Backend Adresi**: aynı backend'in adresi

Giriş yaptıktan sonra istediğiniz tarihi seçip o günün saat saat
programını görürsünüz: hangi saatte kim var, telefonu ne, hangi
hizmet/sebep için geldiği, ve randevuyu onaylama/iptal etme butonları.

## 8) Güvenlik notları

- `ADMIN_KEY`'i kimseyle paylaşmayın, tahmin edilmesi zor bir değer seçin.
- `ALLOWED_ORIGIN`'i mutlaka kendi site adresinizle sınırlayın; boş
  bırakırsanız herkes API'nize istek atabilir (test için sorun değil,
  canlıya alırken mutlaka doldurun).
- Bu basit anahtar yöntemi küçük bir mağaza için yeterlidir; ileride
  kullanıcı adı/şifreli gerçek bir admin girişi de eklenebilir.
