// Sektöre özel modül: lastik ebadı okuyucu. "205/55 R16 91V" yazısını parça parça açıklar, yanak yüksekliğini ve
// toplam teker çapını hesaplar, ölçekli teker çizimini günceller; sezon ve adetle WhatsApp fiyat talebi hazırlar.
import { esc, waHref, gsap, reducedMotion } from '../../shared/core.js';

const YUK = { 75: 387, 76: 400, 77: 412, 78: 425, 79: 437, 80: 450, 81: 462, 82: 475, 83: 487, 84: 500, 85: 515, 86: 530, 87: 545, 88: 560, 89: 580, 90: 600, 91: 615, 92: 630, 93: 650, 94: 670, 95: 690, 96: 710, 97: 730, 98: 750, 99: 775, 100: 800, 101: 825, 102: 850, 103: 875, 104: 900, 105: 925, 106: 950, 107: 975, 108: 1000, 109: 1030, 110: 1060, 111: 1090, 112: 1120 };
const HIZ = { L: 120, M: 130, N: 140, P: 150, Q: 160, R: 170, S: 180, T: 190, U: 200, H: 210, V: 240, W: 270, Y: 300 };
const ORNEKLER = ['185/65 R15 88H', '205/55 R16 91V', '225/45 R17 94W', '215/65 R16C 109T'];
const SEZONLAR = ['Yaz', 'Kış', 'Dört mevsim'];
const ADETLER = ['2 adet', '4 adet', 'Filo'];
const nf = new Intl.NumberFormat('tr-TR');

function coz(yazi) {
  const m = String(yazi).toUpperCase().replace(/\s+/g, ' ').match(/(\d{3})\s*\/\s*(\d{2})\s*(Z?R|-)?\s*(\d{2})\s*(C)?\s*(?:(\d{2,3})(?:\/\d{2,3})?\s*([A-Z]))?/);
  if (!m) return null;
  const [, g, o, yapi, j, c, yuk, hiz] = m;
  const gen = Number(g), oran = Number(o), jant = Number(j);
  if (gen < 125 || gen > 355 || oran < 25 || oran > 85 || jant < 12 || jant > 24) return null;
  const yanak = Math.round((gen * oran) / 100);
  const jantMm = Math.round(jant * 25.4);
  return { gen, oran, yapi: yapi || 'R', jant, c: !!c, yuk: yuk ? Number(yuk) : null, hiz: hiz || null, yanak, jantMm, cap: jantMm + 2 * yanak };
}

const PARCALAR = [
  ['gen', 'Taban genişliği'],
  ['oran', 'Yanak oranı'],
  ['yapi', 'Yapı'],
  ['jant', 'Jant çapı'],
  ['yuk', 'Yük endeksi'],
  ['hiz', 'Hız endeksi'],
];

function aciklama(e) {
  return {
    gen: [`${e.gen} mm`, 'Lastiğin yola basan genişliği, yanaktan yanağa milimetre.'],
    oran: [`%${e.oran} → ${e.yanak} mm`, `Yanak yüksekliği genişliğin yüzde ${e.oran}'i. Oran küçüldükçe yanak incelir, sürüş sertleşir.`],
    yapi: [e.yapi.includes('Z') ? 'ZR, radyal' : 'R, radyal', `Radyal yapı; bugün binek araçların neredeyse tamamı böyle.${e.c ? ' C: hafif ticari (commercial) lastik, kat sayısı ve taşıma gücü yüksek.' : ''}`],
    jant: [`${e.jant} inç = ${e.jantMm} mm`, 'Lastiğin oturduğu jantın çapı. Jant değişmeden bu değer değişmez.'],
    yuk: e.yuk ? [`${e.yuk} → ${YUK[e.yuk] ? `${nf.format(YUK[e.yuk])} kg` : 'tabloya bakın'}`, 'Lastik başına taşıyabileceği en yüksek yük. Ruhsattaki değerin altına inmeyin.'] : ['Yazılmadı', 'Ebadın sonundaki iki-üç haneli sayı; lastik başına taşıma gücü.'],
    hiz: e.hiz ? [`${e.hiz} → ${HIZ[e.hiz] ? `${HIZ[e.hiz]} km/sa` : 'tabloya bakın'}`, 'Lastiğin tam yükte güvenle çıkabileceği en yüksek hız.'] : ['Yazılmadı', 'Ebadın en sonundaki harf; en yüksek güvenli hız.'],
  };
}

export const ebatOkuyucu = {
  render() {
    return `
      <section class="k-bolum eb" aria-labelledby="eb-baslik">
        <div class="k-kap">
          <div class="eb__bas">
            <h2 class="k-h2" id="eb-baslik" data-bol>Lastiğin yanağında ne yazıyor?</h2>
            <p class="k-lead">Ebadı yazın ya da örneklerden birini seçin; her parçanın ne anlama geldiğini ve teker ölçülerini görün.</p>
          </div>
          <div class="eb__ic">
            <div class="eb__sol">
              <label class="eb__giris"><span>Lastik ebadı</span><input name="ebat" value="205/55 R16 91V" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text"></label>
              <div class="eb__ornek" aria-label="Örnek ebatlar">${ORNEKLER.map((o) => `<button type="button" data-ornek="${esc(o)}">${esc(o)}</button>`).join('')}</div>
              <p class="eb__kod" aria-hidden="true"></p>
              <p class="eb__hata" role="alert" hidden>Bu yazıyı okuyamadık. Örnek biçim: 205/55 R16 91V</p>
              <dl class="eb__liste" aria-live="polite"></dl>
            </div>
            <div class="eb__sag">
              <figure class="eb__cizim">
                <svg viewBox="0 0 320 320" role="img" aria-label="Ölçekli teker çizimi">
                  <g class="eb__teker"><circle class="eb__lastik" cx="160" cy="160" r="140"/>
                  <circle class="eb__dis" cx="160" cy="160" r="140"/>
                  <circle class="eb__jant" cx="160" cy="160" r="90"/>
                  <g class="eb__kollar">${Array.from({ length: 5 }, (_, i) => `<rect x="155" y="84" width="10" height="70" rx="5" transform="rotate(${i * 72} 160 160)"/>`).join('')}</g>
                  <circle class="eb__gobek" cx="160" cy="160" r="16"/></g>
                  <line class="eb__olcu" x1="304" x2="304" y1="20" y2="300"/>
                </svg>
                <figcaption><span class="eb__cap"></span><small>toplam teker çapı</small></figcaption>
              </figure>
              <form class="eb__form" onsubmit="return false">
                <fieldset><legend>Sezon</legend><div class="eb__secim">${SEZONLAR.map((s, i) => `<label><input type="radio" name="sezon" value="${s}"${i === 0 ? ' checked' : ''}><span>${s}</span></label>`).join('')}</div></fieldset>
                <fieldset><legend>Adet</legend><div class="eb__secim">${ADETLER.map((s, i) => `<label><input type="radio" name="adet" value="${s}"${i === 1 ? ' checked' : ''}><span>${s}</span></label>`).join('')}</div></fieldset>
                <a class="k-btn eb__wa" target="_blank" rel="noopener">Bu ebatta fiyat isteyin</a>
              </form>
            </div>
          </div>
          <p class="k-not eb__dot">Lastiğin yaşı: yanaktaki DOT yazısının son dört hanesi üretim haftası ve yılıdır. 2322 = 2022'nin 23. haftası.</p>
        </div>
      </section>`;
  },

  mount(el, d) {
    const giris = el.querySelector('input[name="ebat"]');
    const kod = el.querySelector('.eb__kod');
    const liste = el.querySelector('.eb__liste');
    const hata = el.querySelector('.eb__hata');
    const cap = el.querySelector('.eb__cap');
    const lastik = el.querySelectorAll('.eb__lastik, .eb__dis');
    const jant = el.querySelector('.eb__jant');
    const kollar = el.querySelector('.eb__kollar');
    const olcu = el.querySelector('.eb__olcu');
    const form = el.querySelector('.eb__form');
    const wa = el.querySelector('.eb__wa');
    let son = null;
    let secili = 'oran';

    const vurgula = (p) => {
      secili = p;
      el.querySelectorAll('[data-p]').forEach((x) => x.classList.toggle('is-secili', x.dataset.p === p));
    };

    const mesaj = () => {
      const f = new FormData(form);
      const e = son;
      const ebat = e ? `${e.gen}/${e.oran} ${e.yapi}${e.jant}${e.c ? 'C' : ''}${e.yuk ? ` ${e.yuk}${e.hiz || ''}` : ''}` : giris.value.trim();
      wa.href = waHref(d, `Merhaba ${d.isletme.ad}, lastik fiyatı öğrenmek istiyorum.\nEbat: ${ebat}\nSezon: ${f.get('sezon')}\nAdet: ${f.get('adet')}`);
    };

    const guncelle = (ilk) => {
      const e = coz(giris.value);
      hata.hidden = !!e || !giris.value.trim();
      if (!e) {
        mesaj();
        return;
      }
      son = e;
      const a = aciklama(e);
      const deger = { gen: e.gen, oran: `/${e.oran}`, yapi: ` ${e.yapi}`, jant: `${e.jant}${e.c ? 'C' : ''}`, yuk: e.yuk ? ` ${e.yuk}` : '', hiz: e.hiz || '' };
      kod.innerHTML = PARCALAR.filter(([p]) => deger[p] !== '').map(([p]) => `<button type="button" data-p="${p}" tabindex="-1">${esc(deger[p])}</button>`).join('');
      liste.innerHTML = PARCALAR.map(([p, ad]) => `<div data-p="${p}"><dt>${ad}</dt><dd><strong>${esc(a[p][0])}</strong><span>${esc(a[p][1])}</span></dd></div>`).join('');
      vurgula(secili);
      cap.textContent = `${nf.format(e.cap)} mm`;
      // Çizim ölçekli: 800 mm dış çap = 140 birim yarıçap.
      const s = 140 / 400;
      const R = Math.min(150, (e.cap / 2) * s);
      const r = (e.jantMm / 2) * s;
      const hedef = { dis: R, jant: r, kol: r / 90 };
      if (reducedMotion || ilk) {
        lastik.forEach((c) => c.setAttribute('r', hedef.dis));
        jant.setAttribute('r', hedef.jant);
        gsap.set(olcu, { attr: { y1: 160 - R, y2: 160 + R, x1: 172 + R, x2: 172 + R } });
        kollar.setAttribute('transform', `translate(160 160) scale(${hedef.kol}) translate(-160 -160)`);
      } else {
        gsap.to(lastik, { attr: { r: hedef.dis }, duration: 0.7, ease: 'power3.out' });
        gsap.to(jant, { attr: { r: hedef.jant }, duration: 0.7, ease: 'power3.out' });
        gsap.to(olcu, { attr: { y1: 160 - R, y2: 160 + R, x1: 172 + R, x2: 172 + R }, duration: 0.7, ease: 'power3.out' });
        const o = { k: Number(kollar.dataset.k || 1) };
        gsap.to(o, { k: hedef.kol, duration: 0.7, ease: 'power3.out', onUpdate: () => kollar.setAttribute('transform', `translate(160 160) scale(${o.k}) translate(-160 -160)`) });
        gsap.fromTo(kod.children, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: 'power2.out' });
      }
      kollar.dataset.k = hedef.kol;
      mesaj();
    };

    el.addEventListener('click', (e) => {
      const p = e.target.closest('[data-p]');
      if (p) vurgula(p.dataset.p);
      const o = e.target.closest('[data-ornek]');
      if (o) {
        giris.value = o.dataset.ornek;
        guncelle(false);
      }
    });
    giris.addEventListener('input', () => guncelle(false));
    form.addEventListener('input', mesaj);
    guncelle(true);

    // Görünür olunca teker bir tur döner (yalnızca bir kez).
    if (!reducedMotion) {
      gsap.fromTo(el.querySelector('.eb__teker'), { rotation: -120, scale: 0.85, svgOrigin: '160 160' }, { rotation: 0, scale: 1, svgOrigin: '160 160', duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: el.querySelector('.eb__cizim'), start: 'top 80%', once: true } });
    }
  },
};
