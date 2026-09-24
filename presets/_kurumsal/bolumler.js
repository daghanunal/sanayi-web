// Bölüm kataloğu. Her bölüm: { render(d, ctx, sorgu) → HTML | '', mount?(el, d, ctx, sorgu) }.
// Veri yoksa bölüm boş döner ve sayfada görünmez; böylece aynı sayfa listesi her sektörde çalışır.
import { esc, telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, GUNLER } from '../../shared/core.js';

const buYil = new Date().getFullYear();

// 1996 → "1996'dan" (Türkçe ünlü uyumu, sayının okunuşundaki son kelimeye göre).
export function yilEki(n) {
  const birler = ['', "'den", "'den", "'ten", "'ten", "'ten", "'dan", "'den", "'den", "'dan"];
  const onlar = ['', "'dan", "'den", "'dan", "'tan", "'den", "'tan", "'ten", "'den", "'dan"];
  const s = n % 10 ? birler[n % 10] : n % 100 ? onlar[Math.floor(n / 10) % 10] : "'den";
  return `${n}${s}`;
}

const rota = (id, metin, cls = 'k-btn') => `<a class="${cls}" href="#/${id}" data-rota="${id}">${metin}</a>`;
const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const baslik = (metin, cls = 'k-h2') => `<h2 class="${cls}" data-bol>${esc(metin)}</h2>`;
const k = (d) => d.kurumsal || {};
const kurulusYili = (d) => d.isletme.kurulus;

function istatistikler(d) {
  return (d.istatistikler || []).map((s) => {
    const yilMi = s.kurulustanHesapla || /yıldır/.test(s.etiket);
    return { ...s, deger: yilMi && kurulusYili(d) ? buYil - kurulusYili(d) : s.deger };
  });
}

// --- Sayfa başlığı (ana sayfa dışındaki sayfalarda) ------------------------------------------

export function sayfaBasligi(sayfa, d, ctx) {
  const s = k(d).sayfalar?.[sayfa.id] || {};
  const ilk = ctx.sayfalar[0];
  return `
    <header class="k-sb">
      <div class="k-kap">
        <nav class="k-kirinti" aria-label="Bulunduğunuz yer"><a href="#/${ilk.id}" data-rota="${ilk.id}">${ilk.baslik}</a><span aria-hidden="true">/</span><span aria-current="page">${sayfa.baslik}</span></nav>
        <h1 class="k-h1 k-sb__baslik" data-bol>${esc(s.baslik || sayfa.baslik)}</h1>
        ${s.metin ? `<p class="k-lead k-sb__metin">${esc(s.metin)}</p>` : ''}
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
      const ust = h.ust || `${d.isletme.sektor}. ${tema.yer ? `${tema.yer} ` : ''}${yilEki(kurulusYili(d))} beri.`;
      const st = d.saatler ? openStatus(d.saatler) : null;
      const varsayilan = [
        ['Kuruluş', String(kurulusYili(d))],
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
              <h1 class="k-h1 k-hero__baslik" data-bol>${esc(h.baslik || d.isletme.slogan)}</h1>
              <p class="k-lead">${esc(h.metin || d.isletme.hakkinda)}</p>
              <div class="k-butonlar">
                ${rota('iletisim', `${h.birincil || 'Teklif isteyin'} ${ok}`)}
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
    render(d) {
      const o = k(d).ozet || {};
      return `
        <section class="k-bolum k-ozet">
          <div class="k-kap k-iki">
            <div>${baslik(o.baslik || 'Hakkımızda')}</div>
            <div>
              <p class="k-buyuk-metin">${esc(o.metin || d.isletme.hakkinda)}</p>
              ${rota('kurumsal', `Kurumsal ${ok}`, 'k-link')}
            </div>
          </div>
        </section>`;
    },
  },

  hizmetOzet: {
    render(d, { tema }) {
      const list = (d.hizmetler || []).slice(0, 6);
      if (!list.length) return '';
      return `
        <section class="k-bolum k-hozet">
          <div class="k-kap">
            <div class="k-bolum__bas">${baslik(k(d).hizmetOzetBaslik || tema.hizmetEtiketi || 'Hizmetlerimiz')}${rota('hizmetler', `Tümü ${ok}`, 'k-link')}</div>
            <ul class="k-hozet__liste" data-sira>
              ${list
                .map(
                  (h) => `<li><a href="#/hizmetler" data-rota="hizmetler">
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
    render(d) {
      const s = istatistikler(d);
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
    render(d) {
      const a = k(d).anlasmalar;
      if (!a?.length) return '';
      return `
        <section class="k-bolum k-aozet">
          <div class="k-kap k-iki">
            <div>
              ${baslik(k(d).anlasmaBaslik || 'Kurumsal müşterilerimiz için')}
              <p class="k-lead">${esc(k(d).anlasmaMetin || '')}</p>
              ${rota('kurumsal-musteriler', `Kurumsal çözümler ${ok}`, 'k-link')}
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
      const p = d.puan;
      return `
        <section class="k-bolum k-yorumlar">
          <div class="k-kap">
            <div class="k-bolum__bas">
              ${baslik(k(d).yorumBaslik || 'Müşterilerimiz ne diyor')}
              ${p ? `<p class="k-puan"><strong>${String(p.ortalama).replace('.', ',')}</strong><span class="k-yildiz" aria-hidden="true">${icons.star.repeat(5)}</span><span>${p.adet} değerlendirme</span></p>` : ''}
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
            ${baslik(c.baslik || 'Birlikte çalışalım', 'k-h2 k-cta__baslik')}
            <p class="k-lead">${esc(c.metin || 'İhtiyacınızı anlatın, aynı gün dönüş yapalım.')}</p>
            <div class="k-butonlar">
              ${rota('iletisim', `${c.buton || 'Teklif isteyin'} ${ok}`)}
              <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
        </section>`;
    },
  },

  hakkimizda: {
    render(d, { tema }) {
      const h = k(d).hakkimizda || {};
      const paragraflar = h.paragraflar || [d.isletme.hakkinda];
      return `
        <section class="k-bolum k-hakkimizda">
          <div class="k-kap k-iki k-iki--gorsel">
            <div>
              ${baslik(h.baslik || 'Biz kimiz')}
              ${paragraflar.map((p) => `<p class="k-metin">${esc(p)}</p>`).join('')}
              ${d.isletme.kurulus ? `<p class="k-imza">${esc(d.isletme.unvan || d.isletme.ad)}, ${yilEki(d.isletme.kurulus)} beri.</p>` : ''}
            </div>
            ${h.gorsel || tema.hakkimizdaGorsel ? `<figure class="k-gorsel" data-perde><img src="${h.gorsel || tema.hakkimizdaGorsel}" alt="${esc(h.gorselAlt || '')}" loading="lazy"></figure>` : ''}
          </div>
        </section>`;
    },
  },

  vizyon: {
    render(d) {
      const v = k(d);
      if (!v.vizyon && !v.misyon) return '';
      return `
        <section class="k-bolum k-vizyon">
          <div class="k-kap">
            <div class="k-vizyon__iki">
              ${v.misyon ? `<div><h2 class="k-h3">Misyonumuz</h2><span class="k-cizgi" data-cizgi></span><p class="k-buyuk-metin">${esc(v.misyon)}</p></div>` : ''}
              ${v.vizyon ? `<div><h2 class="k-h3">Vizyonumuz</h2><span class="k-cizgi" data-cizgi></span><p class="k-buyuk-metin">${esc(v.vizyon)}</p></div>` : ''}
            </div>
            ${v.degerler?.length ? `<ul class="k-degerler" data-sira>${v.degerler.map((x) => `<li><h3>${esc(x.baslik)}</h3><p>${esc(x.metin)}</p></li>`).join('')}</ul>` : ''}
          </div>
        </section>`;
    },
  },

  kalite: {
    render(d) {
      const q = k(d).kalite;
      const belgeler = k(d).belgeler || d.belgeler;
      if (!q && !belgeler?.length) return '';
      return `
        <section class="k-bolum k-kalite">
          <div class="k-kap k-iki">
            <div>${baslik(q?.baslik || 'Kalite anlayışımız')}${q?.metin ? `<p class="k-lead">${esc(q.metin)}</p>` : ''}</div>
            <div>
              ${q?.maddeler ? `<ul class="k-maddeler" data-sira>${q.maddeler.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
              ${belgeler?.length ? `<p class="k-alt-baslik">Belgelerimiz</p><ul class="k-belgeler">${belgeler.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
              ${d.garanti ? `<p class="k-not">${esc(d.garanti)}</p>` : ''}
            </div>
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
            ${baslik(k(d).tarihceBaslik || 'Kilometre taşları')}
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
                      <a class="k-link" href="#/iletisim?konu=${encodeURIComponent(h.baslik)}" data-rota="iletisim?konu=${encodeURIComponent(h.baslik)}">Bu hizmet için teklif isteyin ${ok}</a>
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
            ${baslik(k(d).surecBaslik || 'Nasıl çalışıyoruz')}
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
                  <a class="k-link" href="#/iletisim?konu=${encodeURIComponent(x.baslik)}" data-rota="iletisim?konu=${encodeURIComponent(x.baslik)}">${esc(x.buton || 'Görüşme talep edin')} ${ok}</a>
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
            ${baslik(k(d).galeriBaslik || 'Atölyemizden')}
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
            <p class="k-alt-baslik">${esc(k(d).markaBaslik || 'Hizmet verdiğimiz markalar')}</p>
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
            <div>${baslik(k(d).sssBaslik || 'Sık sorulan sorular')}</div>
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
            ${baslik(c.baslik || 'Kariyer')}
            <div><p class="k-metin">${esc(c.metin)}</p>${rota(`iletisim?konu=${encodeURIComponent('İş başvurusu')}`, `Başvurun ${ok}`, 'k-link')}</div>
          </div>
        </section>`;
    },
  },

  iletisim: {
    render(d, ctx, sorgu) {
      const konumlar = d.konumlar || [{ ad: 'Adres', adres: d.iletisim.adres, tel: d.iletisim.telefon, mapsQuery: d.iletisim.mapsQuery }];
      const st = d.saatler ? openStatus(d.saatler) : null;
      const bugun = new Date().getDay();
      const konular = k(d).konular || ['Genel bilgi', 'Fiyat teklifi', 'Kurumsal / filo anlaşması', 'Randevu', 'Diğer'];
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
                      <p class="k-durum ${st.open ? 'is-acik' : ''}"><span></span>${esc(st.text)}</p>
                      <dl>${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${g}</dt><dd>${s}</dd></div>`).join('')}</dl>
                      <p class="k-soluk">Bugün ${GUNLER[bugun]}</p>
                    </div>`
                  : ''
              }
              <div class="k-harita" data-harita-kutu data-q="${esc(konumlar[0].mapsQuery || konumlar[0].adres)}"><p class="k-soluk">Harita yükleniyor</p></div>
            </div>
            <form class="k-form" novalidate>
              ${baslik(k(d).formBaslik || 'Bize yazın', 'k-h3')}
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
            ? `Göndermek için ${eksik.join(', ')} ${eksik.length > 1 ? 'alanlarını' : 'alanını'} doldurun${!f.get('kvkk') ? ' ve KVKK onayını işaretleyin' : ''}.`
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
          sonuc.textContent = 'WhatsApp açıldı. Mesajı gönderdiğinizde size dönüş yapacağız.';
        } else if (kanal === 'eposta') {
          location.href = `mailto:${d.iletisim.eposta}?subject=${encodeURIComponent(`${f.get('konu')}: ${f.get('ad').trim()}`)}&body=${encodeURIComponent(metin)}`;
          sonuc.textContent = 'E-posta uygulamanız açıldı.';
        } else {
          try {
            await navigator.clipboard.writeText(metin);
            sonuc.textContent = `Mesajınız kopyalandı. ${d.iletisim.telefon} numarasından bize ulaşabilirsiniz.`;
          } catch {
            sonuc.textContent = `Mesajınız hazır. ${d.iletisim.telefon} numarasından bize ulaşabilirsiniz.`;
          }
        }
        sonuc.hidden = false;
      });
    },
  },
};

export { rota, ok, baslik };
