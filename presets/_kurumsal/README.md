# Kurumsal motor

Her sektörün "kurumsal" sürümü bu motorla yapılır: tek sayfalık, hash yönlendirmeli (`#/kurumsal`, `#/iletisim?konu=...`)
bir kurumsal site. Üst menü, mobil tam ekran menü, sayfa geçiş perdesi, kırıntı yolu, küçülen başlık çubuğu,
sütunlu footer, KVKK penceresi ve çerez bandı motorda; varyant yalnızca tema, sayfa listesi, veri ve en fazla bir
sektöre özel modül verir.

Bu klasör bir sayfa değildir (index.html yok); build'e girmez.

```
presets/_kurumsal/
  engine.js     kurumsal({ veri, tema, sayfalar, ekstralar, ld, aksiyon }) — iskelet, yönlendirme, geçiş, hareket
  bolumler.js   bölüm kataloğu (render + mount), yilEki(), sayfaBasligi()
  base.css      bütün görünüm --k-* değişkenlerinden
presets/kurumsal-<sektor>/
  index.html    font bağlantısı + <main id="sayfa">
  main.js       veriyi birleştir, kurumsal({...}) çağır
  extra.js      (isteğe bağlı) tek sektör modülü
  style.css     (isteğe bağlı) ince ayarlar
data/kurumsal-<sektor>.json   yalnızca kurumsal alanlar; sektörün ana veri dosyasıyla birleşir
```

## Yeni sektör varyantı (yaklaşık 20 dakika)

1. `presets/kurumsal-motor/` klasörünü `presets/kurumsal-<sektor>/` olarak kopyala.
2. `main.js`: ana veri dosyasını değiştir (`import ana from '../../data/<sektor>.json'`), `data/kurumsal-<sektor>.json` oluştur.
3. `tema` içinde renkleri, fontları, hero tipini ve görselini değiştir; `index.html`'deki Google Fonts bağlantısını ve
   `theme-color`/favicon'u aynı renklere çek.
4. Sayfa listesini sektöre göre düzenle (aşağıda). Gerekmeyen sayfayı sil; verisi olmayan bölüm zaten görünmez.
5. İstersen `extra.js` ile tek bir sektör modülü ekle (`ekstralar: { modulAdi }`) ve sayfa listesine yaz.
6. `shared/katalog.js`'e `{ id: 'kurumsal-<sektor>', grup: 'kurumsal', sektor: '<sektör id>', ... }` ekle.
7. Kontrol: `node scripts/shoot.mjs <url> .shots/<id>/m --mobile`, `node scripts/perf.mjs <url> --cpu 6`.

## Tema

```js
tema: {
  hero: 'bolunmus' | 'tam' | 'yazi',   // metin+görsel yan yana | tam ekran fotoğraf | dev başlık + geniş görsel bandı
  gecis: 'perde' | 'yan',               // sayfa geçişi: dikey ya da yatay perde (rengi css.gecis)
  heroGorsel, heroAlt,                   // BASE_URL ile: `${import.meta.env.BASE_URL}img/...`
  logo, logoAcik,                        // isteğe bağlı görsel logo; logoAcik = koyu zeminde (tam hero, mobil menü)
  logoAlt,                               // metin logonun altındaki küçük satır
  yer,                                   // hero üst satırı: "Şaşmaz'da" → "…Şaşmaz'da 1996'dan beri."
  baslikEki, teklifEtiketi, hizmetEtiketi,
  metinBoyutu: true,                     // başlıkta A/A+ yazı boyutu düğmesi (tercih localStorage'da)
  altNot,                                // footer'da ek satır (ör. tasarım önerisi notu)
  css: {                                 // her anahtar :root'ta --k-<anahtar> olur
    zemin, yuzey, metin, soluk, cizgi, vurgu, 'vurgu-metin', koyu, 'koyu-metin', 'koyu-soluk', gecis,
    'font-baslik', 'font-govde', 'baslik-agirlik', 'baslik-genislik', 'baslik-harf', 'baslik-satir',
    radius, 'radius-buyuk', kap, bosluk, h1, h2, h3, govde, ust,
  },
}
```

Mobil alt çubuk renkleri (`--bar-*`) temadan otomatik gelir.

## Sayfalar ve bölümler

Varsayılan: `VARSAYILAN_SAYFALAR` (engine.js). Her sayfa `{ id, baslik, menu?, bolumler: [...] }`.
İlk sayfa ana sayfadır (sayfa başlığı ve kırıntı yolu çıkmaz).

| Bölüm | Veri |
|---|---|
| `hero` | `kurumsal.hero {baslik, metin, ust, birincil, ikincil, ikincilRota, bilgi: [[etiket, değer]]}` |
| `ozet` | `kurumsal.ozet {baslik, metin}` |
| `hizmetOzet` | `hizmetler[]` ilk 6 (`kisa` varsa o) |
| `rakamlar` | `istatistikler[]` ("yıldır" içeren ya da `kurulustanHesapla` olan kuruluştan hesaplanır) |
| `anlasmaOzet`, `anlasmalar` | `kurumsal.anlasmalar[] {baslik, kisa, metin, maddeler, buton}`, `anlasmaNotu` |
| `yorumlar`, `markalar`, `galeri` | `yorumlar[]`, `puan`, `markalar[]`, `galeri[]` |
| `hakkimizda` | `kurumsal.hakkimizda {baslik, paragraflar[], gorsel}` |
| `vizyon` | `kurumsal.misyon`, `kurumsal.vizyon`, `kurumsal.degerler[] {baslik, metin}` |
| `kalite` | `kurumsal.kalite {baslik, metin, maddeler[]}`, `kurumsal.belgeler[]` ya da `belgeler[]`, `garanti` |
| `tarihce` | `kurumsal.tarihce` ya da `tarihce` (`[[yıl, metin]]` ya da `{yil, baslik, metin}`) |
| `hizmetler` | `hizmetler[] {baslik, aciklama, sure, gorsel, detay: [[etiket, değer]]}` |
| `surec` | `surec[]` (gerçekten sıralı adımlar; numaralı gösterilir) |
| `sss` | `kurumsal.sss[] {soru, cevap}` |
| `kariyer` | `kurumsal.kariyer {baslik, metin}` |
| `iletisim` | `konumlar[]` (yoksa `iletisim`), `saatler`, `kurumsal.konular[]`, `kurumsal.formBaslik` |
| `cta` | `kurumsal.cta {baslik, metin, buton}` |

Sayfa başlıkları: `kurumsal.sayfalar.<sayfa id> {baslik, metin, gorsel}`.

Kurumsal alanlarda uydurma belge, ortaklık ya da firma adı yazma. Belge yalnızca gerçekse (ör. üreticinin
kendi sitesinde listelediği); sigorta anlaşmaları için "güncel liste için arayın" gibi genel ifade kullan.

## İletişim formu

Ad, firma, telefon, e-posta, konu, mesaj ve KVKK onayı. Gönderim:
- `iletisim.whatsapp` varsa WhatsApp'ta hazır mesaj açılır,
- `iletisim.eposta` varsa ayrıca e-posta ile gönder (mailto),
- ikisi de yoksa mesaj panoya kopyalanır ve telefon numarası gösterilir.

Hizmet ve anlaşma bağlantıları `#/iletisim?konu=...` ile konuyu seçili açar.

## Sektör modülü (extra.js)

```js
export const modulAdi = {
  render(d, ctx, sorgu) { return `<section class="k-bolum">…</section>`; }, // '' dönerse görünmez
  mount(el, d, ctx, sorgu) { … },  // sayfa her açıldığında; gsap.context içinde çalışır, sayfa değişince temizlenir
};
```

Başlıklara `data-bol` (satır satır açılır), görsellere `data-perde` (perde gibi açılır), çizgilere `data-cizgi`,
sayılara `data-sayac="1200"`, listelere `data-sira` verirsen motorun hareketleri otomatik uygulanır.
`reducedMotion` açıkken hiçbiri çalışmaz.

## Diğer seçenekler

- `ld: (d) => ({...})`: JSON-LD'yi değiştirir (eczane `Pharmacy`, üretici `Organization`).
- `aksiyon: (d) => [{ href, ikon, etiket, dis?, rota? }]`: mobil alt çubuğu değiştirir (vitrin modunda dokunmaz).
- Rota bağlantısı: `<a href="#/iletisim" data-rota="iletisim">`. `data-rota` şart; çekirdeğin `#` tıklama
  dinleyicisinden önce yakalanır.
