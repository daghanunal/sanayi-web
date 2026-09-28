// Otoyol: karayolu yön levhası dili (devlet yolu mavisi). İki modül:
//  tabelaHero  künye: gece yolunun üstünde asılı köprü levhasında ad, tanım, adres / bugün / telefon.
//  yolYardim   mesafe levhası: en yakın nokta + araç + arıza seçilince hazır WhatsApp mesajı.
import { esc, waHref, telHref, mapsHref, gunDurumu, kisaAdres, icons, gsap, reducedMotion } from '../../shared/core.js';

const k = (d) => d.kurumsal || {};
const B = import.meta.env.BASE_URL;

const okCapraz = `<svg class="ot-okcapraz" viewBox="0 0 100 100" aria-hidden="true"><path d="M30 78 L70 38 M42 30 H72 V60" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="square" stroke-linejoin="miter"/></svg>`;
const kamyon = `<svg viewBox="0 0 40 24" aria-hidden="true"><path d="M2 4h22v13H2zM24 8h7l6 5v4H24z" fill="currentColor"/><circle cx="9" cy="19" r="3.2" fill="currentColor" stroke="#fff" stroke-width="1.6"/><circle cx="30" cy="19" r="3.2" fill="currentColor" stroke="#fff" stroke-width="1.6"/></svg>`;

// --- Künye: köprü levhası -------------------------------------------------------------------

export const tabelaHero = {
  render(d) {
    const b = d.saatler ? gunDurumu(d.saatler) : null;
    return `
      <section class="k-hero k-hero--kunye ot-hero" aria-label="Künye">
        <div class="ot-hero__foto" aria-hidden="true"><img src="${B}img/kurumsal-agirvasita2/gece-yol.jpg" alt="" fetchpriority="high"></div>
        <div class="ot-portal" data-ot-portal>
          <div class="ot-portal__kiris" aria-hidden="true"></div>
          <div class="ot-portal__tabelalar">
            <div class="ot-tabela ot-tabela--ana" data-ot-tabela>
              <span class="ot-cikis">Şaşmaz Oto Sanayi Sitesi</span>
              <div class="ot-tabela__ic">
                <div class="k-hero__metin">
                  <h1 class="k-h1 k-hero__baslik ot-tabela__ad" data-bol>${esc(d.isletme.ad)}</h1>
                  <p class="k-lead k-hero__tanim ot-tabela__satir">${esc(d.isletme.tanim || d.isletme.sektor)}</p>
                </div>
                ${okCapraz}
              </div>
              <dl class="k-kunye ot-kunye">
                <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
                ${b ? `<div><dt>Bugün</dt><dd><span class="k-durum ${b.open ? 'is-acik' : ''}"><span></span>${esc(b.kunye)}</span></dd></div>` : ''}
                <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></dd></div>
              </dl>
            </div>
          </div>
        </div>
        <div class="k-kap ot-hero__alt">
          <div class="k-butonlar">
            <a class="k-btn" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
            ${d.iletisim.whatsapp ? `<a class="k-btn k-btn--ikincil" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>` : ''}
            <a class="k-btn k-btn--ikincil" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    // Açılış: levha kirişten iner, üstünden bir kez far parlaması geçer (~1,2 sn). Kaydırmaya bağlı hareket yok.
    gsap.fromTo(el.querySelector('.ot-portal__kiris'), { scaleX: 0.6, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.6, ease: 'power3.out' });
    gsap.fromTo(el.querySelector('[data-ot-tabela]'), { rotateX: -40, opacity: 0 }, { rotateX: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.1 });
    gsap.fromTo(el.querySelector('.ot-tabela'), { '--parilti': '-40%' }, { '--parilti': '140%', duration: 1.1, ease: 'power2.inOut', delay: 0.7 });
  },
};

// --- Yol yardım: etkileşimli mesafe tabelası --------------------------------------------------

const ARACLAR = ['Çekici', 'Kamyon', 'Otobüs', 'Midibüs', 'Kamyonet'];
const DERTLER = ['Hava kaçırıyor', 'Motor stop etti', 'Güç düşürdü (AdBlue)', 'Vites geçmiyor', 'Akü ya da elektrik', 'Körük indi'];

export const yolYardim = {
  render(d) {
    const y = k(d).yolYardim;
    if (!y?.noktalar?.length) return '';
    const secim = (ad, liste, ilk) =>
      `<div class="ot-cip">${liste.map((x, i) => `<label><input type="radio" name="${ad}" value="${esc(x)}"${i === ilk ? ' checked' : ''}><span>${esc(x)}</span></label>`).join('')}</div>`;
    return `
      <section class="k-bolum ot-yy" aria-labelledby="ot-yy-baslik">
        <div class="k-kap">
          <div class="ot-yy__bas">
            <h2 class="k-h2" id="ot-yy-baslik" data-bol>${esc(y.baslik || 'Yol yardım')}</h2>
            <p class="k-lead">${esc(y.metin)}</p>
          </div>
          <div class="ot-yy__ic">
            <form class="ot-yy__form" onsubmit="return false">
              <fieldset class="ot-mesafe">
                <legend>En yakın nokta</legend>
                <div class="ot-mesafe__tabela">
                  ${y.noktalar
                    .map(
                      (n, i) => `<label class="ot-mesafe__satir"><input type="radio" name="nokta" value="${i}"${i === 7 ? ' checked' : ''}>
                        <span class="ot-mesafe__ad">${esc(n.ad)}</span><span class="ot-mesafe__yol">${esc(n.yol)}</span><span class="ot-mesafe__km">${esc(n.km)}</span></label>`
                    )
                    .join('')}
                </div>
              </fieldset>
              <fieldset class="ot-alan"><legend>Araç</legend>${secim('arac', ARACLAR, 0)}</fieldset>
              <fieldset class="ot-alan"><legend>Arıza</legend>${secim('dert', DERTLER, 0)}</fieldset>
            </form>
            <div class="ot-yy__sonuc" aria-live="polite">
              <div class="ot-rota" aria-hidden="true">
                <svg viewBox="0 0 400 60" preserveAspectRatio="none"><line x1="8" y1="30" x2="392" y2="30" class="ot-rota__yol"/><line x1="8" y1="30" x2="392" y2="30" class="ot-rota__serit"/><line x1="392" y1="30" x2="392" y2="30" class="ot-rota__iz" data-o="iz"/></svg>
                <span class="ot-rota__nokta ot-rota__nokta--baz">Şaşmaz</span>
                <span class="ot-rota__nokta ot-rota__nokta--hedef" data-o="hedef"></span>
                <span class="ot-rota__arac" data-o="arac">${kamyon}</span>
              </div>
              <div class="ot-yy__km">
                <p class="ot-yy__kmsayi"><span data-o="km">0</span><small>km</small></p>
                <p class="ot-yy__kmmetin"><span data-o="ad"></span><span class="ot-kalkan" data-o="yol"></span></p>
              </div>
              <p class="ot-yy__onizle-bas">Gidecek mesaj</p>
              <p class="ot-yy__onizle" data-o="mesaj"></p>
              <div class="ot-yy__dugme">
                ${d.iletisim.whatsapp ? `<a class="k-btn ot-yy__wa" data-o="wa" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan gönder</span></a>` : ''}
                <button type="button" class="k-btn k-btn--ikincil ot-yy__konum" data-o="konum">${icons.pin}<span>Konumumu ekle</span></button>
                <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
              </div>
              <p class="ot-yy__not">${esc(y.not || '')}</p>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const y = k(d).yolYardim;
    if (!y) return;
    const form = el.querySelector('form');
    const o = (n) => el.querySelector(`[data-o="${n}"]`);
    const enUzak = Math.max(...y.noktalar.map((n) => n.km));
    let konum = '';
    let oncekiKm = 0;
    const cizgi = o('iz');

    function guncelle(animasyon = true) {
      const f = new FormData(form);
      const n = y.noktalar[Number(f.get('nokta'))] || y.noktalar[0];
      const arac = f.get('arac');
      const dert = f.get('dert');
      const oran = 0.12 + 0.86 * (n.km / enUzak);
      const x = 392 - 384 * oran;
      o('ad').textContent = n.ad;
      o('yol').textContent = n.yol;
      o('hedef').style.left = `${(x / 400) * 100}%`;
      const mesaj = `Merhaba, yolda kaldım. ${n.ad} (${n.yol}) civarındayım. Araç: ${arac}. Sorun: ${dert.toLocaleLowerCase('tr').replace('adblue', 'AdBlue')}.${konum ? ` Konumum: ${konum}` : ' Konumu birazdan atıyorum.'}`;
      o('mesaj').textContent = mesaj;
      const wa = o('wa');
      if (wa) wa.href = waHref(d, mesaj);
      const km = o('km');
      const aracEl = o('arac');
      const hedefYuzde = (x / 400) * 100;
      if (reducedMotion || !animasyon) {
        km.textContent = n.km;
        cizgi.setAttribute('x2', x);
        aracEl.style.left = `${hedefYuzde}%`;
        oncekiKm = n.km;
        return;
      }
      const s = { v: oncekiKm };
      gsap.to(s, { v: n.km, duration: 0.9, ease: 'power3.out', onUpdate: () => (km.textContent = Math.round(s.v)) });
      gsap.to(cizgi, { attr: { x2: x }, duration: 0.9, ease: 'power3.inOut' });
      gsap.fromTo(aracEl, { left: '98%' }, { left: `${hedefYuzde}%`, duration: 1.1, ease: 'power2.inOut' });
      oncekiKm = n.km;
    }
    form.addEventListener('change', () => guncelle(true));
    guncelle(false);

    const kb = o('konum');
    kb.addEventListener('click', () => {
      const yaz = (t) => (kb.querySelector('span').textContent = t);
      if (!navigator.geolocation) return yaz('Konum desteklenmiyor');
      yaz('Konum alınıyor…');
      navigator.geolocation.getCurrentPosition(
        (p) => {
          konum = `https://maps.google.com/?q=${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`;
          yaz('Konum eklendi');
          kb.classList.add('is-tamam');
          guncelle(false);
        },
        () => yaz('Konum izni verilmedi'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    if (!reducedMotion) {
      gsap.from(el.querySelectorAll('.ot-mesafe__satir'), {
        x: -24, opacity: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out',
        scrollTrigger: { trigger: el.querySelector('.ot-mesafe'), start: 'top 80%', toggleActions: 'play none none none' },
      });
    }
  },
};
