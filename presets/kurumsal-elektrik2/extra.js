// Sektör modülü: far ayar perdesi. Kısa farın kesme çizgisi 10 metredeki perdeye düşer; eğim kaydırılınca
// çizginin perdedeki yüksekliği, ışığın yere değdiği mesafe ve karşıdan gelen sürücünün gözü canlı hesaplanır.
// Ayrıca ana sayfada kısa "bugün açık mıyız" şeridi.
import { esc, waHref, telHref, mapsHref, openStatus, groupedHours, icons, gsap, reducedMotion } from '../../shared/core.js';

const FAR_YUKSEKLIK = 0.65; // m, binek araçta far merkezinin yerden yüksekliği (yaklaşık)
const OLCEK = 30; // perdede 30 px = 10 cm
const H = 150; // perdede far merkezi hizası (px)

const LAMBALAR = {
  halojen: { ad: 'Halojen', ic: '#fff4c9', dis: '#ffb422', kelvin: '3200 K' },
  xenon: { ad: 'Xenon', ic: '#f4f8ff', dis: '#7f9cff', kelvin: '4300 K' },
  led: { ad: 'LED', ic: '#ffffff', dis: '#c8f0ff', kelvin: '6000 K' },
};

function durum(e) {
  if (e < 0.5) return { k: 'kirmizi', baslik: 'Göz alıyor', metin: 'Kesme çizgisi karşıdan gelen sürücünün göz hizasına çıktı. Size selektör yapıyorlarsa sebebi bu.' };
  if (e < 1) return { k: 'sari', baslik: 'Biraz yüksek', metin: 'Yol iyi aydınlanıyor ama yüklüyken ya da tümsekte karşıdakinin gözüne girer.' };
  if (e <= 1.5) return { k: 'yesil', baslik: 'Doğru ayar', metin: 'Çoğu binek araçta kesme çizgisi 10 metrede 10 ile 15 cm aşağı düşmelidir. Hem yolu görürsünüz hem kimseyi kör etmezsiniz.' };
  if (e <= 2.2) return { k: 'sari', baslik: 'Biraz düşük', metin: 'Kimsenin gözünü almaz ama yolu kısa görürsünüz; gece virajda geç fark edersiniz.' };
  return { k: 'kirmizi', baslik: 'Çok düşük', metin: 'Işık tamponun önüne düşüyor. Genelde ayar motoru ya da kırık ayar vidası yüzündendir.' };
}

const virgul = (n, h = 1) => {
  const t = Math.abs(n).toFixed(h);
  return (n < 0 && Number(t) !== 0 ? '−' : '') + t.replace('.', ',');
};

export const farPerdesi = {
  render(d) {
    const lambalar = Object.entries(LAMBALAR)
      .map(([k, l], i) => `<button type="button" class="fp__lamba" data-lamba="${k}" aria-pressed="${i === 2}"><span style="--c:${l.dis}"></span>${l.ad}<small>${l.kelvin}</small></button>`)
      .join('');
    const izgara = [];
    for (let x = 0; x <= 600; x += OLCEK) izgara.push(`<line x1="${x}" y1="0" x2="${x}" y2="360"/>`);
    for (let y = 0; y <= 360; y += OLCEK) izgara.push(`<line x1="0" y1="${y}" x2="600" y2="${y}"/>`);
    return `
      <section class="k-bolum fp" aria-labelledby="fp-baslik">
        <div class="k-kap">
          <div class="fp__bas">
            <p class="fp__etiket"><span></span>Far ayar perdesi · 10 metre</p>
            <h2 class="k-h2" id="fp-baslik" data-bol>Karşıdan gelen size selektör mü yapıyor?</h2>
            <p class="k-lead">Kısa farın üst sınırı düz bir çizgidir, sağ tarafta 15 derece yukarı kıvrılır. O çizgi perdede nereye düşüyorsa yol da, karşıdakinin gözü de oraya göre aydınlanır. Kaydırın, görün.</p>
          </div>
          <div class="fp__ic">
            <figure class="fp__perde" aria-hidden="true">
              <svg viewBox="0 0 600 360" class="fp__svg">
                <defs>
                  <radialGradient id="fp-isik" cx="50%" cy="30%" r="62%">
                    <stop offset="0" class="fp__s1"/>
                    <stop offset=".38" class="fp__s2"/>
                    <stop offset="1" stop-opacity="0" class="fp__s3"/>
                  </radialGradient>
                  <clipPath id="fp-kesme"><path class="fp__kesme" d="M0 0H300L420 -32H600V420H0Z"/></clipPath>
                </defs>
                <rect width="600" height="360" class="fp__duvar"/>
                <g class="fp__izgara">${izgara.join('')}</g>
                <g class="fp__huzme-g">
                  <g clip-path="url(#fp-kesme)"><ellipse cx="300" cy="46" rx="330" ry="170" fill="url(#fp-isik)" class="fp__huzme"/></g>
                  <path d="M0 0H300L420 -32H600" class="fp__cizgi"/>
                </g>
                <line x1="0" y1="${H}" x2="600" y2="${H}" class="fp__eksen"/>
                <line x1="300" y1="0" x2="300" y2="360" class="fp__eksen"/>
                <text x="206" y="${H - 9}" text-anchor="middle" class="fp__yazi">FAR HİZASI</text>
                <g class="fp__goz" transform="translate(70 ${H + 4})">
                  <path d="M-22 0Q0 -16 22 0Q0 16 -22 0Z" class="fp__goz-dis"/>
                  <circle r="6.5" class="fp__goz-ic"/>
                  <g class="fp__parlama"><path d="M-34 -18L-26 -12M34 -18L26 -12M0 -30V-20M-38 4H-28M38 4H28"/></g>
                </g>
                <text x="70" y="${H + 38}" text-anchor="middle" class="fp__yazi fp__yazi--goz">KARŞI SÜRÜCÜ</text>
                <g class="fp__olcu"><line x1="560" y1="${H}" x2="560" y2="${H}" class="fp__olcu-cizgi"/><text x="548" y="${H + 16}" text-anchor="end" class="fp__yazi fp__olcu-yazi">0 cm</text></g>
              </svg>
              <svg viewBox="0 0 600 96" class="fp__yol">
                <line x1="0" y1="84" x2="600" y2="84" class="fp__zemin"/>
                <path d="M6 80v-12q0-6 6-7l24-4 18-13q4-3 9-3h28q6 0 10 4l14 12 13 2q6 1 6 7v14z" class="fp__araba"/><circle cx="34" cy="80" r="8" class="fp__teker"/><circle cx="104" cy="80" r="8" class="fp__teker"/><rect x="116" y="58" width="8" height="7" rx="2" class="fp__far"/>
                <polygon class="fp__koni" points="118,62 600,62 600,84 118,84"/>
                <line x1="118" y1="62" x2="600" y2="84" class="fp__isin"/>
                <text x="590" y="24" text-anchor="end" class="fp__yazi fp__mesafe">54 m</text>
                <text x="130" y="24" class="fp__yazi">IŞIĞIN YERE DEĞDİĞİ YER</text>
              </svg>
            </figure>
            <div class="fp__panel">
              <div class="fp__lambalar" role="group" aria-label="Ampul tipi">${lambalar}</div>
              <label class="fp__kaydir">
                <span class="fp__kaydir-bas"><span>Far eğimi</span><output class="fp__yuzde">%0,3</output></span>
                <input type="range" min="-0.5" max="3" step="0.1" value="0.3" aria-describedby="fp-durum">
                <span class="fp__uclar"><span>Yukarı</span><span>Aşağı</span></span>
              </label>
              <dl class="fp__olcumler">
                <div><dt>Perdede (10 m)</dt><dd class="fp__dus">3 cm</dd></div>
                <div><dt>Yere değdiği yer</dt><dd class="fp__yer">217 m</dd></div>
              </dl>
              <div class="fp__durum" id="fp-durum" aria-live="polite"><strong></strong><p></p></div>
              <div class="fp__butonlar">
                <button type="button" class="k-btn fp__ayarla">Ustaya ayarlat</button>
                <a class="k-btn k-btn--ikincil" href="${waHref(d, `Merhaba ${d.isletme.ad}, far ayarı için ne zaman gelebilirim?\nAraç: `)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Far randevusu</span></a>
              </div>
              <p class="fp__not">Hesap ${virgul(FAR_YUKSEKLIK, 2)} m far yüksekliğine göre yaklaşıktır. Kesin ayar atölyede perdeyle yapılır.</p>
            </div>
          </div>
        </div>
      </section>`;
  },

  mount(el) {
    const kok = el.querySelector('.fp');
    const giris = el.querySelector('input[type="range"]');
    const yuzde = el.querySelector('.fp__yuzde');
    const dus = el.querySelector('.fp__dus');
    const yer = el.querySelector('.fp__yer');
    const durumEl = el.querySelector('.fp__durum');
    const huzme = el.querySelector('.fp__huzme-g');
    const olcuC = el.querySelector('.fp__olcu-cizgi');
    const olcuY = el.querySelector('.fp__olcu-yazi');
    const isin = el.querySelector('.fp__isin');
    const koni = el.querySelector('.fp__koni');
    const mesafe = el.querySelector('.fp__mesafe');
    const lambaDugme = el.querySelectorAll('[data-lamba]');
    let sonDurum = '';

    const lambaSec = (k) => {
      const l = LAMBALAR[k];
      kok.style.setProperty('--fp-ic', l.ic);
      kok.style.setProperty('--fp-dis', l.dis);
      lambaDugme.forEach((b) => b.setAttribute('aria-pressed', b.dataset.lamba === k));
    };

    const ciz = (e) => {
      const y = H + e * OLCEK; // e % → 10 m'de e*10 cm → e*30 px
      huzme.setAttribute('transform', `translate(0 ${y.toFixed(1)})`);
      olcuC.setAttribute('y2', y.toFixed(1));
      olcuY.setAttribute('y', (e >= 0 ? y + 16 : y - 6).toFixed(1));
      const cm = Math.round(e * 10);
      olcuY.textContent = `${cm > 0 ? '−' : cm < 0 ? '+' : ''}${Math.abs(cm)} cm`;
      yuzde.textContent = `%${virgul(e)}`;
      dus.textContent = cm >= 0 ? `${cm} cm aşağı` : `${-cm} cm yukarı`;
      // Yol profili: 4 px = 1 m, 120 m'ye kadar
      const m = e > 0.02 ? FAR_YUKSEKLIK / (e / 100) : Infinity;
      yer.textContent = m === Infinity ? 'Yere değmiyor' : m > 150 ? '150 m üstü' : `≈ ${Math.round(m)} m`;
      mesafe.textContent = m === Infinity ? 'ufka gidiyor' : m > 150 ? '150+ m' : `${Math.round(m)} m`;
      const x = m === Infinity ? 600 : Math.min(600, 118 + m * 4);
      const yy = m === Infinity ? 62 - Math.min(40, -e * 60 + 2) : 84;
      isin.setAttribute('x2', x.toFixed(1));
      isin.setAttribute('y2', yy.toFixed(1));
      koni.setAttribute('points', `118,62 ${x.toFixed(1)},${yy.toFixed(1)} ${x.toFixed(1)},84 118,84`);
      const s = durum(e);
      kok.dataset.durum = s.k;
      kok.classList.toggle('is-goz', e < 0.5);
      if (s.baslik !== sonDurum) {
        sonDurum = s.baslik;
        durumEl.querySelector('strong').textContent = s.baslik;
        durumEl.querySelector('p').textContent = s.metin;
      }
    };

    const durumTw = { e: Number(giris.value) };
    const git = (hedef, sure = 1.6) => {
      if (reducedMotion) {
        giris.value = hedef;
        ciz(hedef);
        return;
      }
      gsap.to(durumTw, {
        e: hedef, duration: sure, ease: 'power3.inOut', overwrite: true,
        onUpdate: () => {
          giris.value = durumTw.e.toFixed(1);
          ciz(durumTw.e);
        },
      });
    };

    giris.addEventListener('input', () => {
      gsap.killTweensOf(durumTw);
      durumTw.e = Number(giris.value);
      ciz(durumTw.e);
    });
    lambaDugme.forEach((b) => b.addEventListener('click', () => lambaSec(b.dataset.lamba)));
    el.querySelector('.fp__ayarla').addEventListener('click', () => git(1.2, 1.4));

    lambaSec('led');
    // Açılış: ayarsız LED ile başlar (göz alıyor), bölüm göründüğünde bir kez kendiliğinden ayara iner.
    const baslangic = -0.3;
    giris.value = baslangic;
    durumTw.e = baslangic;
    ciz(baslangic);
    if (!reducedMotion) {
      gsap.timeline({ scrollTrigger: { trigger: kok.querySelector('.fp__perde'), start: 'top 70%', once: true } })
        .add(() => git(2.6, 1.3), 0.5)
        .add(() => git(1.2, 1.2), 2.1);
    }
  },
};

export const bugun = {
  render(d) {
    if (!d.saatler) return '';
    const st = openStatus(d.saatler);
    return `
      <section class="k-bolum bg" aria-labelledby="bg-baslik">
        <div class="k-kap bg__ic">
          <div class="bg__sol">
            <p class="bg__durum ${st.open ? 'is-acik' : ''}"><span></span>${esc(st.text)}</p>
            <h2 class="k-h2" id="bg-baslik" data-bol>Şaşmaz'dayız, kapımız cadde üstünde.</h2>
            <p class="bg__adres">${esc(d.iletisim.adres)}</p>
            <div class="k-butonlar">
              <a class="k-btn" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
          <dl class="bg__saat" data-sira>
            ${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}
          </dl>
        </div>
      </section>`;
  },
};
