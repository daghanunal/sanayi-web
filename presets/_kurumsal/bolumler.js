// Bölüm kataloğu. Her bölüm: { render(d, ctx, sorgu) → HTML | '', mount?(el, d, ctx, sorgu) }.
// Veri yoksa bölüm boş döner ve sayfada görünmez; böylece aynı sayfa listesi her sektörde çalışır.
import {
  esc, telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, GUNLER,
  yilEki, saatListesi, gunDurumu, kisaAdres, acikGunSayisi,
} from '../../shared/core.js';

const buYil = new Date().getFullYear();

// yilEki çekirdeğe taşındı; varyantlar ('../_kurumsal/bolumler.js') buradan almaya devam eder.
export { yilEki };

// --- Künye yardımcıları (tema.kunye): shared/core.js → saatListesi, gunDurumu, kisaAdres ---------
// Künye (varsayılan) saatleri "08.30–19.00" biçiminde yazar; `tema.kunye: false` eski biçimi korur.
const kunyeMi = (tema) => tema?.kunye !== false;
const saatSatirlari = (d, tema) => (kunyeMi(tema) ? saatListesi(d.saatler) : groupedHours(d.saatler));
const durumSatiri = (d, tema) => {
  if (!kunyeMi(tema)) { const st = openStatus(d.saatler); return { acik: st.open, metin: st.text }; }
  const b = gunDurumu(d.saatler);
  return { acik: b.open, metin: b.metin };
};

// --- Başlık süzgeci (İÇERİK-BRIEF: başlık düz ve bilgi verir, "biz" dili yok) -------------------------
// Eski varyant verisinde kalan "Biz kimiz", "Hizmetlerimiz", "Nasıl çalışıyoruz", "Birlikte çalışalım",
// "Atölyemizden" gibi başlıklar yerine bölümün düz başlığı yazılır. Yalnız başlıklara ve CTA metnine
// uygulanır; gövde metni veri sahibinin işidir. "temiz" gibi -miz ile biten sıradan sözcükler hariç.
const SON = '(?![a-zçğıöşüâîû])';
const BIZ_DILI = new RegExp(
  [
    `(?:^|[^a-zçğıöşü])biz(?:im|imle|e|i|den|le)?${SON}`, // biz, bize, bizimle…
    `[aeıioöuü]m[ıiuü]z(?:d[ae]n|t[ae]n|[ıi]n|[ae]|[ıiuü]|l[ae]|d[ae])?${SON}`, // -ımız / -imiz / -miz (+ ek)
    `[ıiuü]yoruz${SON}`, `[ae]l[ıi]m${SON}`, `[aeıiuü]r[ıiuü]z${SON}`, `m[ae]y[ıi]z${SON}`, `[ae]c[ae]ğ[ıi]z${SON}`,
    'misyon', 'vizyon', 'neden biz', 'atölyeden', 'dükkândan', 'dükkandan',
  ].join('|'),
  'i'
);
const HARIC = /(temiz|omuz|domuz|selim|halim)/g;
export const bizDiliMi = (m) => BIZ_DILI.test(String(m || '').toLocaleLowerCase('tr').replace(HARIC, ''));
// Veri başlığı düz ise o, değilse bölümün varsayılan başlığı.
export const duz = (veri, varsayilan) => (veri && !bizDiliMi(veri) ? veri : varsayilan);

// Künye ve footer'daki tek olgu cümlesi: isletme.tanim; yoksa sektör adı cümle düzeninde
// ("Egzoz, DPF ve Katalitik Konvertör" → "Egzoz, DPF ve katalitik konvertör"; kısaltmalar korunur).
export const tanimMetni = (d) => {
  if (d.isletme.tanim) return d.isletme.tanim;
  return String(d.isletme.sektor || '')
    .split(' ')
    .map((w, i) => (i && /\p{Ll}/u.test(w) ? w.toLocaleLowerCase('tr') : w))
    .join(' ');
};

const rota = (id, metin, cls = 'k-btn') => `<a class="${cls}" href="#/${id}" data-rota="${id}">${metin}</a>`;
const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const baslik = (metin, cls = 'k-h2') => `<h2 class="${cls}" data-bol>${esc(metin)}</h2>`;
const k = (d) => d.kurumsal || {};
const kurulusYili = (d) => d.isletme.kurulus;

// Rakam blokları yalnız veriden türeyen olguları gösterir (İÇERİK-BRIEF): kuruluştan geçen yıl ve
// haftada açık gün. Uydurma sayaçlar ("18.400 araç", "1 yıl garanti") eski veride kalsa da gösterilmez;
// gerçekten doğrulanmış bir olgu `olgu: true` ile açıkça işaretlenir. Hiç olgu kalmazsa kuruluş yılı ve
// saatlerden iki varsayılan blok kurulur; `istatistikler: []` blokları tamamen kapatır.
function istatistikler(d, tema = {}) {
  const yil = kurulusYili(d) ? buYil - kurulusYili(d) : null;
  const gun = d.saatler ? acikGunSayisi(d.saatler) : null;
  const kaynak = d.istatistikler;
  if (Array.isArray(kaynak) && !kaynak.length) return [];
  const liste = (kaynak || [])
    .map((s) => {
      const yilMi = s.kurulustanHesapla || /^kurulus/.test(String(s.deger)) || /yıldır/.test(s.etiket || '');
      const gunMu = s.saatlerdenHesapla || /haftada açık/.test(s.etiket || '');
      if (yilMi) return yil ? { ...s, deger: yil } : null;
      if (gunMu) return gun ? { ...s, deger: gun } : null;
      return s.olgu && Number.isFinite(Number(s.deger)) ? { ...s, deger: Number(s.deger) } : null;
    })
    .filter(Boolean);
  if (liste.length) return liste;
  return [
    yil ? { deger: yil, sonek: ' yıl', etiket: tema.yer || `${yilEki(kurulusYili(d))} beri` } : null,
    gun ? { deger: gun, sonek: ' gün', etiket: 'haftada açık' } : null,
  ].filter(Boolean);
}

// --- Sayfa başlığı (ana sayfa dışındaki sayfalarda) ------------------------------------------

export function sayfaBasligi(sayfa, d, ctx) {
  const s = k(d).sayfalar?.[sayfa.id] || {};
  const ilk = ctx.sayfalar[0];
  return `
    <header class="k-sb">
      <div class="k-kap">
        <nav class="k-kirinti" aria-label="Bulunduğunuz yer"><a href="#/${ilk.id}" data-rota="${ilk.id}">${ilk.baslik}</a><span aria-hidden="true">/</span><span aria-current="page">${sayfa.baslik}</span></nav>
        <h1 class="k-h1 k-sb__baslik" data-bol>${esc(duz(s.baslik, sayfa.baslik))}</h1>
        ${s.metin && !bizDiliMi(s.metin) ? `<p class="k-lead k-sb__metin">${esc(s.metin)}</p>` : ''}
      </div>
      ${s.gorsel ? `<figure class="k-sb__gorsel" data-perde><img src="${s.gorsel}" alt="" fetchpriority="high"></figure>` : ''}
      <span class="k-sb__cizgi" data-cizgi></span>
    </header>`;
}

// --- Bölümler ----------------------------------------------------------------------------

export const BOLUMLER = {
  hero: {
    render(d, { tema }) {
      const h = k(d).hero || {};
      // Künye: işletmenin adı, işi (tek olgu), adresi, bugünkü saatleri; Ara / WhatsApp / Yol tarifi. Slogan yok.
      if (kunyeMi(tema)) {
        const b = d.saatler ? gunDurumu(d.saatler) : null;
        return `
        <section class="k-hero k-hero--kunye" aria-label="Künye">
          <div class="k-kap k-hero__ic">
            <div class="k-hero__metin">
              <h1 class="k-h1 k-hero__baslik" data-bol>${esc(d.isletme.ad)}</h1>
              <p class="k-lead k-hero__tanim">${esc(tanimMetni(d))}</p>
              <dl class="k-kunye">
                <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
                ${b ? `<div><dt>Bugün</dt><dd><span class="k-durum ${b.open ? 'is-acik' : ''}"><span></span>${esc(b.kunye)}</span></dd></div>` : ''}
                <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></dd></div>
              </dl>
              <div class="k-butonlar">
                <a class="k-btn" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
                ${d.iletisim.whatsapp ? `<a class="k-btn k-btn--ikincil" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>` : ''}
                <a class="k-btn k-btn--ikincil" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              </div>
            </div>
            <figure class="k-hero__gorsel" data-perde><div class="k-hero__gorsel-ic" data-paralaks><img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high"></div></figure>
          </div>
        </section>`;
      }
      // Eski hero (yalnız `tema.kunye: false`). Slogan okunmaz: başlık yoksa işletmenin adı.
      const ust = h.ust || [tanimMetni(d), kurulusYili(d) ? `${tema.yer ? `${tema.yer} ` : ''}${yilEki(kurulusYili(d))} beri` : tema.yer].filter(Boolean).join('. ');
      const st = d.saatler ? openStatus(d.saatler) : null;
      const varsayilan = [
        kurulusYili(d) ? ['Kuruluş', String(kurulusYili(d))] : null,
        st ? ['Bugün', st.text] : null,
        ['Telefon', d.iletisim.telefon],
      ].filter(Boolean);
      const bilgi = (h.bilgi || varsayilan)
        .map(([e, v]) => `<div><dt>${esc(e)}</dt><dd>${esc(v)}</dd></div>`)
        .join('');
      return `
        <section class="k-hero" aria-label="Giriş">
          <div class="k-kap k-hero__ic">
            <div class="k-hero__metin">
              <p class="k-hero__ust">${esc(ust)}</p>
              <h1 class="k-h1 k-hero__baslik" data-bol>${esc(h.baslik || d.isletme.ad)}</h1>
              ${h.metin || d.isletme.hakkinda ? `<p class="k-lead">${esc(h.metin || d.isletme.hakkinda)}</p>` : ''}
              <div class="k-butonlar">
                ${rota('iletisim', `${h.birincil || 'İletişim'} ${ok}`)}
                ${h.ikincil ? rota(h.ikincilRota || 'hizmetler', h.ikincil, 'k-btn k-btn--ikincil') : `<a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>`}
              </div>
            </div>
            <figure class="k-hero__gorsel" data-perde><div class="k-hero__gorsel-ic" data-paralaks><img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high"></div></figure>
          </div>
          ${bilgi ? `<div class="k-kap"><dl class="k-hero__bilgi">${bilgi}</dl></div>` : ''}
        </section>`;
    },
  },

  ozet: {
    render(d, ctx = {}) {
      const o = k(d).ozet || {};
      // Bağlantı kurumsal/hakkında sayfasına gider (varyant sayfayı "hakkinda" diye adlandırmış olabilir).
      // "Biz" diliyle yazılmış eski özet yerine (varsa) düz yazılmış isletme.hakkinda.
      const adaylar = [o.metin, d.isletme.hakkinda].filter(Boolean);
      const metin = adaylar.find((x) => !bizDiliMi(x)) || adaylar[0];
      if (!metin) return '';
      const sf = ctx.sayfalar?.find((x) => x.id === 'kurumsal') || ctx.sayfalar?.find((x) => x.id === 'hakkinda') || ctx.sayfalar?.find((x) => x.bolumler?.includes('hakkimizda'));
      return `
        <section class="k-bolum k-ozet">
          <div class="k-kap k-iki">
            <div>${baslik(duz(o.baslik, 'Hakkında'))}</div>
            <div>
              <p class="k-buyuk-metin">${esc(metin)}</p>
              ${sf ? rota(sf.id, `${sf.menu || sf.baslik} ${ok}`, 'k-link') : ''}
            </div>
          </div>
        </section>`;
    },
  },

  hizmetOzet: {
    render(d, { tema, sayfalar = [] }) {
      const list = (d.hizmetler || []).slice(0, 6);
      if (!list.length) return '';
      // Hizmet listesi hangi sayfadaysa oraya bağlanır (varyant sayfayı "urunler", "menu" diye adlandırmış olabilir).
      const hizmetSayfasi = sayfalar.find((x) => x.bolumler?.includes('hizmetler'));
      const hRota = hizmetSayfasi?.id || 'hizmetler';
      return `
        <section class="k-bolum k-hozet">
          <div class="k-kap">
            <div class="k-bolum__bas">${baslik(duz(k(d).hizmetOzetBaslik, duz(tema.hizmetEtiketi, 'Hizmetler')))}${hizmetSayfasi ? rota(hizmetSayfasi.id, `Tümü ${ok}`, 'k-link') : ''}</div>
            <ul class="k-hozet__liste" data-sira>
              ${list
                .map(
                  (h) => `<li><a href="#/${hRota}" data-rota="${hRota}">
                    ${h.gorsel ? `<span class="k-hozet__gorsel"><img src="${h.gorsel}" alt="" loading="lazy"></span>` : ''}
                    <span class="k-hozet__ad">${esc(h.baslik)}</span>
                    <span class="k-hozet__metin">${esc(h.kisa || h.aciklama)}</span>
                    ${ok}</a></li>`
                )
                .join('')}
            </ul>
          </div>
        </section>`;
    },
  },

  rakamlar: {
    render(d, { tema } = {}) {
      const s = istatistikler(d, tema);
      if (!s.length) return '';
      return `
        <section class="k-bolum k-rakamlar">
          <div class="k-kap">
            <dl class="k-rakamlar__liste">
              ${s
                .map(
                  (x) => `<div><dt>${esc(x.etiket)}</dt><dd><span data-sayac="${x.deger}">${x.deger.toLocaleString('tr-TR')}</span>${esc(x.sonek || '')}</dd></div>`
                )
                .join('')}
            </dl>
          </div>
        </section>`;
    },
  },

  anlasmaOzet: {
    render(d, { sayfalar = [] } = {}) {
      const a = k(d).anlasmalar;
      if (!a?.length) return '';
      // Bağlantı anlaşmaların bulunduğu sayfaya gider ("filo", "servisler", "bayi"…); öyle bir sayfa yoksa bağlantı yok.
      const sf = sayfalar.find((x) => x.bolumler?.includes('anlasmalar'));
      return `
        <section class="k-bolum k-aozet">
          <div class="k-kap k-iki">
            <div>
              ${baslik(duz(k(d).anlasmaBaslik, 'Kurumsal müşteriler'))}
              ${k(d).anlasmaMetin && !bizDiliMi(k(d).anlasmaMetin) ? `<p class="k-lead">${esc(k(d).anlasmaMetin)}</p>` : ''}
              ${sf ? rota(sf.id, `${sf.menu || sf.baslik} ${ok}`, 'k-link') : ''}
            </div>
            <ul class="k-aozet__liste" data-sira>
              ${a.map((x) => `<li><span class="k-aozet__ad">${esc(x.baslik)}</span><span>${esc(x.kisa || x.metin)}</span></li>`).join('')}
            </ul>
          </div>
        </section>`;
    },
  },

  yorumlar: {
    render(d) {
      if (!d.yorumlar?.length) return '';
      // Yorumlar örnektir; başlık bunu söyler. Başlıkta "örnek" geçmiyorsa düz başlık yazılır. Puan ve
      // değerlendirme sayısı (gerçek kaynak ima eder) gösterilmez.
      const yb = k(d).yorumBaslik;
      return `
        <section class="k-bolum k-yorumlar">
          <div class="k-kap">
            <div class="k-bolum__bas">
              ${baslik(yb && /örnek/i.test(yb) ? yb : 'Örnek yorumlar')}
            </div>
            <ul class="k-yorumlar__liste" data-lenis-prevent>
              ${d.yorumlar
                .map(
                  (y) => `<li><blockquote><p>${esc(y.metin)}</p></blockquote><p class="k-yorumlar__kim">${esc(y.ad)}${y.arac ? `, ${esc(y.arac)}` : ''}</p></li>`
                )
                .join('')}
            </ul>
          </div>
        </section>`;
    },
  },

  cta: {
    render(d) {
      const c = k(d).cta || {};
      return `
        <section class="k-bolum k-cta">
          <div class="k-kap k-cta__ic">
            ${baslik(duz(c.baslik, 'İletişim'), 'k-h2 k-cta__baslik')}
            <p class="k-lead">${esc(duz(c.metin, 'Bilgi için arayın ya da formdan yazın.'))}</p>
            <div class="k-butonlar">
              ${rota('iletisim', `${esc(duz(c.buton, 'İletişim formu'))} ${ok}`)}
              <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
        </section>`;
    },
  },

  hakkimizda: {
    render(d, { tema }) {
      const h = k(d).hakkimizda || {};
      const paragraflar = (h.paragraflar || [d.isletme.hakkinda]).filter(Boolean);
      if (!paragraflar.length) return '';
      // İmza satırı bir olgu cümlesidir: "Volt Oto Elektrik 2001'den beri Şaşmaz'da."
      const kur = d.isletme.kurulus;
      const imza = kur ? (tema.yer ? `${d.isletme.unvan || d.isletme.ad} ${yilEki(kur)} beri ${tema.yer}.` : `Kuruluş yılı ${kur}.`) : '';
      return `
        <section class="k-bolum k-hakkimizda">
          <div class="k-kap k-iki k-iki--gorsel">
            <div>
              ${baslik(duz(h.baslik, 'Hakkında'))}
              ${paragraflar.map((p) => `<p class="k-metin">${esc(p)}</p>`).join('')}
              ${imza && h.imza !== false ? `<p class="k-imza">${esc(imza)}</p>` : ''}
            </div>
            ${h.gorsel || tema.hakkimizdaGorsel ? `<figure class="k-gorsel" data-perde><img src="${h.gorsel || tema.hakkimizdaGorsel}" alt="${esc(h.gorselAlt || '')}" loading="lazy"></figure>` : ''}
          </div>
        </section>`;
    },
  },

  // Misyon, vizyon ve "değerlerimiz" listesi slogan ve övgüdür (İÇERİK-BRIEF): eski veride kalsa da
  // gösterilmez. Sayfa listesinde kalması zararsızdır; bölüm boş döner.
  vizyon: { render: () => '' },

  // "Kalite anlayışımız" maddeleri ve garanti cümlesi vaat olduğu için gösterilmez. Kalan tek olgu:
  // gerçek belgeler (`kurumsal.belgeler` ya da `belgeler`, ör. üreticinin kendi sitesinde yayımladığı).
  kalite: {
    render(d) {
      const belgeler = k(d).belgeler || d.belgeler;
      if (!belgeler?.length) return '';
      return `
        <section class="k-bolum k-kalite">
          <div class="k-kap k-iki">
            <div>${baslik(duz(k(d).belgeBaslik, 'Belgeler'))}</div>
            <ul class="k-belgeler">${belgeler.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
          </div>
        </section>`;
    },
  },

  // Kısa bilgiler: `bilgiler: [[etiket, değer]]` (sektör verisi; ör. ["Araçlar", "…"], ["Randevu", "…"]).
  bilgiler: {
    render(d) {
      const b = k(d).bilgiler || d.bilgiler;
      if (!b?.length) return '';
      return `
        <section class="k-bolum k-bilgiler">
          <div class="k-kap k-iki">
            <div>${baslik(duz(k(d).bilgiBaslik, 'Genel bilgiler'))}</div>
            <dl class="k-bilgiler__liste">${b.map(([e, v]) => `<div><dt>${esc(e)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
          </div>
        </section>`;
    },
  },

  tarihce: {
    render(d) {
      let t = k(d).tarihce || d.tarihce;
      if (!t?.length) return '';
      t = t.map((x) => (Array.isArray(x) ? { yil: x[0], metin: x[1] } : x));
      return `
        <section class="k-bolum k-tarihce">
          <div class="k-kap">
            ${baslik(duz(k(d).tarihceBaslik, 'Tarihçe'))}
            <ol class="k-tarihce__liste" data-sira>
              ${t.map((x) => `<li><span class="k-tarihce__yil">${esc(x.yil)}</span><div>${x.baslik ? `<h3>${esc(x.baslik)}</h3>` : ''}<p>${esc(x.metin)}</p></div></li>`).join('')}
            </ol>
          </div>
        </section>`;
    },
  },

  hizmetler: {
    render(d) {
      const list = d.hizmetler || [];
      if (!list.length) return '';
      return `
        <section class="k-bolum k-hizmetler">
          <div class="k-kap">
            <ul class="k-hizmetler__liste">
              ${list
                .map(
                  (h, i) => `<li class="k-hizmet" id="hizmet-${i}">
                    <div class="k-hizmet__bas">
                      <h2 class="k-h3">${esc(h.baslik)}</h2>
                      ${h.sure ? `<p class="k-hizmet__sure">${esc(h.etiket || 'Ortalama süre')}: <strong>${esc(h.sure)}</strong></p>` : ''}
                    </div>
                    <div class="k-hizmet__govde">
                      <p class="k-metin">${esc(h.aciklama)}</p>
                      ${h.detay?.length ? `<dl class="k-detay">${h.detay.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>` : ''}
                      <a class="k-link" href="#/iletisim?konu=${encodeURIComponent(h.baslik)}" data-rota="iletisim?konu=${encodeURIComponent(h.baslik)}">${esc(k(d).hizmetLink || 'Bu hizmet için bilgi alın')} ${ok}</a>
                    </div>
                    ${h.gorsel ? `<figure class="k-hizmet__gorsel" data-perde><img src="${h.gorsel}" alt="" loading="lazy"></figure>` : ''}
                    <span class="k-cizgi" data-cizgi></span>
                  </li>`
                )
                .join('')}
            </ul>
          </div>
        </section>`;
    },
  },

  surec: {
    render(d) {
      if (!d.surec?.length) return '';
      return `
        <section class="k-bolum k-surec">
          <div class="k-kap">
            ${baslik(duz(k(d).surecBaslik, 'Çalışma sırası'))}
            <ol class="k-surec__liste" data-sira>
              ${d.surec.map((s, i) => `<li><span class="k-surec__no">${String(i + 1).padStart(2, '0')}</span><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></li>`).join('')}
            </ol>
          </div>
        </section>`;
    },
  },

  anlasmalar: {
    render(d) {
      const a = k(d).anlasmalar;
      if (!a?.length) return '';
      return `
        <section class="k-bolum k-anlasmalar">
          <div class="k-kap">
            ${a
              .map(
                (x, i) => `<article class="k-anlasma">
                  <div class="k-anlasma__bas"><h2 class="k-h2" data-bol>${esc(x.baslik)}</h2><p class="k-lead">${esc(x.metin)}</p></div>
                  ${x.maddeler ? `<ul class="k-maddeler" data-sira>${x.maddeler.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
                  <a class="k-link" href="#/iletisim?konu=${encodeURIComponent(x.baslik)}" data-rota="iletisim?konu=${encodeURIComponent(x.baslik)}">${esc(x.buton || 'Bilgi alın')} ${ok}</a>
                  <span class="k-cizgi" data-cizgi></span>
                </article>`
              )
              .join('')}
            ${k(d).anlasmaNotu ? `<p class="k-not">${esc(k(d).anlasmaNotu)}</p>` : ''}
          </div>
        </section>`;
    },
  },

  galeri: {
    render(d) {
      const g = k(d).galeri || d.galeri;
      if (!g?.length) return '';
      return `
        <section class="k-bolum k-galeri">
          <div class="k-kap">
            ${baslik(duz(k(d).galeriBaslik, 'Galeri'))}
            <ul class="k-galeri__liste">
              ${g.map((x) => `<li><figure data-perde><img src="${x.src}" alt="${esc(x.alt)}" loading="lazy"></figure>${x.alt ? `<p>${esc(x.alt)}</p>` : ''}</li>`).join('')}
            </ul>
          </div>
        </section>`;
    },
  },

  markalar: {
    render(d) {
      const m = k(d).markalar || d.markalar;
      if (!m?.length) return '';
      return `
        <section class="k-bolum k-markalar">
          <div class="k-kap">
            <p class="k-alt-baslik">${esc(duz(k(d).markaBaslik, 'Markalar'))}</p>
            <ul class="k-markalar__liste">${m.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          </div>
        </section>`;
    },
  },

  sss: {
    render(d) {
      const s = k(d).sss;
      if (!s?.length) return '';
      return `
        <section class="k-bolum k-sss">
          <div class="k-kap k-iki">
            <div>${baslik(duz(k(d).sssBaslik, 'Sık sorulan sorular'))}</div>
            <div class="k-sss__liste">
              ${s.map((x) => `<details><summary>${esc(x.soru)}<span aria-hidden="true"></span></summary><p>${esc(x.cevap)}</p></details>`).join('')}
            </div>
          </div>
        </section>`;
    },
  },

  kariyer: {
    render(d) {
      const c = k(d).kariyer;
      if (!c) return '';
      return `
        <section class="k-bolum k-kariyer">
          <div class="k-kap k-iki">
            ${baslik(duz(c.baslik, 'Kariyer'))}
            <div>${c.metin ? `<p class="k-metin">${esc(c.metin)}</p>` : ''}${rota(`iletisim?konu=${encodeURIComponent('İş başvurusu')}`, `İş başvurusu ${ok}`, 'k-link')}</div>
          </div>
        </section>`;
    },
  },

  // Çalışma saatleri ve konum (formsuz): ana sayfanın "saatler ve konum" bölümü.
  konum: {
    render(d, { tema }) {
      if (!d.saatler) return '';
      const st = durumSatiri(d, tema);
      return `
        <section class="k-bolum k-konum">
          <div class="k-kap k-iki">
            <div>
              ${baslik(duz(k(d).konumBaslik, 'Çalışma saatleri ve konum'))}
              <div class="k-saatler">
                <p class="k-durum ${st.acik ? 'is-acik' : ''}"><span></span>${esc(st.metin)}</p>
                <dl>${saatSatirlari(d, tema).map(([g, s]) => `<div><dt>${g}</dt><dd>${s}</dd></div>`).join('')}</dl>
              </div>
              <p class="k-metin k-konum__adres">${esc(d.iletisim.adres)}</p>
              <p class="k-butonlar">
                <a class="k-btn" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
                <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
              </p>
            </div>
            <div class="k-harita" data-harita-kutu data-q="${esc(d.iletisim.mapsQuery || d.iletisim.adres)}"><p class="k-soluk">Harita</p></div>
          </div>
        </section>`;
    },
    mount(el) {
      const kutu = el.querySelector('[data-harita-kutu]');
      if (!kutu) return;
      const io = new IntersectionObserver((e) => {
        if (!e[0].isIntersecting) return;
        kutu.innerHTML = `<iframe title="Konum haritası" src="https://maps.google.com/maps?q=${encodeURIComponent(kutu.dataset.q)}&z=15&hl=tr&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
        io.disconnect();
      }, { rootMargin: '300px' });
      io.observe(kutu);
    },
  },

  iletisim: {
    render(d, ctx, sorgu) {
      const konumlar = d.konumlar || [{ ad: 'Adres', adres: d.iletisim.adres, tel: d.iletisim.telefon, mapsQuery: d.iletisim.mapsQuery }];
      const st = d.saatler ? durumSatiri(d, ctx.tema) : null;
      const bugun = new Date().getDay();
      const konular = k(d).konular || ['Randevu', 'Fiyat bilgisi', 'Genel bilgi', 'Diğer'];
      const secili = sorgu?.get('konu');
      const konuSec = secili && !konular.includes(secili) ? [secili, ...konular] : konular;
      const wa = !!d.iletisim.whatsapp;
      return `
        <section class="k-bolum k-iletisim">
          <div class="k-kap k-iletisim__ic">
            <div class="k-iletisim__bilgi">
              <ul class="k-konumlar">
                ${konumlar
                  .map(
                    (x, i) => `<li>
                      <h2 class="k-h3">${esc(x.ad)}</h2>
                      <p>${esc(x.adres)}${x.il ? `<br>${esc(x.il)}` : ''}</p>
                      ${x.tel ? `<p><a href="tel:${x.tel.replace(/[^\d+]/g, '')}">${esc(x.tel)}</a>${x.faks ? `<br><span class="k-soluk">Faks ${esc(x.faks)}</span>` : ''}</p>` : ''}
                      <p class="k-butonlar"><a class="k-btn k-btn--kucuk k-btn--ikincil" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.mapsQuery || x.adres)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>${konumlar.length > 1 ? `<button type="button" class="k-btn k-btn--kucuk k-btn--ikincil" data-harita="${i}">Haritada göster</button>` : ''}</p>
                    </li>`
                  )
                  .join('')}
              </ul>
              ${
                d.saatler
                  ? `<div class="k-saatler">
                      <p class="k-durum ${st.acik ? 'is-acik' : ''}"><span></span>${esc(st.metin)}</p>
                      <dl>${saatSatirlari(d, ctx.tema).map(([g, s]) => `<div><dt>${g}</dt><dd>${s}</dd></div>`).join('')}</dl>
                      <p class="k-soluk">Bugün ${GUNLER[bugun]}</p>
                    </div>`
                  : ''
              }
              <div class="k-harita" data-harita-kutu data-q="${esc(konumlar[0].mapsQuery || konumlar[0].adres)}"><p class="k-soluk">Harita yükleniyor</p></div>
            </div>
            <form class="k-form" novalidate>
              ${baslik(duz(k(d).formBaslik, 'Mesaj gönderin'), 'k-h3')}
              <div class="k-form__iki">
                <label><span>Ad soyad</span><input name="ad" autocomplete="name" required></label>
                <label><span>Firma <span class="k-soluk">(isteğe bağlı)</span></span><input name="firma" autocomplete="organization"></label>
              </div>
              <div class="k-form__iki">
                <label><span>Telefon</span><input name="tel" type="tel" inputmode="tel" autocomplete="tel" required></label>
                <label><span>E-posta <span class="k-soluk">(isteğe bağlı)</span></span><input name="eposta" type="email" autocomplete="email"></label>
              </div>
              <label><span>Konu</span><select name="konu">${konuSec.map((x) => `<option${x === secili ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
              <label><span>Mesajınız</span><textarea name="mesaj" rows="4" required></textarea></label>
              <label class="k-onay"><input type="checkbox" name="kvkk" required><span><a href="#" data-kvkk>KVKK aydınlatma metnini</a> okudum, bilgilerimin bu talep için işlenmesini kabul ediyorum.</span></label>
              <p class="k-form__hata" role="alert" hidden></p>
              <div class="k-butonlar">
                ${wa ? `<button type="submit" class="k-btn" data-kanal="wa">${icons.whatsapp}<span>WhatsApp ile gönder</span></button>` : ''}
                ${d.iletisim.eposta ? `<button type="submit" class="k-btn ${wa ? 'k-btn--ikincil' : ''}" data-kanal="eposta">E-posta ile gönder</button>` : ''}
                ${!wa && !d.iletisim.eposta ? `<button type="submit" class="k-btn" data-kanal="kopya">Mesajı hazırla</button>` : ''}
              </div>
              <p class="k-form__sonuc" role="status" hidden></p>
            </form>
          </div>
        </section>`;
    },
    mount(el, d) {
      // Harita yaklaşınca yüklenir.
      const kutu = el.querySelector('[data-harita-kutu]');
      const yukle = (q) => {
        kutu.innerHTML = `<iframe title="Konum haritası" src="https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&hl=tr&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      };
      const io = new IntersectionObserver((e) => {
        if (e[0].isIntersecting) {
          yukle(kutu.dataset.q);
          io.disconnect();
        }
      }, { rootMargin: '300px' });
      io.observe(kutu);
      el.querySelectorAll('[data-harita]').forEach((b) =>
        b.addEventListener('click', () => {
          const x = d.konumlar[Number(b.dataset.harita)];
          io.disconnect();
          yukle(x.mapsQuery || x.adres);
          kutu.scrollIntoView({ behavior: 'smooth', block: 'center' });
        })
      );

      const form = el.querySelector('.k-form');
      const hata = form.querySelector('.k-form__hata');
      const sonuc = form.querySelector('.k-form__sonuc');
      let kanal = 'wa';
      form.querySelectorAll('[data-kanal]').forEach((b) => b.addEventListener('click', () => (kanal = b.dataset.kanal)));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(form);
        const eksik = [];
        if (!f.get('ad')?.trim()) eksik.push('ad soyad');
        if (!f.get('tel')?.trim()) eksik.push('telefon');
        if (!f.get('mesaj')?.trim()) eksik.push('mesaj');
        if (eksik.length || !f.get('kvkk')) {
          hata.hidden = false;
          hata.textContent = eksik.length
            ? `Göndermek için ${eksik.length > 1 ? `${eksik.slice(0, -1).join(', ')} ve ${eksik.at(-1)} alanlarını` : `${eksik[0]} alanını`} doldurun${!f.get('kvkk') ? ', KVKK onayını da işaretleyin' : ''}.`
            : 'Göndermek için KVKK onayını işaretleyin.';
          return;
        }
        hata.hidden = true;
        const metin = [
          `Merhaba ${d.isletme.ad},`,
          `Konu: ${f.get('konu')}`,
          '',
          f.get('mesaj').trim(),
          '',
          `${f.get('ad').trim()}${f.get('firma')?.trim() ? `, ${f.get('firma').trim()}` : ''}`,
          `Tel: ${f.get('tel').trim()}`,
          f.get('eposta')?.trim() ? `E-posta: ${f.get('eposta').trim()}` : '',
        ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
        if (kanal === 'wa') {
          window.open(waHref(d, metin), '_blank', 'noopener');
          sonuc.textContent = 'WhatsApp açıldı. Mesajınızı oradan gönderebilirsiniz.';
        } else if (kanal === 'eposta') {
          location.href = `mailto:${d.iletisim.eposta}?subject=${encodeURIComponent(`${f.get('konu')}: ${f.get('ad').trim()}`)}&body=${encodeURIComponent(metin)}`;
          sonuc.textContent = 'E-posta uygulamanız açıldı.';
        } else {
          try {
            await navigator.clipboard.writeText(metin);
            sonuc.textContent = `Mesajınız kopyalandı. ${d.iletisim.telefon} numarasını arayarak da ulaşabilirsiniz.`;
          } catch {
            sonuc.textContent = `Mesajınız hazır. ${d.iletisim.telefon} numarasını arayarak da ulaşabilirsiniz.`;
          }
        }
        sonuc.hidden = false;
      });
    },
  },
};

export { rota, ok, baslik };
