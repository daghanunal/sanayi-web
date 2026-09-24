# Sanayi Web: Şaşmaz oto sanayi için demo siteler

Tek bir kod tabanında 5 preset var. Her preset `data/<preset>.json` dosyasındaki işletme bilgisiyle çalışır.

| Preset | Klasör | Demo işletme | Sektör |
|---|---|---|---|
| Garaj | `presets/garaj` | Demirhan Motor | Motor, mekanik, şanzıman |
| Showroom | `presets/showroom` | Parlak Kaporta & Boya | Boya, kaporta, detaylı temizlik, seramik kaplama |
| Pist | `presets/pist` | Hızlı Lastik & Jant | Lastik, jant, rot-balans |
| Devre | `presets/devre` | Volt Oto Elektrik | Oto elektrik, elektronik, arıza tespit |
| Usta | `presets/usta` | Karaca Oto Döşeme | Döşeme, köklü aile işletmesi |

Sinematik presetler: aynı işletme verisini kullanır, baştan sona 3D ve scroll filmi olarak kurgulanmıştır.

| Preset | Klasör | Veri | Selefi |
|---|---|---|---|
| Silindir | `presets/silindir` | `data/garaj.json` | Garaj |
| Vernik | `presets/vernik` | `data/showroom.json` | Showroom |
| Drift | `presets/drift` | `data/pist.json` | Pist |
| Voltaj | `presets/voltaj` | `data/devre.json` | Devre |
| Kapitone | `presets/kapitone` | `data/usta.json` | Usta |

3D araba modeli: `public/models/ferrari.glb` (CC BY 4.0, vicent091036), Draco çözücü `public/draco/`.

## Yayın

Canlı: https://daghanunal.github.io/sanayi-web/ (saha kiti). `main` dalına her push'ta
`.github/workflows/pages.yml` siteyi `BASE_PATH=/sanayi-web/` ile derleyip GitHub Pages'e yükler.
Kod ve veri içindeki `/img/...` gibi yollar bu yüzden `import.meta.env.BASE_URL` (veya `core.js` → `asset()`) ile kurulur.

## Komutlar

```sh
pnpm dev                     # http://localhost:5173 → saha kiti (preset seçici)
pnpm build                   # dist/ → statik site
node scripts/shoot.mjs <url> <klasör> [--mobile]      # scroll ekran görüntüleri
node scripts/perf.mjs <url>                         # 4x yavaş CPU'da kaydırma akıcılığı
node scripts/images.mjs search "<sorgu>" <klasör>     # stok görsel ara (Openverse)
node scripts/images.mjs get <url> public/img/<preset>/<ad>.jpg   # indir ve küçült
```

## Vitrin (ustanın seçim yaptığı sayfa)

`/vitrin/`: usta QR'ı kendi telefonuyla okutur → sektörünü seçer → tasarımları tam ekran gezer
(alttaki çubuk: "Diğer tasarımlar / Bunu istiyorum") → adı ve telefonuyla seçimini WhatsApp'tan gönderir.

- Kişisel QR: `/vitrin/?ad=Yıldız%20Oto%20Elektrik&sektor=elektrik` (sektör adımını atlar). Saha kitindeki
  "Ustaya vitrin QR'ını göster" butonu yazılan dükkan adıyla bu QR'ı üretir.
- Sektörler: `motor`, `boya`, `lastik`, `elektrik`, `doseme`. Katalog ve satış WhatsApp numarası: `shared/katalog.js`.
- Herhangi bir preset `?vitrin=1` ile açılırsa iletişim çubuğunun yerine seçim çubuğu çıkar.

## Sahada kişiselleştirme (URL parametreleri)

Demo sitesi, gösterilen dükkanın adıyla açılabilir:

```
/presets/showroom/?ad=Yıldız%20Oto%20Boya&tel=0532%20123%2045%2067&wa=905321234567&kurulus=1998
```

Parametreler: `ad`, `slogan`, `kurulus`, `tel`, `wa`, `adres`.

## Veri şeması (`data/<preset>.json`)

```jsonc
{
  "preset": "garaj",
  "isletme": {
    "ad": "Demirhan Motor",
    "sektor": "Motor ve Mekanik",          // <title> ve SEO'da kullanılır
    "slogan": "Motor sesinden anlarız.",   // kısa, tek cümle
    "kurulus": 1996,
    "hakkinda": "2-3 cümlelik tanıtım paragrafı."
  },
  "iletisim": {
    "telefon": "0532 555 12 34",
    "whatsapp": "905325551234",            // ülke koduyla, sadece rakam
    "adres": "Şaşmaz Oto Sanayi Sitesi, 1. Cadde No: 24, Etimesgut/Ankara",
    "mapsQuery": "Şaşmaz Oto Sanayi Sitesi Etimesgut Ankara"
  },
  "saatler": [null, "08:30-19:00", "08:30-19:00", "08:30-19:00", "08:30-19:00", "08:30-19:00", "09:00-16:00"], // 0 = Pazar
  "hizmetler": [{ "baslik": "Motor revizyonu", "aciklama": "…", "sure": "2-4 gün" }],
  "surec": [{ "baslik": "Arıza tespiti", "aciklama": "…" }],     // gerçekten sıralı adımlar
  "istatistikler": [{ "deger": 12000, "sonek": "+", "etiket": "onarılan araç" }],
  "markalar": ["Renault", "Fiat", "Volkswagen", "Ford", "Toyota", "Hyundai"],
  "galeri": [{ "src": "/img/garaj/atolye-1.jpg", "alt": "…" }],
  "oncesiSonrasi": [{ "once": "/img/…", "sonra": "/img/…", "baslik": "…" }], // opsiyonel
  "puan": { "ortalama": 4.9, "adet": 214 },
  "yorumlar": [{ "ad": "Mehmet K.", "puan": 5, "metin": "…", "arac": "2016 Passat" }],
  "garanti": "Yapılan işçiliğe 1 yıl garanti."
}
```

Presetler kendi ihtiyacına göre ek alan ekleyebilir. Ortak alanların adı değişmez.

## Ortak çekirdek (`shared/`)

- `core.js`: `boot(data)` (URL parametreleri, meta, JSON-LD, mobil aksiyon çubuğu), `initSmoothScroll()`,
  `telHref`, `waHref`, `mapsHref`, `mapsEmbed`, `openStatus`, `groupedHours`, `icons`, `gsap`, `ScrollTrigger`
- `base.css`: reset, Lenis, `.action-bar` (renkleri `--bar-*` değişkenleriyle presette ayarlanır)
