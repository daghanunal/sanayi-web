# Telefon sözleşmesi (phone contract)

Mobilde "kaydırma ve menüler üst üste biniyor" hatasının kuralları: aynı anda en fazla bir
üst öğe ve bir alt öğe görünür, hikâye kartları kısa kalır, hiçbir şey içeriği örtmez. Ortak
parçalar (`shared/core.js`, `shared/base.css`) bunun altyapısını verir; presetler aşağıdaki
kalıpları benimser. Uyumu `scripts/ux-audit.mjs` ölçer.

## Kurallar

1. **Tek üst öğe.** Sabit başlık (logo + menü + ara) tek bir kutudur. Aynı anda ikinci bir sabit
   üst şerit (HUD etiketi, ilerleme rayı, ölçüm kartı, yapışkan bölüm başlığı) açılacaksa ya
   başlığın *içine* yerleşir ya da başlık o sırada saklanır (`autoHideHeader`).
2. **Tek alt öğe.** Alt çubuk (`.action-bar` / `.vitrin-bar`) *ya da* hikâye kartı. İkisi aynı
   anda görünmez: pinli bir hikâye ekranı kaplarken alt çubuk kendiliğinden aşağı kayar
   (hikâye modu), kart çubuğun boşluğuna iner (`bottom: var(--bar-space)`).
3. **Hikâye kartı ≤ ekranın %40'ı.** Alt/orta bölgedeki sabit ya da pinli kart 390×844'te
   ≤ 338 px, 360×740'ta ≤ 296 px. Fazlası sahneyi kapatır; uzun metin kaydırılan bölüme taşınır.
4. **Hiçbir şey içeriği örtmez.** Metin ve butonlar başka bir sabit katmanın altında kalmaz;
   sayfa sonu alt çubuğun altında kalmaz; görünmez (opacity 0) katmanlar dokunmayı yutmaz.
5. **Pin ≤ 3 ekran.** Bir sahne en fazla 3 ekran boyu pinli kalır; daha uzun hikâyeler birkaç
   kısa sahneye bölünür. Giriş perdesi kaydırmayı 3 sn'den uzun kilitlemez.
6. **Taşma yok.** Yatay kaydırma yok, başlıklar ekran kenarından ya da `overflow: hidden`
   kutudan kırpılmaz, birincil dokunma hedefleri ≥ 44×44 px ve birbirinin üstüne binmez.

## Ortak altyapı (hazır, preset değişikliği gerektirmez)

| Kanca | Nerede | Anlamı |
|---|---|---|
| `--bar-h` | `html` | Alt çubuğun gerçek yüksekliği (JS ölçer; masaüstünde action bar için 0). |
| `--bar-reserve` | `html` | `--bar-h + 20px + safe-area`. Sabit; `body` alt boşluğu bunu kullanır. |
| `--bar-space` | `html` | Yüzen kartların alttan bırakacağı boşluk. Normalde `--bar-reserve`, hikâye modunda `12px + safe-area` (yumuşak geçişle). |
| `--header-h` | `html` | Sabit üst başlığın yüksekliği (yüklemede ölçülür, `autoHideHeader` günceller). |
| `html[data-phone-bar]` | `html` | `action` ya da `vitrin`. |
| `html[data-phone-story]` | `html` | Hikâye modu açık: alt çubuk gizli. |
| `[data-pinned]` | bölüm ya da `body` | Presetin "bu pinli bir hikâye" bildirimi. |
| `[data-autohide]`, `[data-autohide-hidden]` | başlık | `autoHideHeader` işaretleri. |

`html` üzerindeki kancalar `data-phone-*` önekli: bazı presetler `document.querySelector('[data-bar]')`
ile kendi öğesini arıyor; `<html data-bar>` o aramayı `<html>`'e çevirip sayfayı siliyordu.
Aynı nedenle değişken adları presetlerdekilerle çakışmaz: `--top-h` bir presette zaten kullanıldığı
için üst başlık değişkeni `--header-h`. Yeni ortak kanca eklerken önce `grep -r` ile presetlere bak.

Otomatik davranışlar:

- **Sayfa sonu boşluğu**: `body { padding-bottom: var(--bar-reserve) }` (telefonda; vitrin
  modunda her genişlikte). iPhone ev çubuğu (safe-area) artık dahil.
- **Hikâye modu (otomatik)**: GSAP `pin` (≥ yarım ekran pin mesafesi; tam ekran sahne ya da alt
  çubuk bölgesine inen pinli kart) ya da ekran boyu `position: sticky` sahne ekranı kaplıyorsa,
  sahneye çeyrek ekran girildikten sonra ve pinin bitmesine 0,1 ekran kalana kadar alt çubuk
  aşağı kayar. Kullanıcı yukarı kaydırınca çubuk geri
  gelir, aşağı devam edince yine saklanır. İlk ekran (hero) ve bölüm sonları çubuklu kalır.
- **Çapa atlamaları**: `a[href^="#"]` tıklaması hedefi üst başlığın altına indirir
  (`scroll-margin-top`, varsayılanı `--header-h`). Odaklanan buton alt çubuğun altında kalmaz
  (`scroll-margin-bottom: var(--bar-reserve)`).

## Presetin benimseyeceği kalıplar

### 1. Yüzen hikâye kartı: sabit px yerine `--bar-space`

Önce (her presette ayrı sabit sayı, vitrin için ayrı kural):

```css
.card { position: absolute; left: 12px; right: 12px; bottom: 100px; }
.is-vitrin .card { bottom: 104px; }
```

Sonra (tek kural; hikâye modunda kart çubuğun boşluğuna yumuşakça iner):

```css
.card {
  position: absolute; left: 12px; right: 12px;
  bottom: calc(var(--bar-space) + 12px);
  max-height: 40svh; overflow: auto;          /* kural 3 */
}
```

### 2. Pinli hikâyeyi bildirmek

Otomatik algılama GSAP pin'lerini (`pinSpacing: false` dahil) ve ekran boyu sticky sahneleri
yakalar. Algılanmayan (ör. özel kaydırıcı, `pinType: 'transform'`, JS ile sabitlenen sahne) ya da
hero'da da çubuğu saklamak istediğin sahne için:

```html
<section class="film" data-pinned> … </section>
```

```js
import { storyZone, setStoryMode, ScrollTrigger } from '../../shared/core.js';

storyZone(document.querySelector('.film'));   // = data-pinned ekler

// ya da tam denetim (ör. ScrollTrigger geri çağrılarıyla):
ScrollTrigger.create({
  trigger: '.film', start: 'top top', end: 'bottom bottom',
  onToggle: (st) => setStoryMode(st.isActive ? true : null),  // null = otomatiğe dön
});
```

Hikâye modunu bu presette hiç istemiyorsan: `<html data-phone-story-auto="off">` ya da
`setStoryMode(false)`.

### 3. Tek üst öğe: başlığı aşağı kaydırırken sakla

```js
import { autoHideHeader } from '../../shared/core.js';
autoHideHeader(document.querySelector('.top'), { offset: 80 });
```

```css
/* Başlığın kendi transform'u varsa (ör. giriş animasyonu) sarmalayıcıya uygula. */
.rail, .meter { top: calc(var(--header-h) + 8px); transition: top .3s; }  /* HUD başlığın altına */
```

Pinli sahnede HUD etiketleri (ray, sayaç, bölüm adı) varsa: ya başlığın içine taşı ya da
`html[data-phone-story] .top { transform: translateY(-100%) }` ile sahne boyunca başlığı sakla.

### 4. Yapışkan bölüm başlığı sabit başlığın altında kalmasın

```css
.sec-head { position: sticky; top: var(--header-h); }
```

### 5. Sayfa sonu ve alt boşluk

`body` alt boşluğu ortakta. Preset `body { padding-bottom: 0 }` yapıp boşluğu footer'a
veriyorsa sabit sayı yerine:

```css
@media (max-width: 899px) {
  body { padding-bottom: 0; }
  .foot { padding-bottom: calc(var(--bar-reserve) + 24px); }
}
```

`.is-vitrin …` ile ayrı sayı yazmaya gerek yok: `--bar-h` vitrin çubuğunu da kapsar.

### 6. Görünmez katmanlar dokunmayı yutmasın

Sırayla beliren hero bölümleri, kart desteleri, perdeler `opacity: 0` iken tıklamayı almamalı:

```css
.hero__chapter { pointer-events: none; }
.hero__chapter.is-active { pointer-events: auto; }
/* ya da GSAP ile: gsap.set(el, { autoAlpha: 0 }) → visibility: hidden dokunmayı da kapatır */
```

### 7. Taşan başlık ve kırpılan etiket

```css
h1, h2 { overflow-wrap: anywhere; hyphens: auto; }          /* uzun Türkçe kelimeler */
.hero__title { font-size: clamp(40px, 13vw, 96px); }        /* 360px'te de sığsın */
.rail li span { white-space: nowrap; overflow: visible; }   /* ya da kısa etiket */
```

### 8. Giriş perdesi

Perde en fazla ~1,5 sn; kaydırma kilidi (`lenis.stop()`, `overflow: hidden`) 3 sn'yi geçmez ve
kullanıcı dokununca/kaydırınca perde hemen kalkar. `prefers-reduced-motion` ve vitrin modunda
perde gösterilmez.

## Kontrol listesi (preset başına)

- [ ] Aynı anda en fazla 1 üst + 1 alt sabit öğe (ux-audit `stack`).
- [ ] Hikâye kartları `bottom: calc(var(--bar-space) + …)` ve ≤ 40svh (`sheet-tall`, `layer-overlap-bar`).
- [ ] HUD etiketleri başlıkla çakışmıyor (`label-collision`, `text-covered-anchored`, `text-overlap`).
- [ ] Görünmez katman yok (`tap-blocked-invisible`).
- [ ] Pin ≤ 3 ekran (`pin-long`), giriş ≤ 3 sn (`intro-block`).
- [ ] 360 px'te taşma/kırpılma yok (`h-overflow`, `text-offscreen`, `text-clipped`).
- [ ] Konsol hatası ve 404 yok.

## Denetimi çalıştırmak

```sh
BASE_PATH=/sanayi-web/ pnpm build
BASE_PATH=/sanayi-web/ pnpm vite preview --port 4175 --strictPort &
node scripts/ux-audit.mjs --tag after --compare before          # tümü (~25 dk, 8 paralel)
node scripts/ux-audit.mjs silindir garaj --tag after            # yalnız bazıları (sonuçlar birleşir)
open .shots/ux-audit/after/report.html
```
