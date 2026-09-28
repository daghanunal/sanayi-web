# Kurumsal motor

Her sektörün "kurumsal" sürümü bu motorla yapılır: tek sayfalık, hash yönlendirmeli (`#/kurumsal`, `#/iletisim?konu=...`)
bir kurumsal site. Üst menü, mobil tam ekran menü, sayfa geçiş perdesi, kırıntı yolu, küçülen başlık çubuğu,
sütunlu footer, KVKK penceresi ve çerez bandı motorda; varyant yalnızca tema, sayfa listesi, veri ve en fazla bir
sektöre özel modül verir.

Bu klasör bir sayfa değildir (index.html yok); build'e girmez.

```
presets/_kurumsal/
  engine.js     kurumsal({ veri, tema, sayfalar, ekstralar, ld, aksiyon }) — iskelet, yönlendirme, geçiş, hareket
  bolumler.js   bölüm kataloğu (render + mount), sayfaBasligi(), bizDiliMi(), duz(), yilEki (çekirdekten)
  base.css      bütün görünüm --k-* değişkenlerinden
presets/kurumsal-<sektor>/
  index.html    font bağlantısı + <main id="sayfa">
  main.js       veriyi birleştir, kurumsal({...}) çağır
  extra.js      (isteğe bağlı) tek sektör modülü
  style.css     (isteğe bağlı) ince ayarlar
data/kurumsal-<sektor>.json   yalnızca kurumsal alanlar; sektörün ana veri dosyasıyla birleşir
```

## İçerik standardı (İÇERİK-BRIEF, 2026-09-28)

Motor `.shots/ICERIK-BRIEF.md` kurallarını varsayılan olarak uygular; eski veriyle çalışan varyantlar da boş bölüm ya
da `undefined` göstermeden açılır. Kısaca:

- **Künye varsayılan.** `hero` bölümü işletmenin adını (h1), `isletme.tanim` (yoksa `sektor`), kısa adresi, bugünkü
  durumu ve telefonu, altında Ara / WhatsApp / Yol tarifi düğmelerini gösterir. `kurumsal.hero.baslik`, `metin`,
  `bilgi` ve `isletme.slogan` okunmaz. Eski hero yalnız `tema.kunye: false` ile döner (o da sloganı okumaz).
- **"Çalışma saatleri ve konum" varsayılan.** Sayfa listesinde `konum` yoksa ana sayfaya, "Örnek yorumlar"dan (yoksa
  CTA'dan) önce eklenir. Eklenmediği durumlar: `tema.konum: false`; `konum` başka bir sayfada; ana sayfada `iletisim`
  var; ana sayfada saatleri gösteren bir varyant modülü var (modül `konumYerine: true` der ya da kodu `saatler`
  verisini okur; mesai, saat, bugün, nöbet gibi modüller kendiliğinden sayılır).
- **Slogan ve övgü bölümleri boş döner:** `vizyon` (misyon, vizyon, değerler) hiçbir şey göstermez. `kalite`
  yalnız gerçek belgeleri (`kurumsal.belgeler` / `belgeler`) "Belgeler" başlığıyla gösterir; `kalite.metin`,
  `kalite.maddeler` ve `garanti` okunmaz. Bu bölümler sayfa listesinde kalsa da zararsızdır, ama silin.
- **Rakamlar yalnız olgu:** `istatistikler` içinden yalnız kuruluştan hesaplananlar (`kurulustanHesapla`,
  `deger: "kurulus"` ya da etikette "yıldır") ve saatlerden hesaplananlar (`saatlerdenHesapla` ya da etikette
  "haftada açık") gösterilir. Uydurma sayaçlar ("18.400 araç", "1 yıl garanti") eski veride kalsa da görünmez.
  Gerçekten doğrulanmış başka bir olgu `olgu: true` ile işaretlenir. Hiç olgu kalmazsa kuruluş yılı ve saatlerden
  iki blok kurulur (etiket `tema.yer` ya da "2001'den beri", ikincisi "haftada açık"); `istatistikler: []` bloğu kapatır.
- **Örnek yorumlar:** başlıkta "örnek" geçmiyorsa başlık "Örnek yorumlar" olur. `puan` (yıldız, değerlendirme
  sayısı) gösterilmez.
- **Başlık süzgeci:** veri başlığı "biz" diliyle yazılmışsa ("Biz kimiz", "Hizmetlerimiz", "Nasıl çalışıyoruz",
  "Birlikte çalışalım", "Atölyemizden", "Bize yazın", misyon/vizyon) bölümün düz başlığı yazılır. Aynı süzgeç
  CTA metnine ve düğmesine, footer'daki `tema.hizmetEtiketi`'ne, sayfa başlığının alt satırına (`sayfalar.<id>.metin`) ve `anlasmaMetin`'e uygulanır (biz diliyse
  gösterilmez); özet (`ozet.metin`) biz diliyse düz yazılmış `isletme.hakkinda` tercih edilir. Süzgeç
  `bizDiliMi(metin)` ve `duz(veri, varsayilan)` olarak `bolumler.js`'ten dışa açık. Gövde metnini düzeltmez:
  paragraflar, hizmet açıklamaları, anlaşma maddeleri veri sahibinin işidir.
- **Boş sayfa menüye girmez:** ana sayfa ve iletişim dışında, CTA dışındaki bütün motor bölümleri boş dönen sayfa
  (varyant modülü yoksa) menüden ve footer'dan çıkar.

### Varsayılan metinler

| Yer | Metin |
|---|---|
| Başlık çubuğu düğmesi (`tema.teklifEtiketi`) | İletişim |
| `ozet` başlığı | Hakkında (bağlantı: hakkında sayfasının menü adı) |
| `hizmetOzet` başlığı / bağlantı | Hizmetler / Tümü (hizmet listesinin bulunduğu sayfaya) |
| `hakkimizda` başlığı / imza | Hakkında / "Demirhan Motor 1996'dan beri Şaşmaz'da." (`tema.yer`; yoksa "Kuruluş yılı 1996."; `hakkimizda.imza: false` kapatır) |
| `bilgiler` başlığı | Genel bilgiler |
| `konum` başlığı | Çalışma saatleri ve konum |
| `yorumlar` başlığı | Örnek yorumlar |
| `cta` | İletişim / "Bilgi için arayın ya da formdan yazın." / İletişim formu (sektöre göre `cta.metin`: "Fiyat ve randevu için arayın ya da formdan yazın.") |
| `anlasmaOzet` başlığı / bağlantı | Kurumsal müşteriler / anlaşmaların bulunduğu sayfanın menü adı |
| `anlasmalar` düğmesi | Bilgi alın |
| `hizmetler` bağlantısı (`kurumsal.hizmetLink`) | Bu hizmet için bilgi alın |
| `surec` başlığı | Çalışma sırası |
| `galeri` / `markalar` / `tarihce` | Galeri / Markalar / Tarihçe |
| `kariyer` başlığı / bağlantı | Kariyer / İş başvurusu |
| `iletisim` form başlığı / konular | Mesaj gönderin / Randevu, Fiyat bilgisi, Genel bilgi, Diğer |
| KVKK | öznesiz bilgi cümleleri, en altta "Veri sorumlusu: ad, adres" |

Yeni metin yazarken aynı kurallar: başlık isim tamlaması, gövde öznesiz geniş zamanlı edilgen ("Hata kodları okunur,
arıza ölçülerek bulunur."), "biz" dili, vaat, fiyat, ünlem yok. Firma adıyla üçüncü şahıs yalnız Hakkında'da.

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
  yer,                                   // "Şaşmaz'da": Hakkında imzası ("… 1996'dan beri Şaşmaz'da.") ve varsayılan yıl bloğunun etiketi
  kunye,                                 // varsayılan açık: hero künye olur (ad, tanım, Adres / Bugün / Telefon, Ara / WhatsApp / Yol tarifi);
                                         // saatler "08.30–19.00" biçiminde. false: eski hero ve eski saat biçimi
  konum,                                 // varsayılan açık: ana sayfaya "Çalışma saatleri ve konum" eklenir (yukarıda). false: eklenmez
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

Varsayılan: `VARSAYILAN_SAYFALAR` (engine.js), brief'in akışıyla:

```js
{ id: 'anasayfa',            baslik: 'Ana Sayfa',           bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
{ id: 'hizmetler',           baslik: 'Hizmetler',           bolumler: ['hizmetler', 'surec', 'cta'] },
{ id: 'kurumsal',            baslik: 'Hakkında',            bolumler: ['hakkimizda', 'bilgiler', 'kalite', 'tarihce', 'markalar', 'cta'] },
{ id: 'kurumsal-musteriler', baslik: 'Kurumsal Müşteriler', bolumler: ['anlasmalar', 'cta'] },
{ id: 'referanslar',         baslik: 'Galeri',              bolumler: ['galeri', 'markalar', 'cta'] },
{ id: 'iletisim',            baslik: 'İletişim',            bolumler: ['iletisim'] },
```

Id'ler eskisiyle aynı (`VARSAYILAN_SAYFALAR.map(s => s.id === 'kurumsal' ? …)` kalıbı çalışır); başlıklar
ve bölümler değişti. Yeni varyantta sayfa listesini açıkça yazmak daha okunaklı: pilot `presets/kurumsal-elektrik`.
Her sayfa `{ id, baslik, menu?, bolumler: [...] }`. İlk sayfa ana sayfadır (sayfa başlığı ve kırıntı yolu çıkmaz).

| Bölüm | Veri |
|---|---|
| `hero` | Künye (varsayılan): `isletme.ad`, `isletme.tanim` (yoksa `sektor`), `iletisim.adres` (kısa), `saatler`, `iletisim.telefon`, `iletisim.whatsapp`. Eski hero (`tema.kunye: false`): `kurumsal.hero {baslik, metin, ust, birincil, ikincil, ikincilRota, bilgi}` |
| `ozet` | `kurumsal.ozet {baslik, metin}` (metin yoksa `isletme.hakkinda`; ikisi de yoksa bölüm yok) |
| `hizmetOzet` | `hizmetler[]` ilk 6 (`kisa` varsa o), başlık `kurumsal.hizmetOzetBaslik` |
| `rakamlar` | `istatistikler[]`, yalnız olgular (yukarıda) |
| `konum` | Formsuz "Çalışma saatleri ve konum": `saatler`, `iletisim.adres`, harita (yaklaşınca), `kurumsal.konumBaslik` |
| `bilgiler` | `bilgiler: [[etiket, değer]]` (ya da `kurumsal.bilgiler`), başlık `kurumsal.bilgiBaslik`. Araçlar, cihazlar, randevu gibi kısa olgular; `kalite` maddelerinin yerine |
| `anlasmaOzet`, `anlasmalar` | `kurumsal.anlasmalar[] {baslik, kisa, metin, maddeler, buton}`, `anlasmaBaslik`, `anlasmaMetin`, `anlasmaNotu` |
| `yorumlar`, `markalar`, `galeri` | `yorumlar[]`, `markalar[]` + `markaBaslik` (ör. "Bakım yapılan markalar"), `galeri[]` + `galeriBaslik` |
| `hakkimizda` | `kurumsal.hakkimizda {baslik, paragraflar[], gorsel, gorselAlt, imza}` (paragraf yoksa `isletme.hakkinda`) |
| `vizyon` | **kaldırıldı**: hiçbir şey göstermez; `misyon`, `vizyon`, `degerler` veriden silinir |
| `kalite` | yalnız `kurumsal.belgeler[]` ya da `belgeler[]` (gerçek belgeler), başlık `kurumsal.belgeBaslik`; `kalite {metin, maddeler}` ve `garanti` okunmaz |
| `tarihce` | `kurumsal.tarihce` ya da `tarihce` (`[[yıl, metin]]` ya da `{yil, baslik, metin}`) |
| `hizmetler` | `hizmetler[] {baslik, aciklama, sure, etiket, gorsel, detay: [[etiket, değer]]}`, bağlantı metni `kurumsal.hizmetLink` |
| `surec` | `surec[]` (gerçekten sıralı adımlar; numaralı gösterilir), başlık `kurumsal.surecBaslik` |
| `sss` | `kurumsal.sss[] {soru, cevap}`, `kurumsal.sssBaslik` |
| `kariyer` | `kurumsal.kariyer {baslik, metin}` |
| `iletisim` | `konumlar[]` (yoksa `iletisim`), `saatler`, `kurumsal.konular[]`, `kurumsal.formBaslik`, `kurumsal.kvkk.paragraflar` |
| `cta` | `kurumsal.cta {baslik, metin, buton}` |

Sayfa başlıkları: `kurumsal.sayfalar.<sayfa id> {baslik, metin, gorsel}`. `baslik` kırıntı yolundaki menü adıyla
aynı olsun (ör. sayfa "Hakkında" ise h1 de "Hakkında").

### Sektör verisini yenilerken (kurumsal varyant için yapılacaklar)

1. `tema`'dan `kunye: true` gerekmez (varsayılan). Sayfa listesinden `vizyon`'u sil; `kalite` yalnız gerçek belge
   varsa kalsın. Menü: Ana Sayfa, Hizmetler, Hakkında, (varsa sektör modülü sayfası), İletişim; kurumsal/filo
   sayfası gerekiyorsa kalsın.
2. Ana sayfa sırası: `hero`, `hizmetOzet`, `ozet`, (`rakamlar`), `konum`, `yorumlar`, `cta`. Kendi saat modülün
   varsa ya `konum`'u kullan ya da modülüne `konumYerine: true` ver.
3. `data/kurumsal-<id>.json`'dan sil: `kurumsal.hero`, `misyon`, `vizyon`, `degerler`, `kalite` (belge değilse),
   `garanti`, `puan`, uydurma `istatistikler` (varyant JSON'u ortak veriyi ezer: ortak dosyadaki olgu blokları
   yeterliyse `istatistikler`'i varyanttan tamamen kaldır).
4. Yeniden yaz: `ozet`, `hakkimizda.paragraflar`, `cta`, `anlasmaMetin`, `anlasmalar[].metin/maddeler`,
   `anlasmaNotu`, `kariyer.metin`, `sss`, `sayfalar.<id>.baslik/metin`, `konular`, `formBaslik`. Başlıklar düz
   ("Hakkında", "Hizmetler", "Örnek yorumlar", "İletişim"); gövde öznesiz.
5. Sektör modüllerindeki (extra.js) metinler ve motor çıktısına yapılan `.replace(...)` yamaları: motorun varsayılan
   metinleri değişti ("Bu hizmet için teklif isteyin" artık "Bu hizmet için bilgi alın", "Kurumsal" menüsü artık
   "Hakkında", puan satırı yok); eşleşmeyen yama sessizce etkisiz kalır, temizle.

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
  konumYerine: true,               // (isteğe bağlı) modül saatleri/konumu gösteriyor: motor ana sayfaya `konum` eklemez
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

## Telefon sözleşmesi (docs/phone-contract.md)

Motor sözleşmeyi kendisi uygular; varyantın bir şey yapması gerekmez:

- **Tek üst öğe:** telefonda (< 900 px) `.k-ust` `autoHideHeader` ile aşağı kaydırınca saklanır, yukarı kaydırınca
  döner; menü açıkken hep görünür. Telefonda küçülen başlığın yüksekliği sabittir (`--k-ust`), `--header-h` kaymaz.
  Masaüstünde başlık sabit kalır. Açılış hareketi `.k-ust__ic`'te: `.k-ust`'e transform verme (autohide'ı ezer).
- **Tek alt öğe:** çerez notu telefonda footer'ın başında akışta duran ince şerittir (alt çubukla hiç üst üste
  binmez); masaüstünde sağ altta kart (`bottom` `--bar-space`'e göre). "Tamam" localStorage'da kalır, vitrinde yok.
- **Sayfa sonu:** alt çubuk boşluğu body yerine footer'da (`.k-alt` alt dolgusu `--bar-reserve` içerir);
  varyant `body`/`.k-alt` alt boşluğuna sabit sayı yazmasın.
- **Mobil menü:** açıkken sayfa kaymaz (html+body overflow, Lenis durur), `#sayfa` ve footer `inert`, odak menüye
  geçer, kapanınca burger'a döner; alt boşluk `--bar-reserve`.
- **Dokunma hedefleri ≥ 44 px:** `.k-logo`, `.k-link`, `.k-btn--kucuk`, `.k-metin-dugme`, telefonda footer ve
  kırıntı bağlantıları. Varyant modüllerindeki küçük düğmeler (sekme, çip, range, select) varyantın işidir.
- **Rota değişimi:** sayfa önce başa kaydırılır, sonra kurulur (eski konumda oluşan `once` tetikleyicileri
  ScrollTrigger'ı çökertiyordu).
- Varyant yüzen bir öğe eklerse `bottom: calc(var(--bar-space) + 12px)`, yapışkan öğe `top: var(--header-h)`.
