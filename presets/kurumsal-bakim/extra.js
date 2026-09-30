// Servis Merkezi: kurumsal aile, genel bakım ve onarım. Bayi servisi düzeni: lacivert, beyaz, amber durum işaretleri.
// Modüller:
//  kabulHero      künye + "servis kabul" panosu (randevu kuralları, bugün, hızlı bağlantılar)
//  grupKartlari   ana sayfa: dört hizmet grubu, her biri kendi grup sayfasına
//  hizmetGruplari Hizmetler sayfası: ?grup=… ile grup sayfası (hizmetler + şikâyetten hizmete, hazır mesaj)
//  bakimHesap     Periyodik bakım: km + son bakımın zamanı + yakıt → bu bakımda yapılacaklar tablosu
//  randevuAdim    Randevu: iş → gün → saat (yalnız açık saatler) → WhatsApp mesajı; sahte onay yok
import { esc, waHref, telHref, mapsHref, icons, gsap, ScrollTrigger, reducedMotion, gunDurumu, kisaAdres, saatBicim, GUNLER } from '../../shared/core.js';
import { rota, ok } from '../_kurumsal/bolumler.js';

const k = (d) => d.kurumsal || {};
const pad = (n) => String(n).padStart(2, '0');
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
const trLower = (s) => String(s).toLocaleLowerCase('tr');
const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const saatStr = (m) => `${pad(Math.floor(m / 60))}.${pad(m % 60)}`;
const telefon = () => matchMedia('(max-width: 899px)').matches;

function gruplar(d) {
  const ek = k(d).grupEk || {};
  return d.gruplar.map((g, gi) => ({
    ...g, ...(ek[g.id] || {}), no: gi + 1,
    items: d.hizmetler.map((h, i) => ({ ...h, i })).filter((h) => h.grup === g.id),
  }));
}
const randevuRota = (konu, ek = '') => `randevu?konu=${encodeURIComponent(konu)}${ek}`;

// Sayfa içinde yumuşak kaydırma (Lenis varsa onunla), üst başlığın altına.
function kaydir(ctx, el) {
  const off = -(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64) - 16;
  if (ctx?.lenis) ctx.lenis.scrollTo(el, { offset: off, duration: 0.9 });
  else el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}

// --- Künye + servis kabul panosu -------------------------------------------------------------

export const kabulHero = {
  konumYerine: false,
  render(d, { tema }) {
    const b = gunDurumu(d.saatler);
    const bugun = d.saatler[new Date().getDay()];
    const kabul = k(d).kabul || [];
    return `
      <section class="k-hero k-hero--kunye sm-hero" aria-label="Künye">
        <div class="k-kap sm-hero__ic">
          <div class="k-hero__metin sm-hero__metin">
            <h1 class="k-h1 k-hero__baslik" data-bol>${esc(d.isletme.ad)}</h1>
            <p class="k-lead k-hero__tanim">${esc(d.isletme.tanim || d.isletme.sektor)}</p>
            <dl class="k-kunye">
              <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
              <div><dt>Bugün</dt><dd><span class="k-durum ${b.open ? 'is-acik' : ''}"><span></span>${esc(b.kunye)}</span></dd></div>
              <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></dd></div>
            </dl>
            <div class="k-butonlar">
              <a class="k-btn" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
              ${d.iletisim.whatsapp ? `<a class="k-btn k-btn--ikincil" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>` : ''}
              <a class="k-btn k-btn--ikincil" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
            </div>
          </div>
          <div class="sm-hero__sag">
            <figure class="sm-hero__foto" data-perde><img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high" width="1600" height="1067"></figure>
            <aside class="sm-pano" aria-label="Servis kabul">
              <p class="sm-pano__bas"><span class="sm-pano__isik ${b.open ? 'is-acik' : ''}" aria-hidden="true"></span>Servis kabul</p>
              <dl class="sm-pano__liste">
                ${kabul.map(([a, v]) => `<div><dt>${esc(a)}</dt><dd>${esc(v)}</dd></div>`).join('')}
                <div><dt>Bugün</dt><dd>${bugun ? esc(saatBicim(bugun)) : 'Kapalı'}</dd></div>
              </dl>
              <div class="sm-pano__linkler">
                ${rota('periyodik-bakim', `<span>Sıradaki bakımı hesapla</span> ${ok}`, 'sm-pano__link')}
                ${rota('randevu', `<span>Randevu isteği</span> ${ok}`, 'sm-pano__link')}
              </div>
            </aside>
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    gsap.from(el.querySelector('.sm-pano'), { y: 36, autoAlpha: 0, duration: 0.8, ease: 'power3.out', delay: 0.6, clearProps: 'transform,opacity,visibility' });
    gsap.from(el.querySelectorAll('.k-kunye > div, .sm-hero .k-butonlar .k-btn'), { y: 14, autoAlpha: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out', delay: 0.45, clearProps: 'transform,opacity,visibility' });
  },
};

// --- Ana sayfa: hizmet grupları ------------------------------------------------------------------

export const grupKartlari = {
  render(d) {
    const G = gruplar(d);
    return `
      <section class="k-bolum sm-gk" aria-labelledby="sm-gk-baslik">
        <div class="k-kap">
          <div class="k-bolum__bas">
            <h2 class="k-h2" id="sm-gk-baslik" data-bol>Hizmetler</h2>
            ${rota('hizmetler', `Bütün hizmetler ${ok}`, 'k-link')}
          </div>
          <ul class="sm-gk__liste">
            ${G.map((g) => `
              <li class="sm-gk__kart">
                <a href="#/hizmetler?grup=${g.id}" data-rota="hizmetler?grup=${g.id}">
                  <span class="sm-gk__gorsel"><img src="${g.gorsel}" alt="" loading="lazy" decoding="async"></span>
                  <span class="sm-gk__ic">
                    <span class="sm-gk__no">${pad(g.no)}</span>
                    <span class="sm-gk__ad">${esc(g.ad)}</span>
                    <span class="sm-gk__alt">${g.items.map((h) => esc(h.baslik)).join(' · ')}</span>
                    <span class="sm-gk__say">${g.items.length} hizmet ${ok}</span>
                  </span>
                </a>
              </li>`).join('')}
          </ul>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    gsap.from(el.querySelectorAll('.sm-gk__kart'), {
      y: 40, autoAlpha: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', clearProps: 'transform,opacity,visibility',
      scrollTrigger: { trigger: el.querySelector('.sm-gk__liste'), start: 'top 85%', toggleActions: 'play none none none' },
    });
  },
};

// --- Hizmetler: grup sayfaları ---------------------------------------------------------------------

function sekmeler(G, secili) {
  return `
    <nav class="sm-sekmeler" aria-label="Hizmet grupları" data-lenis-prevent-touch>
      <a href="#/hizmetler" data-rota="hizmetler" ${!secili ? 'aria-current="page"' : ''}>Tümü</a>
      ${G.map((g) => `<a href="#/hizmetler?grup=${g.id}" data-rota="hizmetler?grup=${g.id}" ${secili === g.id ? 'aria-current="page"' : ''}><span>${pad(g.no)}</span>${esc(g.ad)}</a>`).join('')}
    </nav>`;
}

export const hizmetGruplari = {
  render(d, ctx, sorgu) {
    const G = gruplar(d);
    const id = sorgu?.get('grup');
    const g = G.find((x) => x.id === id);
    if (!g) {
      // Genel bakış: dört grup, alt başlık olarak hizmetleri
      return `
        <section class="k-bolum sm-hg" aria-label="Hizmet grupları">
          <div class="k-kap">
            ${sekmeler(G, '')}
            <div class="sm-hg__liste">
              ${G.map((x) => `
                <article class="sm-hg__grup" aria-labelledby="sm-hg-${x.id}">
                  <figure class="sm-hg__gorsel" data-perde><img src="${x.gorsel}" alt="${esc(x.gorselAlt || '')}" loading="lazy" decoding="async"></figure>
                  <div class="sm-hg__metin">
                    <p class="sm-etiket">${pad(x.no)} / ${pad(G.length)} · ${x.items.length} hizmet</p>
                    <h2 class="k-h2" id="sm-hg-${x.id}" data-bol>${esc(x.ad)}</h2>
                    <p class="k-metin">${esc(x.metin || '')}</p>
                    <ul class="sm-hg__alt">
                      ${x.items.map((h) => `<li><h3>${esc(h.baslik)}</h3><p>${esc(h.kisa)}</p></li>`).join('')}
                    </ul>
                    ${rota(`hizmetler?grup=${x.id}`, `${esc(x.ad)} sayfası ${ok}`, 'k-btn k-btn--ikincil sm-hg__git')}
                  </div>
                </article>`).join('')}
            </div>
          </div>
        </section>`;
    }
    const i = G.indexOf(g);
    const onceki = G[(i - 1 + G.length) % G.length];
    const sonraki = G[(i + 1) % G.length];
    return `
      <section class="k-bolum sm-grup" aria-labelledby="sm-grup-baslik">
        <div class="k-kap">
          ${sekmeler(G, g.id)}
          <header class="sm-grup__bas">
            <div>
              <p class="sm-etiket">Hizmet grubu ${pad(g.no)} / ${pad(G.length)}</p>
              <h2 class="k-h1 sm-grup__baslik" id="sm-grup-baslik" data-bol>${esc(g.ad)}</h2>
              <p class="k-lead">${esc(g.metin || '')}</p>
            </div>
            <figure class="sm-grup__gorsel" data-perde><img src="${g.gorsel}" alt="${esc(g.gorselAlt || '')}" decoding="async"></figure>
          </header>
          ${g.sikayet?.length ? `
            <div class="sm-sikayet">
              <div class="sm-sikayet__bas">
                <h2 class="k-h2" data-bol>Şikâyete göre</h2>
                <p class="k-metin">Şikâyete dokununca aşağıdaki listede ilgili hizmet işaretlenir, şikâyet hazır bir WhatsApp mesajına yazılır.</p>
              </div>
              <ul class="sm-sikayet__liste">
                ${g.sikayet.map(([s, hiz], j) => `<li><button type="button" class="sm-sikayet__dugme" data-s="${j}" aria-pressed="false"><span>${esc(s)}</span><small>${esc(hiz)}</small></button></li>`).join('')}
              </ul>
              <div class="sm-sikayet__sonuc" aria-live="polite"></div>
            </div>` : ''}
          <ol class="sm-grup__hizmetler">
            ${g.items.map((h, j) => `
              <li class="sm-hz" id="hizmet-${h.i}">
                <p class="sm-hz__no">${pad(g.no)}.${j + 1}</p>
                <div class="sm-hz__govde">
                  <h3 class="k-h3">${esc(h.baslik)}</h3>
                  <p class="sm-hz__kisa">${esc(h.kisa)}</p>
                  <p class="k-metin">${esc(h.aciklama)}</p>
                </div>
                <div class="sm-hz__yan">
                  <p class="sm-hz__sure"><span>Ortalama süre</span><strong>${h.sure ? esc(h.sure) : 'Araca göre'}</strong></p>
                  ${rota(randevuRota(h.baslik), `Randevu isteği ${ok}`, 'k-btn k-btn--kucuk')}
                </div>
              </li>`).join('')}
          </ol>
          <nav class="sm-grup__gez" aria-label="Diğer gruplar">
            ${rota(`hizmetler?grup=${onceki.id}`, `<small>Önceki grup</small><span>${esc(onceki.ad)}</span>`, 'sm-gez')}
            ${rota(`hizmetler?grup=${sonraki.id}`, `<small>Sonraki grup</small><span>${esc(sonraki.ad)}</span>`, 'sm-gez sm-gez--sag')}
          </nav>
        </div>
      </section>`;
  },
  mount(el, d, ctx, sorgu) {
    const G = gruplar(d);
    const g = G.find((x) => x.id === sorgu?.get('grup'));
    // Seçili sekme görünür olsun (telefonda yatay kayan sekmeler)
    el.querySelector('.sm-sekmeler [aria-current]')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
    if (!g?.sikayet) return;
    const secili = new Set();
    const sonuc = el.querySelector('.sm-sikayet__sonuc');
    const ciz = () => {
      const liste = g.sikayet.filter((_, j) => secili.has(j));
      el.querySelectorAll('.sm-hz').forEach((li) => li.classList.remove('is-ilgili'));
      if (!liste.length) {
        sonuc.innerHTML = `<p class="k-soluk">Bir ya da birkaç şikâyet seçilebilir.</p>`;
        return;
      }
      const hizmetler = [...new Set(liste.map(([, h]) => h))];
      hizmetler.forEach((h) => {
        const x = g.items.find((y) => y.baslik === h);
        if (x) el.querySelector(`#hizmet-${x.i}`)?.classList.add('is-ilgili');
      });
      const cumle = liste.map(([s]) => trLower(s)).join(', ');
      const msg = `Merhaba ${d.isletme.ad}, aracımda ${liste.length > 1 ? 'şu şikâyetler var' : 'şu şikâyet var'}: ${cumle}. Bakılması için randevu almak istiyorum.\nAraç: `;
      sonuc.innerHTML = `
        <p class="sm-etiket">İlgili ${hizmetler.length > 1 ? 'hizmetler' : 'hizmet'}</p>
        <p class="sm-sikayet__hiz">${hizmetler.map(esc).join(', ')}</p>
        <div class="k-butonlar">
          <a class="k-btn" href="${waHref(d, msg)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Şikâyeti WhatsApp'tan yaz</span></a>
          ${rota(randevuRota(hizmetler[0]), `Randevu adımlarına geç ${ok}`, 'k-btn k-btn--ikincil')}
        </div>`;
      if (!reducedMotion) gsap.fromTo(sonuc.children, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4, stagger: 0.05, ease: 'power3.out' });
    };
    el.querySelectorAll('.sm-sikayet__dugme').forEach((b) => b.addEventListener('click', () => {
      const j = Number(b.dataset.s);
      secili.has(j) ? secili.delete(j) : secili.add(j);
      b.setAttribute('aria-pressed', String(secili.has(j)));
      ciz();
    }));
    ciz();
  },
};

// --- Periyodik bakım hesaplayıcısı -------------------------------------------------------------

const ZAMAN = [
  { id: 'bilmiyorum', ad: 'Bilmiyorum', ay: null },
  { id: '6', ad: '6 aydan az', ay: 3 },
  { id: '12', ad: '6–12 ay', ay: 9 },
  { id: '24', ad: '1–2 yıl', ay: 18 },
  { id: '24+', ad: '2 yıldan fazla', ay: 30 },
];
const YAKIT = [
  { id: 'benzinli', ad: 'Benzinli' },
  { id: 'dizel', ad: 'Dizel' },
  { id: 'lpg', ad: "LPG'li" },
  { id: 'hibrit', ad: 'Hibrit' },
];
const DURUM = { bu: 'Bu bakımda', kontrol: 'Kontrol edilir', sonra: 'Sonraki bakımlarda' };

// Her aralık satırı için durum: veri sırası ortak dosyadaki `periyodik.adimlar` ile aynıdır.
function hesapla(P, km, zaman, yakit) {
  const ay = zaman.ay;
  const sonuc = P.adimlar.map((a, i) => {
    const isler = a.isler.filter((x) => !(yakit && yakit !== 'dizel' && /\(dizel\)/.test(x)) && !(yakit === 'dizel' && /\(benzinli\)/.test(x)));
    let durum = 'bu', not = '';
    if (i === 1) { durum = ay != null && ay < 6 ? 'kontrol' : 'bu'; }
    if (i === 2) {
      const yakin = Math.round(km / 30000) * 30000;
      if (km >= 22500 && Math.abs(km - yakin) <= 7500) durum = 'bu';
      else { durum = 'sonra'; not = `${fmt(Math.max(30000, Math.ceil(km / 30000) * 30000))} km civarı`; }
    }
    if (i === 3) {
      if (ay == null) { durum = 'kontrol'; not = 'Son değişim kaydına bakılır'; }
      else if (ay >= 18) durum = 'bu';
      else if (ay >= 9) durum = 'kontrol';
      else { durum = 'sonra'; not = 'İki yılı doldurunca'; }
    }
    if (i === 4) {
      if (km >= 60000) { durum = 'kontrol'; not = 'Değişim kaydı yoksa kontrol edilir'; }
      else { durum = 'sonra'; not = "60 bin km'den sonra"; }
    }
    return { ...a, isler, durum, not };
  }).filter((a) => a.isler.length);
  const bu = sonuc.filter((a) => a.durum === 'bu').flatMap((a) => a.isler);
  // "Hava filtresi" değişiyorsa "Hava filtresi kontrolü" ayrıca yazılmaz
  const buTemiz = bu.filter((x) => !bu.some((y) => y !== x && x.startsWith(`${y} `)));
  return { satirlar: sonuc, bu: buTemiz, kontrol: sonuc.filter((a) => a.durum === 'kontrol').flatMap((a) => a.isler) };
}

export const bakimHesap = {
  render(d) {
    const P = d.periyodik;
    if (!P?.adimlar?.length) return '';
    return `
      <section class="k-bolum sm-bh" aria-labelledby="sm-bh-baslik">
        <div class="k-kap sm-bh__ic">
          <form class="sm-bh__form" onsubmit="return false" aria-labelledby="sm-bh-baslik">
            <h2 class="k-h2" id="sm-bh-baslik" data-bol>Bakım hesaplayıcı</h2>
            <p class="k-metin">${esc(P.not)}</p>
            <div class="sm-alan">
              <label class="sm-alan__ad" for="sm-km">Aracın kilometresi</label>
              <div class="sm-km">
                <button type="button" class="sm-km__adim" data-d="-5000" aria-label="5.000 km azalt">−</button>
                <span class="sm-km__kutu"><input id="sm-km" inputmode="numeric" autocomplete="off" enterkeyhint="done" value="62.000" aria-describedby="sm-km-not"><span>km</span></span>
                <button type="button" class="sm-km__adim" data-d="5000" aria-label="5.000 km artır">+</button>
              </div>
              <p class="sm-alan__not" id="sm-km-not">Gösterge panelindeki kilometre yazılır.</p>
            </div>
            <fieldset class="sm-alan">
              <legend class="sm-alan__ad">Son bakımdan beri geçen süre</legend>
              <div class="sm-secim sm-secim--5">${ZAMAN.map((z, i) => `<button type="button" class="sm-cip" data-zaman="${z.id}" aria-pressed="${i === 2}">${esc(z.ad)}</button>`).join('')}</div>
            </fieldset>
            <fieldset class="sm-alan">
              <legend class="sm-alan__ad">Yakıt</legend>
              <div class="sm-secim sm-secim--4">${YAKIT.map((y, i) => `<button type="button" class="sm-cip" data-yakit="${y.id}" aria-pressed="${i === 0}">${esc(y.ad)}</button>`).join('')}</div>
            </fieldset>
          </form>
          <div class="sm-kart" aria-live="polite">
            <div class="sm-kart__ust">
              <p class="sm-etiket">Bakım kartı</p>
              <p class="sm-kart__ozet" data-o="ozet"></p>
              <p class="sm-kart__sayi"><strong data-o="sayi">0</strong><span>iş bu bakımda</span></p>
            </div>
            <table class="sm-tablo">
              <caption class="sr-only">Periyodik bakım aralıkları ve bu araç için durumu</caption>
              <thead><tr><th scope="col">Aralık</th><th scope="col">İşler</th><th scope="col">Durum</th></tr></thead>
              <tbody data-o="tablo"></tbody>
            </table>
            <div class="k-butonlar sm-kart__dugmeler">
              <a class="k-btn" data-o="wa" href="#" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan randevu iste</span></a>
              <a class="k-btn k-btn--ikincil" data-o="randevu" href="#/randevu" data-rota="randevu">Randevu adımlarına geç ${ok}</a>
            </div>
            <p class="sm-kart__not">Genel aralık, kitapçığa göre değişir. Kesin liste araç kabulde, bakım kaydına ve kitapçığa bakılarak çıkarılır.</p>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const P = d.periyodik;
    const o = (n) => el.querySelector(`[data-o="${n}"]`);
    const giris = el.querySelector('#sm-km');
    let km = 62000, zaman = ZAMAN[2], yakit = 'benzinli';
    const ciz = (anim) => {
      const r = hesapla(P, km, zaman, yakit);
      const yad = YAKIT.find((y) => y.id === yakit)?.ad || '';
      o('ozet').textContent = `${fmt(km)} km · ${yad} · Son bakım: ${zaman.id === 'bilmiyorum' ? 'bilinmiyor' : zaman.ad}`;
      o('sayi').textContent = String(r.bu.length);
      o('tablo').innerHTML = r.satirlar.map((a) => `
        <tr class="is-${a.durum}">
          <th scope="row">${esc(a.aralik)}</th>
          <td>${a.isler.map(esc).join(', ')}</td>
          <td><span class="sm-durum sm-durum--${a.durum}">${DURUM[a.durum]}</span>${a.not ? `<small>${esc(a.not)}</small>` : ''}</td>
        </tr>`).join('');
      const zm = zaman.id === 'bilmiyorum' ? '' : ` Son bakımdan beri ${trLower(zaman.ad)} geçti.`;
      const msg = `Merhaba ${d.isletme.ad}, aracım ${fmt(km)} km'de (${trLower(yad)}).${zm} Periyodik bakım randevusu istiyorum.\nBu bakımda yapılacaklar: ${r.bu.join(', ')}.${r.kontrol.length ? `\nKontrol: ${r.kontrol.join(', ')}.` : ''}`;
      o('wa').href = waHref(d, msg);
      const rr = randevuRota('Periyodik bakım', `&km=${km}`);
      o('randevu').dataset.rota = rr;
      o('randevu').setAttribute('href', `#/${rr}`);
      if (anim && !reducedMotion) {
        gsap.fromTo(o('tablo').children, { x: -8, autoAlpha: 0.3 }, { x: 0, autoAlpha: 1, duration: 0.35, stagger: 0.04, ease: 'power3.out' });
        gsap.fromTo(o('sayi'), { yPercent: 40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.4, ease: 'power3.out' });
      }
    };
    const setKm = (v, kaynak) => {
      km = Math.min(500000, Math.max(0, Math.round(Number(v) || 0)));
      if (kaynak !== 'giris') giris.value = fmt(km);
      ciz(kaynak !== 'giris');
    };
    giris.addEventListener('input', () => setKm(giris.value.replace(/\D/g, '').slice(0, 6), 'giris'));
    giris.addEventListener('blur', () => (giris.value = fmt(km)));
    giris.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); setKm(km + (e.key === 'ArrowUp' ? 5000 : -5000)); }
      if (e.key === 'Enter') giris.blur();
    });
    el.querySelectorAll('.sm-km__adim').forEach((b) => b.addEventListener('click', () => setKm(km + Number(b.dataset.d))));
    el.querySelectorAll('[data-zaman]').forEach((b) => b.addEventListener('click', () => {
      zaman = ZAMAN.find((z) => z.id === b.dataset.zaman);
      el.querySelectorAll('[data-zaman]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      ciz(true);
    }));
    el.querySelectorAll('[data-yakit]').forEach((b) => b.addEventListener('click', () => {
      yakit = b.dataset.yakit;
      el.querySelectorAll('[data-yakit]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      ciz(true);
    }));
    ciz(false);
  },
};

// --- Randevu adımları ---------------------------------------------------------------------------

function acikGunler(d, adet, now = new Date()) {
  const out = [];
  const simdi = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; out.length < adet && i < 40; i++) {
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const s = d.saatler[t.getDay()];
    if (!s) continue;
    const [ac, kapa] = s.split('-').map(toMin);
    const slotlar = [];
    for (let m = ac; m + 60 <= kapa; m += 60) if (i > 0 || m >= simdi + 30) slotlar.push(m);
    if (!slotlar.length) continue;
    out.push({ t, i, slotlar, saat: s });
  }
  return out;
}
const gunKisa = (t) => t.toLocaleDateString('tr-TR', { weekday: 'short' }).replace('.', '');
const gunUzun = (t) => `${t.getDate()} ${t.toLocaleDateString('tr-TR', { month: 'long' })} ${GUNLER[t.getDay()]}`;

export const randevuAdim = {
  render(d, ctx, sorgu) {
    const R = k(d).randevu || {};
    const konu = sorgu?.get('konu') || '';
    const isler = [...(R.isler || [])];
    const tum = d.hizmetler.map((h) => h.baslik);
    const secili = konu && (isler.includes(konu) || tum.includes(konu)) ? konu : '';
    if (secili && !isler.includes(secili)) isler.unshift(secili);
    const km = Number(sorgu?.get('km')) || '';
    return `
      <section class="k-bolum sm-ra" aria-labelledby="sm-ra-baslik">
        <div class="k-kap sm-ra__ic">
          <div class="sm-ra__adimlar">
            <h2 class="sr-only" id="sm-ra-baslik">Randevu adımları</h2>
            <ol class="sm-ilerleme" aria-hidden="true"><li data-p="1">İş</li><li data-p="2">Gün</li><li data-p="3">Saat</li></ol>
            <fieldset class="sm-adim" data-adim="1">
              <legend><span class="sm-adim__no">1</span><span>Yapılacak iş</span></legend>
              <div class="sm-secim sm-secim--is">
                ${isler.map((x) => `<button type="button" class="sm-cip" data-is="${esc(x)}" aria-pressed="${x === secili}">${esc(x)}</button>`).join('')}
              </div>
              <label class="sm-diger"><span>Başka bir hizmet</span>
                <select data-diger><option value="">Listeden seçin</option>${tum.filter((x) => !isler.includes(x)).map((x) => `<option>${esc(x)}</option>`).join('')}</select>
              </label>
            </fieldset>
            <fieldset class="sm-adim" data-adim="2" aria-disabled="true">
              <legend><span class="sm-adim__no">2</span><span>Gün</span></legend>
              <div class="sm-gunler" data-gunler></div>
              <p class="sm-alan__not">Kapalı günler listelenmez.</p>
            </fieldset>
            <fieldset class="sm-adim" data-adim="3" aria-disabled="true">
              <legend><span class="sm-adim__no">3</span><span>Saat</span></legend>
              <div class="sm-saatler" data-saatler><p class="k-soluk">Önce gün seçilir.</p></div>
            </fieldset>
          </div>
          <aside class="sm-ozet" aria-labelledby="sm-ozet-baslik">
            <p class="sm-etiket" id="sm-ozet-baslik">Randevu isteği</p>
            <dl class="sm-ozet__liste">
              <div><dt>İş</dt><dd data-o="is">Seçilmedi</dd></div>
              <div><dt>Gün</dt><dd data-o="gun">Seçilmedi</dd></div>
              <div><dt>Saat</dt><dd data-o="saat">Seçilmedi</dd></div>
            </dl>
            <div class="sm-ozet__ek">
              <label><span>Araç <small>isteğe bağlı</small></span><input data-o="arac" maxlength="40" placeholder="Örn. 2016 Fiat Egea" autocomplete="off"></label>
              <label><span>Kilometre <small>isteğe bağlı</small></span><input data-o="km" inputmode="numeric" maxlength="9" value="${km ? fmt(km) : ''}" placeholder="Örn. 62.000" autocomplete="off"></label>
            </div>
            <a class="k-btn sm-ozet__wa" data-o="wa" href="#" target="_blank" rel="noopener" aria-disabled="true">${icons.whatsapp}<span>İsteği WhatsApp'tan gönder</span></a>
            <p class="sm-ozet__not">${esc(R.not || '')}</p>
            <a class="sm-ozet__tel" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
          </aside>
        </div>
      </section>`;
  },
  mount(el, d, ctx) {
    const R = k(d).randevu || {};
    const gunler = acikGunler(d, R.gunSayisi || 10);
    const o = (n) => el.querySelector(`[data-o="${n}"]`);
    const adim = (n) => el.querySelector(`[data-adim="${n}"]`);
    const st = { is: el.querySelector('[data-is][aria-pressed="true"]')?.dataset.is || '', gun: null, saat: null };

    el.querySelector('[data-gunler]').innerHTML = gunler.map((g, i) => `
      <button type="button" class="sm-gun" data-gun="${i}" aria-pressed="false" aria-label="${esc(gunUzun(g.t))}">
        <small>${g.i === 0 ? 'Bugün' : g.i === 1 ? 'Yarın' : esc(gunKisa(g.t))}</small><strong>${g.t.getDate()}</strong><span>${esc(g.t.toLocaleDateString('tr-TR', { month: 'short' }).replace('.', ''))}</span>
      </button>`).join('');

    const saatleriCiz = () => {
      const g = gunler[st.gun];
      const kutu = el.querySelector('[data-saatler]');
      if (!g) { kutu.innerHTML = '<p class="k-soluk">Önce gün seçilir.</p>'; return; }
      const grup = [['Sabah', (m) => m < 12 * 60], ['Öğle', (m) => m >= 12 * 60 && m < 15 * 60], ['Öğleden sonra', (m) => m >= 15 * 60]];
      kutu.innerHTML = `<p class="sm-alan__not">${esc(gunUzun(g.t))} çalışma saatleri ${esc(saatBicim(g.saat))}. Başlangıç saati seçilir.</p>` + grup.map(([ad, f]) => {
        const s = g.slotlar.filter(f);
        return s.length ? `<div class="sm-saat-grup"><p>${ad}</p><div>${s.map((m) => `<button type="button" class="sm-cip sm-cip--saat" data-saat="${m}" aria-pressed="${st.saat === m}">${saatStr(m)}</button>`).join('')}</div></div>` : '';
      }).join('');
    };

    const guncelle = (anim) => {
      adim(2).setAttribute('aria-disabled', String(!st.is));
      adim(3).setAttribute('aria-disabled', String(st.gun == null));
      el.querySelectorAll('.sm-ilerleme li').forEach((li) => {
        const p = Number(li.dataset.p);
        li.classList.toggle('is-tamam', (p === 1 && st.is) || (p === 2 && st.gun != null) || (p === 3 && st.saat != null));
      });
      const g = gunler[st.gun];
      o('is').textContent = st.is || 'Seçilmedi';
      o('gun').textContent = g ? gunUzun(g.t) : 'Seçilmedi';
      o('saat').textContent = st.saat != null ? `${saatStr(st.saat)} civarı` : 'Seçilmedi';
      const hazir = st.is && g && st.saat != null;
      const wa = o('wa');
      wa.setAttribute('aria-disabled', String(!hazir));
      wa.classList.toggle('is-hazir', !!hazir);
      const arac = o('arac').value.trim().replace(/[<>]/g, '');
      const km = o('km').value.replace(/\D/g, '');
      const aracSatiri = [arac, km ? `${fmt(Number(km))} km` : ''].filter(Boolean).join(', ');
      const msg = hazir
        ? `Merhaba ${d.isletme.ad}, ${gunUzun(g.t)} günü saat ${saatStr(st.saat)} civarı için ${trLower(st.is)} randevusu istiyorum. Uygun mu?${aracSatiri ? `\nAraç: ${aracSatiri}` : ''}`
        : `Merhaba ${d.isletme.ad}, ${st.is ? `${trLower(st.is)} için ` : ''}randevu almak istiyorum.`;
      wa.href = waHref(d, msg);
      if (anim && !reducedMotion) gsap.fromTo(el.querySelectorAll('.sm-ozet__liste dd'), { autoAlpha: 0.4 }, { autoAlpha: 1, duration: 0.3 });
    };

    const ilerle = (n) => {
      // Telefonda sıradaki adım ekranda değilse ona kaydır
      if (!telefon()) return;
      const hedef = n === 'ozet' ? el.querySelector('.sm-ozet') : adim(n);
      const r = hedef.getBoundingClientRect();
      if (r.top > innerHeight * 0.55 || r.top < 0) kaydir(ctx, hedef);
    };

    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.is != null) {
        st.is = b.dataset.is;
        el.querySelector('[data-diger]').value = '';
        el.querySelectorAll('[data-is]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        guncelle(true);
        ilerle(2);
      } else if (b.dataset.gun != null) {
        if (adim(2).getAttribute('aria-disabled') === 'true') return;
        st.gun = Number(b.dataset.gun);
        st.saat = null;
        el.querySelectorAll('[data-gun]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        saatleriCiz();
        guncelle(true);
        if (!reducedMotion) gsap.from(el.querySelectorAll('.sm-cip--saat'), { y: 8, autoAlpha: 0, duration: 0.3, stagger: 0.02, ease: 'power3.out', clearProps: 'all' });
        ScrollTrigger.refresh();
        ilerle(3);
      } else if (b.dataset.saat != null) {
        st.saat = Number(b.dataset.saat);
        el.querySelectorAll('[data-saat]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        guncelle(true);
        ilerle('ozet');
      }
    });
    el.querySelector('[data-diger]').addEventListener('change', (e) => {
      if (!e.target.value) return;
      st.is = e.target.value;
      el.querySelectorAll('[data-is]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      guncelle(true);
      ilerle(2);
    });
    o('arac').addEventListener('input', () => guncelle(false));
    o('km').addEventListener('input', () => guncelle(false));
    o('km').addEventListener('blur', () => { const v = o('km').value.replace(/\D/g, ''); o('km').value = v ? fmt(Number(v)) : ''; });
    o('wa').addEventListener('click', (e) => {
      if (o('wa').getAttribute('aria-disabled') === 'true') {
        e.preventDefault();
        const eksik = !st.is ? 1 : st.gun == null ? 2 : 3;
        kaydir(ctx, adim(eksik));
        adim(eksik).classList.add('is-uyari');
        setTimeout(() => adim(eksik).classList.remove('is-uyari'), 1200);
      }
    });
    guncelle(false);
  },
};
