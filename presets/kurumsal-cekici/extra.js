// Sektör modülleri (kurumsal-cekici, "Reflektör" yönü):
// (1) hero: tam ekran fotoğraf + karayolu levhası (Şaşmaz'dan mesafeler) + dönen tepe lambası; ilk düğme "Ara".
// (2) serit: reflektif şerit (çapraz çizgili) üstünde kayan iş listesi. CSS animasyonu, ekran dışında durur.
// (3) cagri: "Çağrı masası". Neredesiniz → şematik Ankara haritasında çekici Şaşmaz'dan yola çıkar;
//     Ne oldu → gelecek araç, süre, beklerken yapılacaklar; konum eklenmiş hazır WhatsApp mesajı.
// (4) nobet: canlı saat + "hat açık" + adres, yaklaşınca yüklenen harita.
// (5) iletisim: motorun iletişim bölümü; 00:00-24:00 saatleri "7/24 açık" diye yazılır.
// (6) cta: dev telefon numarası; birincil düğme arama.
import { esc, waHref, telHref, mapsHref, mapsEmbed, icons, gsap, reducedMotion } from '../../shared/core.js';
import { BOLUMLER } from '../_kurumsal/bolumler.js';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(MotionPathPlugin, DrawSVGPlugin);

const k = (d) => d.kurumsal || {};
const yirmiDort = (d) => d.yediYirmiDort || (d.saatler || []).every((s) => s === '00:00-24:00');
const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ikon = {
  kamyon: `<svg viewBox="0 0 48 28" aria-hidden="true"><path d="M2 20V9h18v11M20 13h9l5 7M2 20h40l-3-8H24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="10" cy="22" r="3.6" fill="currentColor"/><circle cx="34" cy="22" r="3.6" fill="currentColor"/></svg>`,
  ok: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V5M5 11l7-7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  konum: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/></svg>`,
};

// --- (1) Hero -------------------------------------------------------------------------------
// Levha satırları: [yön derecesi (0 = yukarı), yer, km]. Mesafeler Şaşmaz'dan yaklaşık karayolu mesafesi.
const LEVHA = [
  [0, 'Kızılay', 20],
  [35, 'Esenboğa', 45],
  [-90, 'Sincan', 14],
  [-135, 'Polatlı', 70],
];

export const hero = {
  render(d, { tema }) {
    const h = k(d).hero || {};
    const bilgi = (h.bilgi || []).map(([e, v]) => `<div><dt>${esc(e)}</dt><dd>${esc(v)}</dd></div>`).join('');
    const mesaj = `Merhaba ${d.isletme.ad}, yolda kaldım. Konumum: `;
    return `
      <section class="k-hero hz-hero" aria-label="Giriş">
        <figure class="k-hero__gorsel" data-perde><div class="k-hero__gorsel-ic" data-paralaks><img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high"></div></figure>
        <div class="k-kap k-hero__ic">
          <div class="k-hero__metin">
            <p class="k-hero__ust"><span class="hz-lamba" aria-hidden="true"><i></i></span>${esc(h.ust || d.isletme.sektor)}</p>
            <h1 class="k-h1 k-hero__baslik" data-bol>${esc(h.baslik || d.isletme.slogan)}</h1>
            <p class="k-lead">${esc(h.metin || d.isletme.hakkinda)}</p>
            <div class="k-butonlar">
              <a class="k-btn hz-ara" href="${telHref(d)}">${icons.phone}<span><small>${esc(h.birincil || 'Çekici çağır')}</small>${esc(d.iletisim.telefon)}</span></a>
              ${d.iletisim.whatsapp ? `<a class="k-btn k-btn--ikincil" href="${waHref(d, mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan konum at</span></a>` : ''}
            </div>
          </div>
          <aside class="hz-levha" aria-label="Şaşmaz'dan yaklaşık mesafeler">
            <p class="hz-levha__bas">Şaşmaz çıkışlı</p>
            <ul>${LEVHA.map(([a, yer, km]) => `<li><span class="hz-levha__ok" style="--a:${a}deg">${ikon.ok}</span><span class="hz-levha__yer">${esc(yer)}</span><span class="hz-levha__km">${km}<small> km</small></span></li>`).join('')}</ul>
          </aside>
        </div>
        ${bilgi ? `<div class="k-kap"><dl class="k-hero__bilgi">${bilgi}</dl></div>` : ''}
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    gsap.from(el.querySelectorAll('.hz-levha, .hz-levha li'), { x: 40, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', delay: 0.9 });
    gsap.from(el.querySelectorAll('.k-hero__bilgi > div'), { y: 18, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', delay: 1.1 });
    gsap.from(el.querySelectorAll('.k-hero .k-lead, .k-hero .k-butonlar, .k-hero__ust'), { y: 16, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out', delay: 0.7 });
  },
};

// --- (2) Reflektif şerit --------------------------------------------------------------------
export const serit = {
  render(d) {
    const isler = (d.hizmetler || []).map((h) => h.baslik);
    if (!isler.length) return '';
    const grup = isler.map((x) => `<span>${esc(x)}</span><b aria-hidden="true">//</b>`).join('');
    return `
      <div class="hz-serit" aria-label="Yaptığımız işler">
        <div class="hz-serit__yol"><div class="hz-serit__ic">${grup}${grup.replace(/<span>/g, '<span aria-hidden="true">')}</div></div>
      </div>`;
  },
  mount(el) {
    const s = el.querySelector('.hz-serit');
    if (!s) return;
    const io = new IntersectionObserver(([e]) => s.classList.toggle('is-akiyor', e.isIntersecting));
    io.observe(s);
  },
};

// --- (3) Çağrı masası -----------------------------------------------------------------------
// Şematik harita (ölçeksiz). Merkez Kızılay (430,270), çevre yolu elips: rx 220, ry 180.
const M = { x: 430, y: 270, rx: 220, ry: 180 };
const halka = (t) => [M.x + M.rx * Math.cos(t), M.y + M.ry * Math.sin(t)];
const TS = Math.PI + 0.08; // Şaşmaz çevre yolunun batısında
const S = halka(TS);
const KZ = [M.x, M.y];

// Rota: 'h' + açı = çevre yolunda o açıya kadar git; dizi = düz nokta.
const YERLER = [
  { id: 'kizilay', ad: 'Kızılay', km: 20, rota: [KZ], pin: KZ },
  { id: 'eryaman', ad: 'Eryaman', km: 7, rota: [[170, 296], [128, 318]], pin: [128, 318] },
  { id: 'sincan', ad: 'Sincan', km: 14, rota: [[140, 250], [70, 244]], pin: [70, 244], al: 'alt' },
  { id: 'batikent', ad: 'Batıkent', km: 12, rota: [['h', Math.PI + 0.75], [258, 124]], pin: [258, 124] },
  { id: 'umitkoy', ad: 'Ümitköy', km: 15, rota: [['h', 2.44], [222, 392]], pin: [222, 392] },
  { id: 'cankaya', ad: 'Çankaya', km: 24, rota: [KZ, [478, 346]], pin: [478, 346] },
  { id: 'kecioren', ad: 'Keçiören', km: 24, rota: [['h', Math.PI * 1.5 + 0.16], [454, 156]], pin: [454, 156] },
  { id: 'mamak', ad: 'Mamak', km: 28, rota: [KZ, [604, 292]], pin: [604, 292] },
  { id: 'golbasi', ad: 'Gölbaşı', km: 32, rota: [['h', Math.PI / 2 - 0.07], [450, 498]], pin: [450, 498] },
  { id: 'esenboga', ad: 'Esenboğa', km: 45, dis: true, rota: [['h', Math.PI * 1.5 + 0.16], [476, 40]], pin: [476, 40], al: 'sol' },
  { id: 'polatli', ad: 'Polatlı yönü', km: 70, dis: true, rota: [['h', 2.44], [150, 405], [40, 462]], pin: [40, 462], al: 'sag' },
];

function rotaYolu(y) {
  const n = [S];
  let t = TS;
  for (const r of y.rota) {
    if (r[0] === 'h') {
      const adim = Math.ceil(Math.abs(r[1] - t) / 0.06);
      for (let i = 1; i <= adim; i++) n.push(halka(t + ((r[1] - t) * i) / adim));
      t = r[1];
    } else n.push(r);
  }
  return 'M' + n.map(([x, yy]) => `${x.toFixed(1)} ${yy.toFixed(1)}`).join(' L');
}

const SORUNLAR = [
  { id: 'calismiyor', ad: 'Araç çalışmıyor', hizmet: 0, arac: 'Kayar kasalı çekici', not: 'Takviye cihazı da yanımızda gelir; akü ise yüklemeden çözeriz.', hazir: ['Dörtlüleri yakın, üçgeni aracın arkasına koyun.', 'Aracın markası, modeli ve vitesi (otomatik mi) önemli; söyleyin.', 'Anahtar ve ruhsat yanınızda olsun.'] },
  { id: 'aku', ad: 'Akü bitti', hizmet: 1, arac: 'Akü takviye aracı', not: 'Aküyü ölçeriz; bitmişse söyleriz, isterseniz yenisini takarız.', hazir: ['Farları ve klimayı kapatın.', 'Kaputun açıldığından emin olun.', 'Kapalı otoparktaysanız kat ve giriş bilgisini yazın.'] },
  { id: 'lastik', ad: 'Lastik patladı', hizmet: 2, arac: 'Yol yardım aracı', not: 'Yedekle yerinde değiştiririz; yedek yoksa en yakın lastikçiye götürürüz.', hazir: ['Aracı düz ve güvenli bir yere çekin, el frenini çekin.', 'Yedek lastiğiniz ve bijon kilidiniz var mı, bakın.', 'Yolcuları bariyerin arkasına alın.'] },
  { id: 'kaza', ad: 'Kaza yaptım', hizmet: 3, arac: 'Kayar kasalı çekici', not: 'Tutanak tamamlandıktan sonra aracı eksperin göreceği servise ya da kaportacınıza taşırız.', hazir: ['Yaralı varsa önce 112’yi arayın.', 'Tutanağı doldurun, aracın ve olay yerinin fotoğrafını çekin.', 'Sigorta poliçe bilginiz elinizin altında olsun.'] },
  { id: 'saplandi', ad: 'Yoldan çıktım, saplandım', hizmet: 6, arac: 'Vinçli kurtarma aracı', not: 'Vinç ve halatla, kaportaya zarar vermeden çıkarırız.', hazir: ['Tekerleri boşa döndürmeyin; daha çok gömülür.', 'Aracın hangi yöne, ne kadar eğik durduğunu söyleyin ya da fotoğraf atın.', 'Araçtan inip güvenli bir yerde bekleyin.'] },
  { id: 'yakit', ad: 'Yakıtım bitti', hizmet: 7, arac: 'Yol yardım aracı', not: 'Sizi en yakın istasyona ulaştıracak kadar yakıt getiririz.', hazir: ['Benzin mi dizel mi, mutlaka söyleyin.', 'Dörtlüleri yakın, emniyet şeridindeyseniz bariyerin arkasına geçin.'] },
  { id: 'agir', ad: 'Ağır vasıta', hizmet: 5, arac: 'Vinçli ağır çekici', not: 'Kamyon, tır, otobüs ve iş makinesi için; iş duruma göre planlanır.', hazir: ['Aracın tipi, tonajı ve yüklü olup olmadığını söyleyin.', 'Devrilme ya da yoldan çıkma varsa fotoğraf atın.', 'Trafik ekipleri olay yerindeyse bilgisini verin.'] },
];

const haritaSvg = () => `
  <svg class="hc-svg" viewBox="0 0 800 520" role="img" aria-labelledby="hc-svg-t">
    <title id="hc-svg-t">Şematik Ankara haritası: Şaşmaz çevre yolunun batısında, seçtiğiniz yere giden yol işaretlenir</title>
    <defs>
      <pattern id="hc-izgara" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" opacity=".22"/></pattern>
    </defs>
    <rect width="800" height="520" fill="url(#hc-izgara)"/>
    <g class="hc-yollar">
      <path d="M0 238 L${S[0].toFixed(0)} ${S[1].toFixed(0)} L430 270"/>
      <path d="M0 512 L430 270"/>
      <path d="M452 520 L430 270"/>
      <path d="M800 302 L430 270"/>
      <path d="M484 0 L430 270"/>
    </g>
    <ellipse class="hc-cevre" cx="${M.x}" cy="${M.y}" rx="${M.rx}" ry="${M.ry}"/>
    <g class="hc-yolad">
      <text x="14" y="204">İstanbul yolu</text>
      <text x="30" y="500" transform="rotate(-29 30 500)">Eskişehir yolu</text>
      <text x="468" y="512">Konya yolu</text>
      <text x="690" y="290">Samsun yolu</text>
      <text x="500" y="46">Esenboğa yolu</text>
      <text x="626" y="160">Çevre yolu</text>
    </g>
    <path class="hc-rota-iz" d=""/>
    <path class="hc-rota" d=""/>
    <g class="hc-pinler">
      ${YERLER.map((y) => `<g class="hc-pin${y.dis ? ' is-dis' : ''}" data-y="${y.id}" transform="translate(${y.pin[0]} ${y.pin[1]})"><circle class="hc-pin__halka" r="14"/><circle class="hc-pin__nokta" r="6"/><text ${y.al === 'alt' ? 'y="34"' : y.al === 'sol' ? 'x="-18" y="8" text-anchor="end" style="text-anchor:end"' : y.al === 'sag' ? 'x="-12" y="-20" text-anchor="start" style="text-anchor:start"' : 'y="-20"'}>${esc(y.ad)}</text></g>`).join('')}
    </g>
    <g class="hc-us" transform="translate(${S[0].toFixed(1)} ${S[1].toFixed(1)})">
      <rect x="-40" y="-40" width="80" height="22" rx="4"/><text y="-25">ŞAŞMAZ</text>
      <circle r="9"/>
    </g>
    <g class="hc-cekici"><circle r="17"/><g transform="translate(-12 -8) scale(.5)">${ikon.kamyon.replace('<svg viewBox="0 0 48 28" aria-hidden="true">', '').replace('</svg>', '')}</g></g>
  </svg>`;

export const cagri = {
  render(d) {
    const ilk = YERLER[0];
    return `
      <section class="k-bolum hc" aria-labelledby="hc-baslik">
        <div class="k-kap">
          <div class="hc__bas">
            <p class="hz-etiket">Çağrı masası</p>
            <h2 class="k-h2" id="hc-baslik" data-bol>Neredesiniz, ne oldu? Gelecek aracı birlikte görelim.</h2>
            <p class="k-lead">İki şey seçin: nerede kaldığınızı ve ne olduğunu. Hangi aracın geleceğini, beklerken ne yapmanız gerektiğini gösterelim; mesajı da sizin yerinize yazalım.</p>
          </div>
          <div class="hc__ic">
            <div class="hc__adim hc__adim--yer">
              <p class="hc__no"><b>1</b>Neredesiniz?</p>
              <div class="hc__cipler" role="group" aria-label="Bulunduğunuz yer" data-lenis-prevent>
                ${YERLER.map((y, i) => `<button type="button" class="hc__cip" data-y="${y.id}" aria-pressed="${i === 0}">${esc(y.ad)}</button>`).join('')}
              </div>
            </div>
            <figure class="hc__harita">
              ${haritaSvg()}
              <figcaption class="hc__mesafe" aria-live="polite"></figcaption>
            </figure>
            <div class="hc__adim hc__adim--sorun">
              <p class="hc__no"><b>2</b>Ne oldu?</p>
              <div class="hc__cipler hc__cipler--sar" role="group" aria-label="Ne oldu">
                ${SORUNLAR.map((s, i) => `<button type="button" class="hc__cip" data-s="${s.id}" aria-pressed="${i === 0}">${esc(s.ad)}</button>`).join('')}
              </div>
            </div>
            <article class="hc__kart" aria-live="polite"></article>
          </div>
          <p class="hc__dipnot">Harita şematiktir, ölçekli değildir. Mesafeler Şaşmaz'dan yaklaşık karayolu mesafesidir; kesin süreyi ve ücreti konumunuzu aldıktan sonra telefonda söyleriz.</p>
        </div>
      </section>`;
  },
  mount(el, d) {
    const svg = el.querySelector('.hc-svg');
    const rota = svg.querySelector('.hc-rota');
    const iz = svg.querySelector('.hc-rota-iz');
    const cekici = svg.querySelector('.hc-cekici');
    const mesafe = el.querySelector('.hc__mesafe');
    const kart = el.querySelector('.hc__kart');
    const yerCip = [...el.querySelectorAll('[data-y].hc__cip')];
    const sorunCip = [...el.querySelectorAll('[data-s]')];
    const pinler = [...svg.querySelectorAll('.hc-pin')];
    let yer = YERLER[0];
    let sorun = SORUNLAR[0];
    let konum = '';
    let tl;

    const yolaCik = (anim) => {
      const yol = rotaYolu(yer);
      rota.setAttribute('d', yol);
      iz.setAttribute('d', yol);
      pinler.forEach((p) => p.classList.toggle('is-secili', p.dataset.y === yer.id));
      tl?.kill();
      if (reducedMotion || !anim) {
        gsap.set(rota, { drawSVG: '100%' });
        gsap.set(cekici, { x: yer.pin[0], y: yer.pin[1] });
        return;
      }
      const sure = 0.9 + Math.min(yer.km, 70) / 40;
      gsap.set(cekici, { x: S[0], y: S[1] });
      tl = gsap.timeline();
      tl.fromTo(rota, { drawSVG: '0%' }, { drawSVG: '100%', duration: sure, ease: 'power1.inOut' }, 0)
        .to(cekici, { motionPath: { path: rota }, duration: sure, ease: 'power1.inOut' }, 0);
    };

    const mesafeYaz = () => {
      mesafe.innerHTML = `<span class="hc__km"><b>${yer.km}</b> km</span><span>Şaşmaz'dan ${esc(yer.ad)}: ${yer.dis ? 'şehir dışı; süreyi mesafeye göre telefonda söyleriz.' : 'Ankara içi, çoğunlukla 30-60 dk.'}</span>`;
    };

    const mesaj = () => `Merhaba ${d.isletme.ad}, ${yer.ad} civarında yolda kaldım. Durum: ${sorun.ad.toLowerCase()}.${konum ? ` Konumum: ${konum}` : ' Konumum: '}`;

    const kartYaz = (anim) => {
      const h = d.hizmetler?.[sorun.hizmet];
      kart.innerHTML = `
        <div class="hc__arac">
          <span class="hc__arac-ikon">${ikon.kamyon}</span>
          <div><p class="hc__kucuk">Size gelecek araç</p><h3>${esc(sorun.arac)}</h3></div>
        </div>
        <p class="hc__not">${esc(sorun.not)}${h?.sure ? ` <b>${esc(h.sure)}.</b>` : ''}</p>
        <p class="hc__kucuk">Beklerken</p>
        <ol class="hc__hazir">${sorun.hazir.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
        <div class="hc__gonder">
          <a class="k-btn" href="${telHref(d)}">${icons.phone}<span>Hemen ara</span></a>
          ${d.iletisim.whatsapp ? `<a class="k-btn k-btn--ikincil hc__wa" href="${waHref(d, mesaj())}" target="_blank" rel="noopener">${icons.whatsapp}<span>Mesajı gönder</span></a>` : ''}
          <button type="button" class="hc__konum" ${konum ? 'data-tamam' : ''}>${ikon.konum}<span>${konum ? 'Konumunuz mesaja eklendi' : 'Konumumu mesaja ekle'}</span></button>
        </div>`;
      if (anim && !reducedMotion) gsap.fromTo(kart.children, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: 'power2.out', overwrite: true });
    };

    const yerSec = (id) => {
      yer = YERLER.find((y) => y.id === id) || yer;
      yerCip.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.y === yer.id)));
      mesafeYaz();
      yolaCik(true);
      kartYaz(false);
    };

    yerCip.forEach((c) => c.addEventListener('click', () => yerSec(c.dataset.y)));
    pinler.forEach((p) => p.addEventListener('click', () => yerSec(p.dataset.y)));
    sorunCip.forEach((c) =>
      c.addEventListener('click', () => {
        sorun = SORUNLAR.find((s) => s.id === c.dataset.s);
        sorunCip.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
        kartYaz(true);
      })
    );
    kart.addEventListener('click', (e) => {
      const b = e.target.closest('.hc__konum');
      if (!b || konum) return;
      if (!navigator.geolocation) {
        b.querySelector('span').textContent = 'Konum alınamadı; mesaja yerinizi yazın';
        return;
      }
      b.querySelector('span').textContent = 'Konum alınıyor…';
      navigator.geolocation.getCurrentPosition(
        (p) => {
          konum = `https://maps.google.com/?q=${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`;
          kartYaz(false);
        },
        () => (b.querySelector('span').textContent = 'Konum izni verilmedi; mesaja yerinizi yazın'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    mesafeYaz();
    kartYaz(false);
    if (reducedMotion) {
      yolaCik(false);
      return;
    }
    rota.setAttribute('d', rotaYolu(yer));
    iz.setAttribute('d', rotaYolu(yer));
    pinler.forEach((p) => p.classList.toggle('is-secili', p.dataset.y === yer.id));
    gsap.set(rota, { drawSVG: '0%' });
    gsap.set(cekici, { x: S[0], y: S[1] });
    // İlk görünüşte: yollar çizilir, pinler düşer, çekici ilk hedefe yola çıkar.
    gsap.timeline({ scrollTrigger: { trigger: svg, start: 'top 75%', once: true } })
      .from(svg.querySelectorAll('.hc-yollar path, .hc-cevre'), { drawSVG: 0, duration: 1.1, stagger: 0.08, ease: 'power2.inOut' })
      .from(svg.querySelectorAll('.hc-pin circle'), { scale: 0, transformOrigin: '50% 50%', duration: 0.35, stagger: 0.02, ease: 'back.out(2.5)' }, 0.6)
      .add(() => yolaCik(true), 1.1);
  },
};

// --- (4) Nöbet: canlı saat + konum ------------------------------------------------------------
const ikiHane = (n) => String(n).padStart(2, '0');

export const nobet = {
  render(d) {
    const acik = yirmiDort(d);
    return `
      <section class="k-bolum hn" aria-labelledby="hn-baslik">
        <div class="k-kap hn__ic">
          <div class="hn__sol">
            <p class="hz-etiket">Nöbet</p>
            <h2 class="k-h2" id="hn-baslik" data-bol>${acik ? 'Saat kaç olursa olsun, telefonu biri açar.' : 'Çalışma saatlerimiz'}</h2>
            <div class="hn__saat" aria-live="off">
              <span class="hn__rakam" data-saat>--:--</span>
              <span class="hn__durum"><span class="hz-lamba" aria-hidden="true"><i></i></span><b>${acik ? 'Hat şu an açık' : ''}</b><small data-gun></small></span>
            </div>
            <dl class="hn__liste">
              <div><dt>Hat</dt><dd>${acik ? 'Her gün 24 saat, bayram dahil' : ''}</dd></div>
              <div><dt>Çıkış noktası</dt><dd>${esc(d.iletisim.adres)}</dd></div>
              <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></dd></div>
            </dl>
            <div class="k-butonlar">
              <a class="k-btn" href="${telHref(d)}">${icons.phone}<span>Çekici çağır</span></a>
              <a class="k-btn k-btn--ikincil" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
            </div>
          </div>
          <div class="hn__harita" data-q="${esc(mapsEmbed(d))}"><p>Harita yaklaşınca yüklenir</p></div>
        </div>
      </section>`;
  },
  mount(el) {
    const saat = el.querySelector('[data-saat]');
    const gun = el.querySelector('[data-gun]');
    const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const yaz = () => {
      const n = new Date();
      saat.textContent = `${ikiHane(n.getHours())}:${ikiHane(n.getMinutes())}`;
      gun.textContent = `${GUN[n.getDay()]}, ${n.getHours() < 6 || n.getHours() >= 22 ? 'gece' : 'gündüz'} fark etmez`;
    };
    yaz();
    const zaman = setInterval(() => (el.isConnected ? yaz() : clearInterval(zaman)), 15000);
    const h = el.querySelector('.hn__harita');
    const io = new IntersectionObserver((e) => {
      if (!e[0].isIntersecting) return;
      h.innerHTML = `<iframe title="Konum haritası" src="${h.dataset.q}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      io.disconnect();
    }, { rootMargin: '300px' });
    io.observe(h);
  },
};

// --- (5) İletişim: 7/24 yazımı ---------------------------------------------------------------
export const iletisim = {
  render(d, ctx, sorgu) {
    return BOLUMLER.iletisim.render(d, ctx, sorgu);
  },
  mount(el, d, ctx, sorgu) {
    BOLUMLER.iletisim.mount?.(el, d, ctx, sorgu);
    if (!yirmiDort(d)) return;
    const durum = el.querySelector('.k-durum');
    if (durum) durum.innerHTML = '<span></span>7/24 açık, şu an hat başında biri var';
    const dl = el.querySelector('.k-saatler dl');
    if (dl) dl.innerHTML = '<div><dt>Her gün</dt><dd>24 saat, bayram dahil</dd></div>';
  },
};

// --- (6) Final çağrı: dev telefon numarası ---------------------------------------------------
export const cta = {
  render(d) {
    const c = k(d).cta || {};
    const mesaj = `Merhaba ${d.isletme.ad}, yolda kaldım. Konumum: `;
    return `
      <section class="k-bolum hz-cta">
        <div class="k-kap">
          <p class="hz-etiket">${esc(c.buton || 'Çekici çağır')}</p>
          <h2 class="k-h2 hz-cta__baslik" data-bol>${esc(c.baslik || 'Arayın.')}</h2>
          <a class="hz-cta__tel" href="${telHref(d)}"><span class="hz-cta__ikon">${icons.phone}</span><span>${esc(d.iletisim.telefon)}</span></a>
          <p class="k-lead">${esc(c.metin || '')}</p>
          <div class="k-butonlar">
            ${d.iletisim.whatsapp ? `<a class="k-btn" href="${waHref(d, mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan konum at</span></a>` : ''}
            <a class="k-btn k-btn--ikincil" href="#/iletisim" data-rota="iletisim">Acil değilse yazın ${ok}</a>
          </div>
        </div>
      </section>`;
  },
};
