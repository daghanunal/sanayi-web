// Sektör modülleri (kurumsal-dizel, "Menzür"):
// (1) tezgah: İMZA. Enjektör test tezgâhının menzür tüpleri. Şikâyet seçilince tüpler dolar, tolerans bandının
//     dışında kalan enjektör kırmızıya döner; yanda hangi ölçüme bakıldığı ve enjektör başına karar yazar.
//     Sayısal okuma yok (çizim temsilî).
// (2) hizmetOzet: hizmetler iş föyü gibi (kod, süre, fotoğraf).
import { esc, waHref, icons, gsap, reducedMotion } from '../../shared/core.js';
import { ok } from '../_kurumsal/bolumler.js';

// --- (2) Test tezgâhı ----------------------------------------------------------------------
// Değerler binek common rail enjektörü için örnek ölçekte; ağır vasıtada katsayıyla büyür.
const MODLAR = [
  { id: 'tam', ad: 'Tam yük', kisa: 'Tam yük debisi', hedef: 58, tol: 4, max: 80 },
  { id: 'kismi', ad: 'Kısmi yük', kisa: 'Kısmi yük debisi', hedef: 24, tol: 3, max: 36 },
  { id: 'rolanti', ad: 'Rölanti', kisa: 'Rölanti debisi', hedef: 6, tol: 1.2, max: 10, hane: 1 },
  { id: 'donus', ad: 'Geri dönüş', kisa: 'Geri dönüş kaçağı', ust: 32, max: 60 },
];

// Sağlam bir enjektörün hedeften küçük sapması (deterministik, her tüp biraz farklı dursun).
const TITRE = [0.012, -0.018, 0.006, -0.009, 0.015, -0.004];
const DONUS_TEMEL = [18, 21, 16, 19, 22, 17];

const SIKAYETLER = [
  {
    id: 'tekleme', mod: 'rolanti', ad: 'Rölantide tekliyor, sarsıyor',
    ozet: 'Rölantide bir silindir eksik yakıt alıyordur. Fark tam yükte az, rölantide belirgindir.',
    ariza: { 2: { tam: 0.95, kismi: 0.86, rolanti: 0.62 } },
  },
  {
    id: 'duman', mod: 'tam', ad: 'Siyah duman, yakıt kokusu',
    ozet: 'Bir enjektör fazla yakıt veriyor ya da memesi damlatıyor olabilir. Bu enjektörün geri dönüşü de çoğu zaman yüksektir.',
    ariza: { 1: { tam: 1.17, kismi: 1.2, rolanti: 1.34, donus: 1.9 } },
  },
  {
    id: 'zor', mod: 'donus', ad: 'Sabah zor çalışıyor',
    ozet: 'Geri dönüşü yüksek enjektörler marşta rail basıncının toplanmasını engeller. Rail basınç sensörü ve regülatör de kontrol edilir.',
    ariza: { 0: { donus: 2.45 }, 3: { donus: 2.2, rolanti: 0.84 } },
  },
  {
    id: 'tuketim', mod: 'tam', ad: 'Yakıt tüketimi arttı',
    ozet: 'Tam yükte aralığın üstüne çıkan enjektör fazla yakıt verir. Çoğu zaman temizlik ve yeniden ölçümle düzelir.',
    ariza: { 1: { tam: 1.1, kismi: 1.08 }, 3: { tam: 1.09 } },
  },
  {
    id: 'kontrol', mod: 'tam', ad: 'Şikâyet yok, kontrol',
    ozet: 'Bütün enjektörler aralıktaysa yerlerine geri takılır.',
    ariza: {},
  },
];

const AGIR = { tam: 2.6, kismi: 2.5, rolanti: 2, donus: 1.6 };

function olcekliMod(m, agir) {
  if (!agir) return m;
  const k = AGIR[m.id];
  return { ...m, hedef: m.hedef && m.hedef * k, tol: m.tol && m.tol * k, ust: m.ust && m.ust * k, max: m.max * k };
}

function olc(sikayet, adet, agir) {
  return Array.from({ length: adet }, (_, i) => {
    const a = sikayet.ariza[i] || {};
    const sonuc = {};
    for (const m0 of MODLAR) {
      const m = olcekliMod(m0, agir);
      const v = m.id === 'donus' ? DONUS_TEMEL[i] * (agir ? AGIR.donus : 1) * (a.donus || 1) : m.hedef * (1 + TITRE[i]) * (a[m.id] || 1);
      const gecti = m.id === 'donus' ? v <= m.ust : Math.abs(v - m.hedef) <= m.tol;
      sonuc[m.id] = { v, gecti };
    }
    // Karar
    const debiHata = MODLAR.filter((m) => m.id !== 'donus' && !sonuc[m.id].gecti);
    let karar;
    if (!sonuc.donus.gecti) karar = { kod: 'valf', ad: 'Tamir', not: 'Valf grubu ve conta' };
    else if (debiHata.length) {
      const enKotu = Math.max(...debiHata.map((m) => {
        const mm = olcekliMod(m, agir);
        return Math.abs(sonuc[m.id].v - mm.hedef) / mm.tol;
      }));
      karar = enKotu <= 2.2 ? { kod: 'temizlik', ad: 'Temizlik', not: 'Ultrasonik temizlik, yeniden ölçüm' } : { kod: 'tamir', ad: 'Tamir', not: 'Meme ve valf grubu' };
    } else karar = { kod: 'uygun', ad: 'Uygun', not: 'Yerine takılır' };
    return { no: i + 1, sonuc, karar };
  });
}

const tupHtml = (i) => `
  <div class="dz-tup" data-i="${i}">
    <div class="dz-tup__cam">
      <span class="dz-tup__bant"></span>
      <span class="dz-tup__sivi"></span>
      <span class="dz-tup__yuzey"></span>
    </div>
    <p class="dz-tup__ad">E${i + 1}</p>
  </div>`;

export const tezgah = {
  render(d) {
    const x = d.kurumsal?.tezgah || {};
    return `
      <section class="k-bolum dz-tz" aria-labelledby="dz-tz-baslik">
        <div class="k-kap">
          <div class="dz-tz__bas">
            <h2 class="k-h2" id="dz-tz-baslik" data-bol>${esc(x.baslik || 'Enjektör testi')}</h2>
            ${x.metin ? `<p class="k-lead">${esc(x.metin)}</p>` : ''}
          </div>
          <div class="dz-tz__cipler" role="group" aria-label="Şikâyet" data-lenis-prevent>
            ${SIKAYETLER.map((s, i) => `<button type="button" class="dz-cip" data-s="${s.id}" aria-pressed="${i === 0}">${esc(s.ad)}</button>`).join('')}
          </div>
          <div class="dz-tz__ic">
            <div class="dz-tezgah">
              <p class="dz-tezgah__mod" aria-live="polite"><span>Bakılan ölçüm</span><b data-mod></b></p>
              <div class="dz-tezgah__tupler" data-adet="4" aria-hidden="true">${Array.from({ length: 4 }, (_, i) => tupHtml(i)).join('')}</div>
              <p class="dz-hukum" aria-live="polite"></p>
            </div>
            <article class="dz-cikti" aria-live="polite">
              <div class="dz-cikti__kagit"></div>
            </article>
          </div>
          ${x.not ? `<p class="dz-tz__not">${esc(x.not)}</p>` : ''}
        </div>
      </section>`;
  },
  mount(el, d) {
    const tupler = [...el.querySelectorAll('.dz-tup')];
    const kagit = el.querySelector('.dz-cikti__kagit');
    const hukum = el.querySelector('.dz-hukum');
    const modEl = el.querySelector('[data-mod]');
    const tezgahEl = el.querySelector('.dz-tezgah');
    const adet = 4;
    let sikayet = SIKAYETLER[0];
    let calisti = false;
    let tl = null;

    const cikti = (sonuclar, m) => {
      const mesaj = `Merhaba ${d.isletme.ad}, aracımda şu şikâyet var: ${sikayet.ad.toLocaleLowerCase('tr-TR')}. Enjektörleri tezgâhta ölçtürmek istiyorum. Aracım: `;
      return `
        <header class="dz-cikti__bas">
          <p class="dz-cikti__firma">${esc(d.isletme.ad)}</p>
          <p>Enjektör testi · temsilî</p>
        </header>
        <p class="dz-cikti__sikayet"><span>Şikâyet</span>${esc(sikayet.ad)}</p>
        <p class="dz-cikti__ozet">${esc(sikayet.ozet)}</p>
        <p class="dz-cikti__ara">Enjektör başına karar</p>
        <ul class="dz-cikti__karar">
          ${sonuclar.map((s) => `<li class="k-${s.karar.kod}"><span>E${s.no}</span><b>${esc(s.karar.ad)}</b><small>${esc(s.karar.not)}</small></li>`).join('')}
        </ul>
        <a class="k-btn dz-cikti__btn" href="${waHref(d, mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu şikâyetle yazın</span></a>`;
    };

    const calistir = (animasyon = true) => {
      const m = MODLAR.find((x) => x.id === sikayet.mod) || MODLAR[0];
      const sonuclar = olc(sikayet, adet, false);
      tezgahEl.dataset.mod = m.id;
      modEl.textContent = m.kisa;
      tl?.kill();
      tl = gsap.timeline();
      tupler.forEach((t, i) => {
        const r = sonuclar[i].sonuc[m.id];
        const bantAlt = m.id === 'donus' ? 0 : (m.hedef - m.tol) / m.max;
        const bantUst = m.id === 'donus' ? m.ust / m.max : (m.hedef + m.tol) / m.max;
        t.style.setProperty('--b0', bantAlt.toFixed(3));
        t.style.setProperty('--b1', bantUst.toFixed(3));
        t.classList.remove('is-dis', 'is-ok');
        const p = Math.min(r.v / m.max, 1);
        const sivi = t.querySelector('.dz-tup__sivi');
        const yuzey = t.querySelector('.dz-tup__yuzey');
        const son = () => t.classList.add(r.gecti ? 'is-ok' : 'is-dis');
        if (!animasyon || reducedMotion) {
          gsap.set(sivi, { scaleY: p });
          gsap.set(yuzey, { bottom: `${p * 100}%` });
          son();
          return;
        }
        tl.fromTo(sivi, { scaleY: 0 }, { scaleY: p, duration: 1.4, ease: 'power2.out' }, i * 0.12)
          .fromTo(yuzey, { bottom: '0%' }, { bottom: `${p * 100}%`, duration: 1.4, ease: 'power2.out' }, i * 0.12)
          .add(son, i * 0.12 + 1.4);
      });
      const islem = sonuclar.filter((s) => s.karar.kod !== 'uygun').length;
      hukum.innerHTML = islem
        ? `${adet} enjektörden <b class="is-dis">${islem}</b> tanesi işlem ister, <b>${adet - islem}</b> tanesi yerine takılır.`
        : `${adet} enjektörün hepsi aralıkta, yerlerine takılır.`;
      kagit.innerHTML = cikti(sonuclar, m);
      if (animasyon && !reducedMotion) gsap.fromTo(kagit, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1, ease: 'steps(14)', delay: 0.4 });
      else gsap.set(kagit, { clipPath: 'none' });
    };

    el.querySelectorAll('.dz-cip').forEach((b) =>
      b.addEventListener('click', () => {
        el.querySelectorAll('.dz-cip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        sikayet = SIKAYETLER.find((s) => s.id === b.dataset.s) || SIKAYETLER[0];
        calistir();
      })
    );

    calistir(false);
    if (!reducedMotion) {
      tupler.forEach((t) => gsap.set(t.querySelector('.dz-tup__sivi'), { scaleY: 0 }));
      gsap.set(kagit, { clipPath: 'inset(0 0 100% 0)' });
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting || calisti) return;
        calisti = true;
        calistir();
        io.disconnect();
      }, { threshold: 0.35 });
      io.observe(tezgahEl);
    }
  },
};

// --- (2) Hizmet özeti: iş föyü --------------------------------------------------------------
export const hizmetOzet = {
  render(d) {
    const list = (d.hizmetler || []).slice(0, 6);
    if (!list.length) return '';
    return `
      <section class="k-bolum dz-hf">
        <div class="k-kap">
          <div class="k-bolum__bas">
            <h2 class="k-h2" data-bol>${esc(d.kurumsal?.hizmetOzetBaslik || 'Hizmetler')}</h2>
            <a class="k-link" href="#/hizmetler" data-rota="hizmetler">Tümü ${ok}</a>
          </div>
          <ol class="dz-hf__liste" data-sira>
            ${list.map((h, i) => `
              <li><a href="#/hizmetler" data-rota="hizmetler">
                ${h.gorsel ? `<span class="dz-hf__gorsel"><img src="${h.gorsel}" alt="" loading="lazy"></span>` : ''}
                <span class="dz-hf__kod">T-${String(i + 1).padStart(2, '0')}</span>
                <span class="dz-hf__ad">${esc(h.baslik)}</span>
                <span class="dz-hf__metin">${esc(h.kisa || h.aciklama)}</span>
                ${h.sure ? `<span class="dz-hf__sure"><span>Süre</span>${esc(h.sure)}</span>` : ''}
              </a></li>`).join('')}
          </ol>
        </div>
      </section>`;
  },
};

