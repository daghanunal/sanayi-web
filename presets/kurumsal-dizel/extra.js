// Sektör modülleri (kurumsal-dizel, "Menzür"):
// (1) hero: motorun hero'su + fotoğrafın üstünde canlı "tezgâh ekranı" (dört küçük menzür, debi okuması).
// (2) tezgah: İMZA. Enjektör test tezgâhının menzür tüpleri. Şikâyet seç → tezgâh çalışır, tüpler dolar,
//     tolerans bandının dışında kalan enjektör kırmızıya döner; yanda termal kâğıda "test çıktısı" basılır.
//     Mod (tam yük / kısmi yük / rölanti / geri dönüş) ve 4 ya da 6 silindir seçilebilir.
// (3) hizmetOzet: hizmetler ölçü föyü gibi (kod, süre, fotoğraf).
// (4) atolye: bugün açık mı, saatler, adres, yaklaşınca yüklenen harita.
import { esc, waHref, telHref, mapsHref, mapsEmbed, openStatus, groupedHours, GUNLER, icons, gsap, reducedMotion } from '../../shared/core.js';
import { BOLUMLER, ok } from '../_kurumsal/bolumler.js';

const virgul = (v, h = 1) => v.toFixed(h).replace('.', ',');

// --- (1) Hero + tezgâh ekranı ----------------------------------------------------------------
const ekranHtml = () => `
  <div class="dz-ekran" aria-hidden="true">
    <p class="dz-ekran__ust"><span class="dz-led"></span>Tezgâh <b>Tam yük</b><span class="dz-ekran__rpm" data-rpm>1000 d/d</span></p>
    <div class="dz-ekran__tupler">${[0.72, 0.7, 0.46, 0.71].map((p, i) => `<span class="dz-mini${i === 2 ? ' is-dis' : ''}" style="--p:${p};--g:${i * 0.37}s"><i></i></span>`).join('')}</div>
    <p class="dz-ekran__alt"><span>E1</span><span>E2</span><span class="is-dis">E3</span><span>E4</span></p>
    <p class="dz-ekran__deger"><b data-debi>58,2</b><small>mm³/strok · E<span data-enj>1</span></small></p>
  </div>`;

export const hero = {
  render(d, ctx, sorgu) {
    return BOLUMLER.hero.render(d, ctx, sorgu).replace('</figure>', `${ekranHtml()}</figure>`);
  },
  mount(el) {
    const debi = el.querySelector('[data-debi]');
    const enj = el.querySelector('[data-enj]');
    const rpm = el.querySelector('[data-rpm]');
    if (!debi) return;
    const degerler = [58.2, 57.6, 41.9, 58.8];
    let i = 0;
    let t = null;
    const tik = () => {
      i = (i + 1) % 4;
      const v = degerler[i] + (Math.random() - 0.5) * 0.6;
      debi.textContent = virgul(v);
      enj.textContent = String(i + 1);
      debi.parentElement.classList.toggle('is-dis', i === 2);
      rpm.textContent = `${1000 + Math.round((Math.random() - 0.5) * 16)} d/d`;
    };
    if (reducedMotion) return;
    let io;
    const dur = () => { clearInterval(t); t = null; };
    const tikGuvenli = () => { if (!el.isConnected) { dur(); io.disconnect(); return; } tik(); };
    io = new IntersectionObserver(([e]) => (e.isIntersecting ? (t ||= setInterval(tikGuvenli, 1100)) : dur()), { rootMargin: '60px' });
    io.observe(el);
  },
};

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
    ozet: 'Rölantide bir silindir eksik yakıt alıyor. Tam yükte fark az, rölantide belirgin.',
    ariza: { 2: { tam: 0.95, kismi: 0.86, rolanti: 0.62 } },
  },
  {
    id: 'duman', mod: 'tam', ad: 'Siyah duman, yakıt kokusu',
    ozet: 'Bir enjektör fazla yakıt veriyor, memesi damlatıyor olabilir. Geri dönüşü de yüksek.',
    ariza: { 1: { tam: 1.17, kismi: 1.2, rolanti: 1.34, donus: 1.9 } },
  },
  {
    id: 'zor', mod: 'donus', ad: 'Sabah zor çalışıyor',
    ozet: 'İki enjektörün geri dönüşü yüksek; rail basıncı marşta toplanamıyor.',
    ariza: { 0: { donus: 2.45 }, 3: { donus: 2.2, rolanti: 0.84 } },
  },
  {
    id: 'tuketim', mod: 'tam', ad: 'Yakıt tüketimi arttı',
    ozet: 'İki enjektör tam yükte aralığın üstünde. Temizlik ve yeniden ölçümle genelde düzelir.',
    ariza: { 1: { tam: 1.1, kismi: 1.08 }, 3: { tam: 1.09 } },
  },
  {
    id: 'kontrol', mod: 'tam', ad: 'Şikâyet yok, kontrol',
    ozet: 'Bütün enjektörler aralıkta. Yerlerine takılır, parası boşa gitmez.',
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
    <p class="dz-tup__deger"><b>0,0</b></p>
    <div class="dz-tup__cam">
      <span class="dz-tup__bant"></span>
      <span class="dz-tup__sivi"></span>
      <span class="dz-tup__yuzey"></span>
    </div>
    <p class="dz-tup__ad">E${i + 1}</p>
  </div>`;

export const tezgah = {
  render(d) {
    return `
      <section class="k-bolum dz-tz" aria-labelledby="dz-tz-baslik">
        <div class="k-kap">
          <div class="dz-tz__bas">
            <p class="dz-etiket dz-etiket--acik">Test tezgâhı · örnek ölçüm</p>
            <h2 class="k-h2" id="dz-tz-baslik" data-bol>Şikâyeti seçin, tezgâhı çalıştıralım.</h2>
            <p class="k-lead">Her enjektör kendi menzürüne püskürtür. Yeşil bant üreticinin verdiği aralık; dışına çıkan enjektör hangisiyse işlem onu bekler, gerisi yerine takılır.</p>
          </div>
          <div class="dz-tz__cipler" role="group" aria-label="Şikâyet seçin" data-lenis-prevent>
            ${SIKAYETLER.map((s, i) => `<button type="button" class="dz-cip" data-s="${s.id}" aria-pressed="${i === 0}">${esc(s.ad)}</button>`).join('')}
          </div>
          <div class="dz-tz__ic">
            <div class="dz-tezgah">
              <div class="dz-tezgah__ust">
                <div class="dz-sekme" role="group" aria-label="Ölçüm modu">
                  ${MODLAR.map((m, i) => `<button type="button" data-m="${m.id}" aria-pressed="${i === 0}">${esc(m.ad)}</button>`).join('')}
                </div>
                <div class="dz-sekme dz-sekme--adet" role="group" aria-label="Enjektör sayısı">
                  <button type="button" data-a="4" aria-pressed="true">4 · binek</button>
                  <button type="button" data-a="6" aria-pressed="false">6 · ağır vasıta</button>
                </div>
              </div>
              <div class="dz-tezgah__olcek" aria-hidden="true"><span data-olcek-ust></span><span data-olcek-birim>mm³/strok</span></div>
              <div class="dz-tezgah__tupler" data-adet="4">${Array.from({ length: 6 }, (_, i) => tupHtml(i)).join('')}</div>
              <div class="dz-tezgah__alt">
                <p class="dz-hukum" aria-live="polite"></p>
                <button type="button" class="dz-calistir"><span class="dz-led"></span>Tezgâhı yeniden çalıştır</button>
              </div>
            </div>
            <article class="dz-cikti" aria-live="polite">
              <div class="dz-cikti__kagit"></div>
            </article>
          </div>
          <p class="dz-tz__not">Değerler örnektir; gerçek aralık enjektörün tipine göre üretici tablosundan okunur. Fiyatı ölçümden sonra, işe başlamadan söyleriz.</p>
        </div>
      </section>`;
  },
  mount(el, d) {
    const tupler = [...el.querySelectorAll('.dz-tup')];
    const kutu = el.querySelector('.dz-tezgah__tupler');
    const kagit = el.querySelector('.dz-cikti__kagit');
    const hukum = el.querySelector('.dz-hukum');
    const olcekUst = el.querySelector('[data-olcek-ust]');
    const tezgahEl = el.querySelector('.dz-tezgah');
    let sikayet = SIKAYETLER[0];
    let mod = MODLAR[0];
    let adet = 4;
    let calisti = false;
    let tl = null;

    const bugun = new Date();
    const tarih = `${String(bugun.getDate()).padStart(2, '0')}.${String(bugun.getMonth() + 1).padStart(2, '0')}.${bugun.getFullYear()}`;

    const cikti = (sonuclar, m) => {
      const h = m.hane ?? (m.max > 20 ? 1 : 2);
      const aralik = m.id === 'donus' ? `≤ ${virgul(m.ust, 0)}` : `${virgul(m.hedef - m.tol, h)}–${virgul(m.hedef + m.tol, h)}`;
      const islem = sonuclar.filter((s) => s.karar.kod !== 'uygun');
      const mesaj = `Merhaba ${d.isletme.ad}, aracımda şu şikâyet var: ${sikayet.ad.toLowerCase()}. Enjektörleri tezgâhta ölçtürmek istiyorum. Aracım: `;
      return `
        <header class="dz-cikti__bas">
          <p class="dz-cikti__firma">${esc(d.isletme.ad)}</p>
          <p>Enjektör test çıktısı · örnek</p>
          <p>${tarih} · ${adet} enjektör · ${esc(m.kisa)}</p>
        </header>
        <p class="dz-cikti__sikayet"><span>Şikâyet</span>${esc(sikayet.ad)}</p>
        <table class="dz-cikti__tablo">
          <thead><tr><th>Enj.</th><th>Ölçülen</th><th>Aralık</th><th>Sonuç</th></tr></thead>
          <tbody>
            ${sonuclar.map((s) => {
              const r = s.sonuc[m.id];
              return `<tr class="${r.gecti ? '' : 'is-dis'}"><td>E${s.no}</td><td>${virgul(r.v, h)}</td><td>${aralik}</td><td>${r.gecti ? 'Tutuyor' : 'Tutmuyor'}</td></tr>`;
            }).join('')}
          </tbody>
        </table>
        <p class="dz-cikti__ara">Karar (bütün modlara göre)</p>
        <ul class="dz-cikti__karar">
          ${sonuclar.map((s) => `<li class="k-${s.karar.kod}"><span>E${s.no}</span><b>${esc(s.karar.ad)}</b><small>${esc(s.karar.not)}</small></li>`).join('')}
        </ul>
        <p class="dz-cikti__ozet">${esc(sikayet.ozet)}</p>
        <p class="dz-cikti__toplam">${islem.length ? `${adet} enjektörden <b>${islem.length}</b> tanesi işlem istiyor.` : `${adet} enjektörün <b>hepsi</b> aralıkta.`}</p>
        <a class="k-btn dz-cikti__btn" href="${waHref(d, mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu şikâyetle yazın</span></a>`;
    };

    const calistir = (animasyon = true) => {
      const m = olcekliMod(mod, adet === 6);
      const sonuclar = olc(sikayet, adet, adet === 6);
      kutu.dataset.adet = String(adet);
      tezgahEl.dataset.mod = mod.id;
      const h = m.hane ?? (m.max > 20 ? 1 : 2);
      olcekUst.textContent = `${virgul(m.max, 0)} mm³`;
      tl?.kill();
      tl = gsap.timeline();
      tupler.forEach((t, i) => {
        const var_ = i < adet;
        t.hidden = !var_;
        if (!var_) return;
        const r = sonuclar[i].sonuc[mod.id];
        const bantAlt = m.id === 'donus' ? 0 : (m.hedef - m.tol) / m.max;
        const bantUst = m.id === 'donus' ? m.ust / m.max : (m.hedef + m.tol) / m.max;
        t.style.setProperty('--b0', bantAlt.toFixed(3));
        t.style.setProperty('--b1', bantUst.toFixed(3));
        t.classList.remove('is-dis', 'is-ok');
        const p = Math.min(r.v / m.max, 1);
        const sivi = t.querySelector('.dz-tup__sivi');
        const yuzey = t.querySelector('.dz-tup__yuzey');
        const deger = t.querySelector('.dz-tup__deger b');
        const son = () => t.classList.add(r.gecti ? 'is-ok' : 'is-dis');
        if (!animasyon || reducedMotion) {
          gsap.set(sivi, { scaleY: p });
          gsap.set(yuzey, { yPercent: 0, bottom: `${p * 100}%` });
          deger.textContent = virgul(r.v, h);
          son();
          return;
        }
        const o = { v: 0 };
        t.classList.add('is-doluyor');
        tl.fromTo(sivi, { scaleY: 0 }, { scaleY: p, duration: 1.5, ease: 'power2.out' }, i * 0.12)
          .fromTo(yuzey, { bottom: '0%' }, { bottom: `${p * 100}%`, duration: 1.5, ease: 'power2.out' }, i * 0.12)
          .fromTo(o, { v: 0 }, { v: r.v, duration: 1.5, ease: 'power2.out', onUpdate: () => (deger.textContent = virgul(o.v, h)) }, i * 0.12)
          .add(() => { t.classList.remove('is-doluyor'); son(); }, i * 0.12 + 1.5);
      });
      const islem = sonuclar.filter((s) => s.karar.kod !== 'uygun').length;
      hukum.innerHTML = islem
        ? `<b>${adet}</b> enjektörden <b class="is-dis">${islem}</b> tanesi işlem istiyor, <b>${adet - islem}</b> tanesi yerine takılır.`
        : `<b>${adet}</b> enjektörün hepsi aralıkta. Değişime gerek yok.`;
      kagit.innerHTML = cikti(sonuclar, m);
      if (animasyon && !reducedMotion) {
        tl.fromTo(kagit, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.4, ease: 'steps(18)' }, 0.6)
          .fromTo(kagit, { y: -24 }, { y: 0, duration: 1.4, ease: 'steps(18)' }, 0.6);
      } else gsap.set(kagit, { clipPath: 'none', y: 0 });
    };

    const bas = (sel, attr, fn) =>
      el.querySelectorAll(sel).forEach((b) =>
        b.addEventListener('click', () => {
          b.parentElement.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          fn(b.dataset[attr]);
          calistir();
        })
      );
    const modSec = (id) => {
      mod = MODLAR.find((m) => m.id === id) || MODLAR[0];
      el.querySelectorAll('[data-m]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.m === mod.id)));
    };
    bas('.dz-cip', 's', (v) => { sikayet = SIKAYETLER.find((s) => s.id === v); modSec(sikayet.mod); });
    bas('.dz-sekme:not(.dz-sekme--adet) button', 'm', (v) => (mod = MODLAR.find((m) => m.id === v)));
    bas('.dz-sekme--adet button', 'a', (v) => (adet = Number(v)));
    el.querySelector('.dz-calistir').addEventListener('click', () => calistir());

    // İlk çalıştırma: tezgâh görünür olunca.
    modSec(sikayet.mod);
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

// --- (3) Hizmet özeti: ölçü föyü --------------------------------------------------------------
export const hizmetOzet = {
  render(d, { tema }) {
    const list = (d.hizmetler || []).slice(0, 6);
    if (!list.length) return '';
    return `
      <section class="k-bolum dz-hf">
        <div class="k-kap">
          <div class="k-bolum__bas">
            <div><p class="dz-etiket">İş föyü</p><h2 class="k-h2" data-bol>${esc(d.kurumsal?.hizmetOzetBaslik || tema.hizmetEtiketi)}</h2></div>
            <a class="k-link" href="#/hizmetler" data-rota="hizmetler">Bütün işler ${ok}</a>
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

// --- (4) Atölye: saatler + konum ---------------------------------------------------------------
export const atolye = {
  render(d) {
    if (!d.saatler) return '';
    const st = openStatus(d.saatler);
    const bugun = new Date().getDay();
    const bugunSaat = d.saatler[bugun];
    return `
      <section class="k-bolum dz-at" aria-labelledby="dz-at-baslik">
        <div class="k-kap dz-at__ic">
          <div class="dz-at__sol">
            <p class="dz-etiket">Atölye</p>
            <h2 class="k-h2" id="dz-at-baslik" data-bol>Enjektörü sabah getirin, akşam çıktısıyla alın.</h2>
            <div class="dz-at__durum ${st.open ? 'is-acik' : ''}">
              <span class="dz-led"></span>
              <div><b>${esc(st.text)}</b><small>Bugün ${GUNLER[bugun]}${bugunSaat ? `, ${esc(bugunSaat.replace('-', ' – '))}` : ', kapalı'}</small></div>
            </div>
            <dl class="dz-at__saatler">${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}</dl>
            <p class="dz-at__adres">${esc(d.iletisim.adres)}</p>
            <div class="k-butonlar">
              <a class="k-btn" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
          <div class="dz-at__harita" data-q="${esc(mapsEmbed(d))}"><p>Harita yaklaşınca yüklenir</p></div>
        </div>
      </section>`;
  },
  mount(el) {
    const h = el.querySelector('.dz-at__harita');
    const io = new IntersectionObserver((e) => {
      if (!e[0].isIntersecting) return;
      h.innerHTML = `<iframe title="Konum haritası" src="${h.dataset.q}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      io.disconnect();
    }, { rootMargin: '300px' });
    io.observe(h);
  },
};
