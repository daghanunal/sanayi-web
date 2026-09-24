// Otoyol: yeşil karayolu tabelası dili. Üç modül:
//  tabelaHero  — gece yolunun üstünde asılı portal tabela; kaydırınca altından geçilir.
//  yolYardim   — etkileşimli mesafe tabelası: en yakın nokta + araç + arıza → rota çizgisi ve hazır WhatsApp mesajı.
//  olcumler    — hız sınırı levhası gibi yuvarlak levhalarda giriş/teslim ölçümü (d.alt).
import { esc, waHref, telHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, gsap, ScrollTrigger, reducedMotion } from '../../shared/core.js';

const k = (d) => d.kurumsal || {};
const B = import.meta.env.BASE_URL;
const nf = (n, ondalik) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: ondalik, maximumFractionDigits: ondalik });
const ondalikSay = (n) => (String(n).split('.')[1] || '').length;

const okCapraz = `<svg class="ot-okcapraz" viewBox="0 0 100 100" aria-hidden="true"><path d="M30 78 L70 38 M42 30 H72 V60" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="square" stroke-linejoin="miter"/></svg>`;
const okSag = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const kamyon = `<svg viewBox="0 0 40 24" aria-hidden="true"><path d="M2 4h22v13H2zM24 8h7l6 5v4H24z" fill="currentColor"/><circle cx="9" cy="19" r="3.2" fill="currentColor" stroke="#fff" stroke-width="1.6"/><circle cx="30" cy="19" r="3.2" fill="currentColor" stroke="#fff" stroke-width="1.6"/></svg>`;

// --- Hero: portal tabela ---------------------------------------------------------------------

export const tabelaHero = {
  render(d) {
    const t = k(d).tabela || {};
    const st = d.saatler ? openStatus(d.saatler) : null;
    return `
      <section class="k-hero ot-hero" aria-label="Giriş">
        <div class="ot-hero__foto" aria-hidden="true"><img src="${B}img/kurumsal-agirvasita2/gece-yol.jpg" alt="" fetchpriority="high"></div>
        <div class="ot-hero__serit" aria-hidden="true"><i></i></div>
        <div class="ot-portal" data-ot-portal>
          <div class="ot-portal__kiris" aria-hidden="true"></div>
          <div class="ot-portal__tabelalar">
            <div class="ot-tabela ot-tabela--ana" data-ot-tabela>
              <span class="ot-cikis">${esc(t.cikis || 'ÇIKIŞ')} <b>${esc(t.yon || 'Şaşmaz')}</b></span>
              <div class="ot-tabela__ic">
                <div>
                  <p class="ot-tabela__ad">${esc(d.isletme.ad)}</p>
                  <p class="ot-tabela__satir">${String(t.satir || d.isletme.sektor).split('·').map((x) => `<span>${esc(x.trim())}</span>`).join('')}</p>
                </div>
                ${okCapraz}
              </div>
            </div>
            <a class="ot-tabela ot-tabela--yardim" href="${telHref(d)}" data-ot-tabela>
              <span class="ot-tabela__kucuk">7/24 yol yardım</span>
              <span class="ot-tabela__tel">${esc(d.iletisim.telefon)}</span>
              ${st ? `<span class="ot-tabela__durum${st.open ? ' is-acik' : ''}"><i></i>Sanayi: ${esc(st.text)}</span>` : ''}
            </a>
          </div>
        </div>
        <div class="k-kap ot-hero__alt">
          <h1 class="k-h1 ot-hero__baslik" data-bol>${esc(t.baslik || d.isletme.slogan)}</h1>
          <div class="ot-hero__sag">
            <p class="k-lead">${esc(t.metin || d.isletme.hakkinda)}</p>
            <div class="k-butonlar">
              <a class="k-btn" href="#/yol-yardim" data-rota="yol-yardim">${icons.pin}<span>Nerede kaldınız?</span></a>
              <a class="k-btn k-btn--ikincil" href="#/hizmetler" data-rota="hizmetler"><span>Hizmetler</span>${okSag}</a>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    const tabelalar = el.querySelectorAll('[data-ot-tabela]');
    // Açılış: tabelalar kirişten aşağı sallanarak iner, üstünden far parlaması geçer.
    gsap.fromTo(tabelalar, { rotateX: -88, opacity: 0 }, { rotateX: 0, opacity: 1, duration: 1.3, stagger: 0.14, ease: 'elastic.out(1, 0.55)', delay: 0.25 });
    gsap.fromTo(el.querySelector('.ot-portal__kiris'), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power3.out', delay: 0.05 });
    gsap.fromTo(el.querySelectorAll('.ot-tabela'), { '--parilti': '-40%' }, { '--parilti': '140%', duration: 1.4, ease: 'power2.inOut', delay: 1.1, stagger: 0.12 });
    // Kaydırma: yola doğru ilerlenir, tabela büyüyüp yukarı kayar (altından geçilir).
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: 0.6 } });
    tl.to(el.querySelector('.ot-hero__foto img'), { scale: 1.32, ease: 'none' }, 0)
      .to(el.querySelector('[data-ot-portal]'), { yPercent: -70, scale: 1.35, ease: 'power1.in' }, 0)
      .to(el.querySelector('.ot-hero__alt'), { yPercent: -14, ease: 'none' }, 0);
  },
};

// --- Yol yardım: etkileşimli mesafe tabelası --------------------------------------------------

const ARACLAR = ['Çekici', 'Kamyon', 'Otobüs', 'Midibüs', 'Kamyonet'];
const DERTLER = ['Hava kaçırıyor', 'Motor stop etti', 'Güç düşürdü / AdBlue', 'Vites geçmiyor', 'Akü / elektrik', 'Körük indi'];

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
            <p class="ot-etiket"><i></i>7/24 yol yardım</p>
            <h2 class="k-h2" id="ot-yy-baslik" data-bol>${esc(y.baslik)}</h2>
            <p class="k-lead">${esc(y.metin)}</p>
          </div>
          <div class="ot-yy__ic">
            <form class="ot-yy__form" onsubmit="return false">
              <fieldset class="ot-mesafe">
                <legend>Size en yakın nokta</legend>
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
              <fieldset class="ot-alan"><legend>Derdi ne?</legend>${secim('dert', DERTLER, 0)}</fieldset>
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
      const mesaj = `Merhaba, yolda kaldım. ${n.ad} (${n.yol}) civarındayım. Araç: ${arac}. Sorun: ${dert.toLowerCase()}.${konum ? ` Konumum: ${konum}` : ' Konumu birazdan atıyorum.'}`;
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
        scrollTrigger: { trigger: el.querySelector('.ot-mesafe'), start: 'top 80%', once: true },
      });
    }
  },
};

// --- Ölçümler: yuvarlak levhalar --------------------------------------------------------------

const CEVRE = 2 * Math.PI * 44;
const levha = (tur, etiket) => `
  <figure class="ot-levha ot-levha--${tur}">
    <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="49" class="ot-levha__zemin"/><circle cx="50" cy="50" r="44" class="ot-levha__iz"/><circle cx="50" cy="50" r="44" class="ot-levha__halka" data-halka="${tur}" stroke-dasharray="${CEVRE}" stroke-dashoffset="0" transform="rotate(-90 50 50)"/></svg>
    <div class="ot-levha__ic"><span class="ot-levha__sayi" data-sayi="${tur}">0</span><span class="ot-levha__birim" data-birim="${tur}"></span></div>
    <figcaption>${etiket}</figcaption>
  </figure>`;

export const olcumler = {
  render(d) {
    const liste = (d.alt || []).filter((a) => a.olcum);
    if (!liste.length) return '';
    return `
      <section class="k-bolum ot-olc" aria-labelledby="ot-olc-baslik">
        <div class="k-kap">
          <div class="k-bolum__bas">
            <div>
              <p class="ot-etiket ot-etiket--acik"><i></i>Önce ölçüm, sonra söz</p>
              <h2 class="k-h2" id="ot-olc-baslik" data-bol>${esc(k(d).olcumBaslik || 'Ölçmeden teslim etmeyiz')}</h2>
            </div>
            <p class="k-lead">${esc(k(d).olcumMetin || '')}</p>
          </div>
          <div class="ot-olc__sekme" role="tablist" aria-label="Sistemler" data-lenis-prevent>
            ${liste.map((a, i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-i="${i}">${esc(a.durak)}</button>`).join('')}
          </div>
          <div class="ot-olc__panel" role="tabpanel">
            <div class="ot-olc__levhalar">
              ${levha('once', 'Girişte')}
              <span class="ot-olc__ok" aria-hidden="true">${okSag}</span>
              ${levha('sonra', 'Teslimde')}
            </div>
            <div class="ot-olc__metin">
              <p class="ot-olc__olcum" data-o="etiket"></p>
              <h3 class="k-h3" data-o="baslik"></h3>
              <p class="k-metin" data-o="metin"></p>
              <p class="ot-olc__esik" data-o="esik"></p>
              <a class="k-link" data-o="link" href="#/iletisim" data-rota="iletisim">Bu iş için yazın ${okSag}</a>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const liste = (d.alt || []).filter((a) => a.olcum);
    if (!liste.length) return;
    const q = (s) => el.querySelector(s);
    const sekmeler = el.querySelectorAll('[role="tab"]');
    const deger = { once: 0, sonra: 0 };

    function iyiMi(a, v) {
      return a.olcum.ters ? v <= a.olcum.iyi : v >= a.olcum.iyi;
    }
    function goster(i, animasyon) {
      const a = liste[i];
      const m = a.olcum;
      const ond = Math.max(ondalikSay(m.once), ondalikSay(m.sonra), ondalikSay(m.iyi));
      const ust = Math.max(m.once, m.sonra, m.iyi) * 1.15;
      sekmeler.forEach((s, j) => s.setAttribute('aria-selected', String(j === i)));
      q('[data-o="etiket"]').textContent = `${m.etiket}, ${m.birim}`;
      q('[data-o="baslik"]').textContent = a.baslik;
      q('[data-o="metin"]').textContent = a.metin;
      q('[data-o="esik"]').textContent = `Olması gereken: ${m.ters ? 'en fazla' : 'en az'} ${nf(m.iyi, ond)} ${m.birim}`;
      const link = q('[data-o="link"]');
      const konu = a.hizmet || a.durak;
      link.href = `#/iletisim?konu=${encodeURIComponent(konu)}`;
      link.dataset.rota = `iletisim?konu=${encodeURIComponent(konu)}`;
      for (const tur of ['once', 'sonra']) {
        const v = m[tur];
        const halka = q(`[data-halka="${tur}"]`);
        const sayi = q(`[data-sayi="${tur}"]`);
        q(`[data-birim="${tur}"]`).textContent = m.birim;
        halka.closest('.ot-levha').classList.toggle('is-iyi', iyiMi(a, v));
        const hedefOff = CEVRE * (1 - Math.min(v / ust, 1));
        if (reducedMotion || !animasyon) {
          sayi.textContent = nf(v, ond);
          halka.setAttribute('stroke-dashoffset', hedefOff);
          deger[tur] = v;
          continue;
        }
        const s = { v: deger[tur] };
        gsap.to(s, { v, duration: 1, ease: 'power3.out', onUpdate: () => (sayi.textContent = nf(s.v, ond)) });
        gsap.fromTo(halka, { attr: { 'stroke-dashoffset': CEVRE } }, { attr: { 'stroke-dashoffset': hedefOff }, duration: 1.2, ease: 'power3.inOut', delay: tur === 'sonra' ? 0.2 : 0 });
        deger[tur] = v;
      }
      if (animasyon && !reducedMotion) gsap.fromTo(q('.ot-olc__metin'), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
    }
    sekmeler.forEach((s) => s.addEventListener('click', () => goster(Number(s.dataset.i), true)));
    if (reducedMotion) goster(0, false);
    else {
      goster(0, false);
      el.querySelectorAll('.ot-levha__halka').forEach((h) => h.setAttribute('stroke-dashoffset', CEVRE));
      el.querySelectorAll('[data-sayi]').forEach((h) => (h.textContent = '0'));
      deger.once = 0;
      deger.sonra = 0;
      ScrollTrigger.create({ trigger: q('.ot-olc__panel'), start: 'top 78%', once: true, onEnter: () => goster(0, true) });
    }
  },
};


// --- Sanayi saatleri: yol kenarı bilgi tabelası + yaklaşınca yüklenen harita ----------------------

export const sanayiSaat = {
  render(d) {
    if (!d.saatler) return '';
    const st = openStatus(d.saatler);
    return `
      <section class="k-bolum ot-saat" aria-labelledby="ot-saat-b">
        <div class="k-kap ot-saat__ic">
          <div class="ot-saat__tabela">
            <p class="ot-etiket ot-etiket--acik"><i></i>Sanayi saatleri</p>
            <h2 class="k-h2" id="ot-saat-b" data-bol>Kanal açık mı?</h2>
            <p class="ot-saat__durum${st.open ? ' is-acik' : ''}"><i></i>${esc(st.text)}</p>
            <dl class="ot-saat__liste">${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}</dl>
            <p class="ot-saat__yy"><b>Yol yardım</b><span>7 gün 24 saat</span></p>
            <p class="ot-saat__adres">${esc(d.iletisim.adres)}</p>
            <div class="k-butonlar">
              <a class="k-btn ot-saat__btn" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <a class="k-btn k-btn--ikincil ot-saat__btn2" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
          <div class="ot-saat__harita" data-perde><p>Harita yaklaşınca yüklenir</p></div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const kutu = el.querySelector('.ot-saat__harita');
    if (!kutu) return;
    const io = new IntersectionObserver(
      (e) => {
        if (!e[0].isIntersecting) return;
        kutu.innerHTML = `<iframe title="Konum haritası" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
        io.disconnect();
      },
      { rootMargin: '300px' }
    );
    io.observe(kutu);
  },
};
