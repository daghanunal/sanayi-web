// Sektör modülleri ("Ölçü Karnesi"):
// (1) hero: motorun hero'su + başlığın altında kaydırdıkça kayan mikrometre cetveli + fotoğrafta ölçü etiketi
// (2) karne: revizyon karnesi. "Geldiği gibi" / "Teslimde" arasında geçiş; ibreler tolerans bandında kayar,
//     tarama çizgisi kartın üstünden geçer, sonunda damga basılır. Değerler örnektir (kartta yazıyor).
// (3) sebep: turboyu bitiren dört sebep ve her birinde neye baktığımız
// (4) atolye: bugün açık mı, saatler, adres, yaklaşınca yüklenen harita
import { esc, telHref, mapsHref, mapsEmbed, openStatus, groupedHours, GUNLER, icons, gsap, reducedMotion } from '../../shared/core.js';
import { BOLUMLER } from '../_kurumsal/bolumler.js';

const virgul = (v, h = 2) => v.toFixed(h).replace('.', ',');

// --- (1) Hero ---------------------------------------------------------------------------------
const cetvel = () => {
  const cizgi = [];
  for (let i = 0; i <= 240; i++) {
    const x = i * 10;
    const boy = i % 10 === 0 ? 26 : i % 5 === 0 ? 17 : 10;
    cizgi.push(`<line x1="${x}" y1="0" x2="${x}" y2="${boy}"/>`);
    if (i % 10 === 0) cizgi.push(`<text x="${x + 4}" y="38">${i / 10}</text>`);
  }
  return `<div class="tk-cetvel" aria-hidden="true"><svg viewBox="0 0 2400 44" preserveAspectRatio="xMinYMin meet"><g>${cizgi.join('')}</g></svg><span class="tk-cetvel__ok"></span></div>`;
};

export const hero = {
  render(d, ctx, sorgu) {
    const html = BOLUMLER.hero.render(d, ctx, sorgu);
    const etiket = `
      <figcaption class="tk-etiket" aria-hidden="true">
        <span class="tk-etiket__ust">Eksenel boşluk · teslimde</span>
        <b><span data-mm>0,00</span> mm</b>
        <span class="tk-etiket__alt"><i></i>Sınır içinde</span>
      </figcaption>`;
    return html
      .replace('<figure class="k-hero__gorsel"', `${cetvel()}<figure class="k-hero__gorsel"`)
      .replace('</figure>', `${etiket}</figure>`);
  },
  mount(el) {
    const mm = el.querySelector('[data-mm]');
    const g = el.querySelector('.tk-cetvel g');
    if (reducedMotion) {
      if (mm) mm.textContent = '0,05';
      return;
    }
    const o = { v: 0.19 };
    const yaz = () => { if (mm) mm.textContent = virgul(o.v); };
    yaz();
    gsap.fromTo(el.querySelector('.tk-etiket'), { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .8, delay: 1.1, ease: 'power3.out' });
    gsap.to(o, { v: 0.05, duration: 1.6, delay: 1.3, ease: 'power2.inOut', onUpdate: yaz });
    if (g) {
      gsap.fromTo(g, { x: 0 }, {
        x: -420, ease: 'none', immediateRender: false,
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: .5 },
      });
    }
  },
};

// --- (2) Revizyon karnesi --------------------------------------------------------------------
// yon: 'alt' → küçük değer iyi (sınırın altı yeşil), 'ust' → büyük değer iyi.
const OLCULER = [
  { ad: 'Mil eksenel boşluğu', birim: 'mm', sinir: 0.10, max: 0.25, once: 0.19, sonra: 0.05, yon: 'alt', h: 2 },
  { ad: 'Mil radyal boşluğu', birim: 'mm', sinir: 0.45, max: 0.80, once: 0.66, sonra: 0.31, yon: 'alt', h: 2 },
  { ad: 'Çark grubu dengesizliği', birim: 'g·mm', sinir: 0.6, max: 2.4, once: 1.9, sonra: 0.3, yon: 'alt', h: 1 },
  { ad: 'VNT kanat hareketi', durum: true, once: 'Takılıyor', sonra: 'Serbest' },
  { ad: 'Yağ dönüş hattı', durum: true, once: 'Tıkalı', sonra: 'Yenilendi' },
  { ad: 'Takviye basıncı, yol denemesi', birim: 'bar', sinir: 1.6, max: 2.2, once: 0.9, sonra: 1.8, yon: 'ust', h: 1 },
];

const satir = (o, i) => {
  if (o.durum) {
    return `
      <li class="tk-s tk-s--durum" data-i="${i}">
        <span class="tk-s__ad">${esc(o.ad)}</span>
        <span class="tk-s__durum"><i></i><b data-durum>${esc(o.once)}</b></span>
      </li>`;
  }
  const s = (o.sinir / o.max) * 100;
  const bant = o.yon === 'alt' ? `left:0;width:${s}%` : `left:${s}%;width:${100 - s}%`;
  return `
    <li class="tk-s" data-i="${i}">
      <span class="tk-s__ad">${esc(o.ad)}</span>
      <span class="tk-s__deger"><b data-deger>${virgul(o.once, o.h)}</b> ${esc(o.birim)}</span>
      <span class="tk-s__bar">
        <span class="tk-s__bant" style="${bant}"></span>
        <span class="tk-s__sinir" style="left:${s}%"><em>${o.yon === 'alt' ? 'en çok' : 'en az'} ${virgul(o.sinir, o.h)}</em></span>
        <span class="tk-s__ibre" style="left:${(o.once / o.max) * 100}%"></span>
      </span>
    </li>`;
};

export const karne = {
  render(d) {
    const bugun = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `
      <section class="k-bolum tk-karne" aria-labelledby="tk-karne-b">
        <div class="k-kap tk-karne__ic">
          <div class="tk-karne__sol">
            <p class="tk-ust">Revizyon karnesi</p>
            <h2 class="k-h2" id="tk-karne-b" data-bol>Her turbo bir karneyle teslim edilir.</h2>
            <p class="k-lead">Söktüğümüz turbonun ölçülerini geldiği haliyle yazarız, revizyondan sonra yeniden ölçeriz. İki sütunu yan yana görürsünüz; neyi neden değiştirdiğimiz kâğıtta durur.</p>
            <div class="tk-anahtar" role="group" aria-label="Karne görünümü">
              <button type="button" data-g="once" aria-pressed="true">Geldiği gibi</button>
              <button type="button" data-g="sonra" aria-pressed="false">Teslimde</button>
              <span class="tk-anahtar__iz" aria-hidden="true"></span>
            </div>
            <a class="k-link tk-karne__link" href="#/iletisim?konu=${encodeURIComponent('Turbo revizyonu')}" data-rota="iletisim">Turbomu ölçtürmek istiyorum <svg class="k-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
          </div>
          <article class="tk-kart" data-g="once" aria-live="polite">
            <header class="tk-kart__bas">
              <div><b>${esc(d.isletme.ad)}</b><span>Turbo revizyon karnesi</span></div>
              <dl><div><dt>Tarih</dt><dd>${esc(bugun)}</dd></div><div><dt>Turbo</dt><dd>VNT'li dizel</dd></div></dl>
            </header>
            <p class="tk-kart__durum"><span data-baslik>Geldiği gibi</span><em data-ozet>3 ölçü sınır dışında</em></p>
            <ol class="tk-kart__liste">${OLCULER.map(satir).join('')}</ol>
            <footer class="tk-kart__alt">
              <p>Ölçüler örnektir; her turbonun kendi değerleri kendi karnesine yazılır ve size fotoğrafla gönderilir.</p>
              <span class="tk-damga" aria-hidden="true"><span data-damga>Sebep aranıyor</span></span>
            </footer>
            <span class="tk-tarama" aria-hidden="true"></span>
          </article>
        </div>
      </section>`;
  },
  mount(el) {
    const kart = el.querySelector('.tk-kart');
    const sec = el.querySelector('.tk-karne');
    const tuslar = [...el.querySelectorAll('.tk-anahtar button')];
    const satirlar = [...kart.querySelectorAll('.tk-s')];
    const damga = kart.querySelector('.tk-damga');
    const baslik = kart.querySelector('[data-baslik]');
    const ozet = kart.querySelector('[data-ozet]');
    let simdi = 'once';
    let dokunuldu = false;

    const iyiMi = (o, v) => (o.durum ? v === o.sonra : o.yon === 'alt' ? v <= o.sinir : v >= o.sinir);

    const uygula = (g, anim = true) => {
      simdi = g;
      kart.dataset.g = g;
      sec.dataset.g = g;
      tuslar.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.g === g)));
      baslik.textContent = g === 'once' ? 'Geldiği gibi' : 'Teslimde';
      const kotu = OLCULER.filter((o) => !iyiMi(o, o[g])).length;
      ozet.textContent = kotu ? `${kotu} ölçü sınır dışında` : 'Bütün ölçüler sınır içinde';
      kart.querySelector('[data-damga]').textContent = g === 'once' ? 'Sebep aranıyor' : 'Teslime hazır';
      const sure = anim && !reducedMotion ? 1 : 0;
      satirlar.forEach((li, i) => {
        const o = OLCULER[i];
        const v = o[g];
        const gecikme = sure ? i * 0.11 : 0;
        const iyi = iyiMi(o, v);
        const isaretle = () => { li.classList.toggle('is-iyi', iyi); li.classList.toggle('is-kotu', !iyi); };
        if (sure) gsap.delayedCall(gecikme + sure * 0.4, isaretle); else isaretle();
        if (o.durum) {
          li.querySelector('[data-durum]').textContent = v;
          return;
        }
        const ibre = li.querySelector('.tk-s__ibre');
        const yazi = li.querySelector('[data-deger]');
        const n = { v: parseFloat(yazi.textContent.replace(',', '.')) };
        gsap.to(ibre, { left: `${(v / o.max) * 100}%`, duration: sure * 1.1, delay: gecikme, ease: 'power3.inOut' });
        gsap.to(n, { v, duration: sure * 1.1, delay: gecikme, ease: 'power3.inOut', onUpdate: () => { yazi.textContent = virgul(n.v, o.h); } });
      });
      if (sure) {
        gsap.fromTo(kart.querySelector('.tk-tarama'), { yPercent: 0, autoAlpha: 1 }, { yPercent: 100, duration: 1.1, ease: 'power2.inOut', onComplete: () => gsap.set(kart.querySelector('.tk-tarama'), { autoAlpha: 0 }) });
        gsap.fromTo(damga, { scale: 1.8, rotation: -24, autoAlpha: 0 }, { scale: 1, rotation: -9, autoAlpha: 1, duration: .45, delay: 1.25, ease: 'back.out(2.4)' });
      }
    };

    uygula('once', false);
    tuslar.forEach((b) => b.addEventListener('click', () => { dokunuldu = true; if (b.dataset.g !== simdi) uygula(b.dataset.g); }));

    if (reducedMotion) return;
    gsap.set(damga, { autoAlpha: 0 });
    gsap.from(kart, {
      y: 60, rotation: 1.5, autoAlpha: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: kart, start: 'top 85%', once: true },
    });
    // Kart ekranın ortasına gelince bir kez kendiliğinden "Teslimde"ye geçer.
    gsap.timeline({ scrollTrigger: { trigger: kart, start: 'top 45%', once: true } })
      .call(() => gsap.fromTo(damga, { scale: 1.8, rotation: -24, autoAlpha: 0 }, { scale: 1, rotation: -9, autoAlpha: 1, duration: .45, ease: 'back.out(2.4)' }))
      .call(() => { if (!dokunuldu && simdi === 'once') uygula('sonra'); }, null, 1.6);
  },
};

// --- (3) Turboyu bitiren sebepler ------------------------------------------------------------
const SEBEPLER = [
  { b: 'Yağsız kalma', m: 'Soğuk motorla yüklenmek, düşük yağ seviyesi, geç gelen yağ basıncı. Mil yatakları dakikalar içinde yanar.', k: 'Yağ basıncı ve besleme borusu' },
  { b: 'Kirli yağ', m: 'Geç değişen yağ ve filtre, yatakların arasına zımpara gibi girer. Mil boşluğu büyür, çark gövdeye sürter.', k: 'Yağ, filtre, süzgeç ve banjo cıvataları' },
  { b: 'Tıkalı dönüş hattı', m: 'Dönüş borusu ya da karter havalandırması tıkanınca yağ turboda kalır; keçelerden sızar, egzozdan mavi duman çıkar.', k: 'Dönüş hattı ve karter havalandırması' },
  { b: 'Yabancı cisim', m: 'Hava filtresinden kaçan bir parça ya da motordan gelen bir kırıntı çark kanatlarını yer. Islık sesi buradan başlar.', k: 'Hava filtresi, emme hattı ve intercooler' },
];

export const sebep = {
  render() {
    return `
      <section class="k-bolum tk-sebep" aria-labelledby="tk-sebep-b">
        <div class="k-kap">
          <div class="k-bolum__bas">
            <div>
              <p class="tk-ust">Sebep bulunmadan turbo takılmaz</p>
              <h2 class="k-h2" id="tk-sebep-b" data-bol>Turboyu çoğu zaman turbonun kendisi bitirmez.</h2>
            </div>
          </div>
          <ol class="tk-sebep__liste" data-sira>
            ${SEBEPLER.map((s, i) => `
              <li>
                <span class="tk-sebep__no">${String(i + 1).padStart(2, '0')}</span>
                <h3 class="k-h3">${esc(s.b)}</h3>
                <p>${esc(s.m)}</p>
                <p class="tk-sebep__bak"><span>Baktığımız yer</span>${esc(s.k)}</p>
              </li>`).join('')}
          </ol>
        </div>
      </section>`;
  },
};

// --- (4) Atölye ------------------------------------------------------------------------------
export const atolye = {
  render(d) {
    if (!d.saatler) return '';
    const st = openStatus(d.saatler);
    const bugun = new Date().getDay();
    const bugunSaat = d.saatler[bugun];
    return `
      <section class="k-bolum tk-atolye" aria-labelledby="tk-atolye-b">
        <div class="k-kap tk-atolye__ic">
          <div>
            <p class="tk-ust">Atölye</p>
            <h2 class="k-h2" id="tk-atolye-b" data-bol>Turboyu getirin, beklerken ölçelim.</h2>
            <div class="tk-lamba ${st.open ? 'is-acik' : ''}">
              <span class="tk-lamba__led" aria-hidden="true"></span>
              <div><b>${esc(st.text)}</b><small>Bugün ${GUNLER[bugun]}${bugunSaat ? `, ${esc(bugunSaat.replace('-', ' – '))}` : ', kapalı'}</small></div>
            </div>
            <dl class="tk-saatler">${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}</dl>
            <p class="tk-adres">${esc(d.iletisim.adres)}</p>
            <div class="k-butonlar">
              <a class="k-btn" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
          <div class="tk-harita" data-q="${esc(mapsEmbed(d))}"><p>Harita yaklaşınca yüklenir</p></div>
        </div>
      </section>`;
  },
  mount(el) {
    const h = el.querySelector('.tk-harita');
    const io = new IntersectionObserver((e) => {
      if (!e[0].isIntersecting) return;
      h.innerHTML = `<iframe title="Konum haritası" src="${h.dataset.q}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      io.disconnect();
    }, { rootMargin: '300px' });
    io.observe(h);
  },
};
