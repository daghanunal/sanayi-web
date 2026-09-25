// Kurumsal veteriner — "Pati karnesi" yönü.
// karneHero:  karşı karşıya bakan köpek ve kedi portresi, önlerinde açık bir aşı karnesi; klinik mührü basılır.
// asiKarnesi: imza modülü. Tür + ad + doğum tarihi → örnek aşı takvimi karne sayfasına dökülür, yaş çizgisinde
//             pati izleri yürür, sıradaki aşıya mühür vurulur; takvim hazır mesajla WhatsApp'a gider.
//             Teşhis ve ilaç adı yok; "kesin takvimi hekim belirler" der.
// hizmetOzet: 8 hizmet, yuvarlak fotoğraf + süre etiketiyle satır listesi.
// hizmetler:  motor bölümü, "teklif" dilini randevu diline çevirir.
import { esc, telHref, waHref, openStatus, icons, gsap, reducedMotion } from '../../shared/core.js';
import { BOLUMLER, yilEki } from '../_kurumsal/bolumler.js';

const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const rota = (id, metin, cls = 'k-btn') => `<a class="${cls}" href="#/${id}" data-rota="${id}">${metin}</a>`;
const img = (p) => `${import.meta.env.BASE_URL}img/${p}`;
const GUN = 864e5;

const pati = `<svg class="pati" viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="21" rx="6.4" ry="5.4"/><ellipse cx="8.2" cy="13.4" rx="2.7" ry="3.3" transform="rotate(-18 8.2 13.4)"/><ellipse cx="13" cy="8.4" rx="2.7" ry="3.4" transform="rotate(-6 13 8.4)"/><ellipse cx="19" cy="8.4" rx="2.7" ry="3.4" transform="rotate(6 19 8.4)"/><ellipse cx="23.8" cy="13.4" rx="2.7" ry="3.3" transform="rotate(18 23.8 13.4)"/></svg>`;

const kisaTarih = (t) => t.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const uzunTarih = (t) => t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const gunBasi = (t) => new Date(t.getFullYear(), t.getMonth(), t.getDate());
const isoTarih = (t) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;

// Yuvarlak klinik mührü. Çevre yazısı işletme adından; ortada iki satır.
let muhurNo = 0;
function muhur(d, ust, alt, cls = '') {
  const id = `mh${++muhurNo}`;
  const cevre = `${d.isletme.ad} · ${d.isletme.kurulus ? yilEki(d.isletme.kurulus) + ' beri' : 'Etimesgut'} · `.toLocaleUpperCase('tr-TR');
  return `<svg class="muhur ${cls}" viewBox="0 0 120 120" aria-hidden="true">
    <defs><path id="${id}" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0"/></defs>
    <circle cx="60" cy="60" r="57" class="muhur__halka"/><circle cx="60" cy="60" r="34" class="muhur__halka muhur__halka--ic"/>
    <text class="muhur__cevre"><textPath href="#${id}" textLength="279" lengthAdjust="spacingAndGlyphs">${esc(cevre)}</textPath></text>
    <text x="60" y="58" text-anchor="middle" class="muhur__ust">${esc(ust)}</text>
    <text x="60" y="73" text-anchor="middle" class="muhur__alt">${esc(alt)}</text>
  </svg>`;
}

// --- Hero --------------------------------------------------------------------------------

export const karneHero = {
  render(d) {
    const h = d.kurumsal?.hero || {};
    const st = d.saatler ? openStatus(d.saatler) : null;
    const bugun = gunBasi(new Date());
    const sonraki = new Date(+bugun + 21 * GUN);
    const bilgi = [
      ['Kuruluş', String(d.isletme.kurulus)],
      st ? ['Bugün', st.text] : null,
      ['Randevu', d.iletisim.telefon],
    ]
      .filter(Boolean)
      .map(([e, v]) => `<div><dt>${esc(e)}</dt><dd>${esc(v)}</dd></div>`)
      .join('');
    return `
      <section class="k-hero kh" aria-label="Giriş">
        <div class="k-kap kh__ic">
          <div class="kh__metin">
            <p class="kh__ust"><span class="kh__durum ${st?.open ? 'is-acik' : ''}"><i></i>${esc(st ? st.text : d.isletme.sektor)}</span><span>${esc(h.ust || d.isletme.sektor)}</span></p>
            <h1 class="k-h1 k-hero__baslik" data-bol>${esc(h.baslik || d.isletme.slogan)}</h1>
            <p class="k-lead">${esc(h.metin || d.isletme.hakkinda)}</p>
            <div class="k-butonlar">
              ${rota('iletisim', `${esc(h.birincil || 'Randevu alın')} ${ok}`)}
              ${rota(h.ikincilRota || 'asi-karnesi', `${pati}<span>${esc(h.ikincil || 'Aşı takvimi')}</span>`, 'k-btn k-btn--ikincil')}
            </div>
          </div>
          <div class="kh__sahne" aria-hidden="true">
            <figure class="kh__foto kh__foto--kopek"><div class="kh__foto-ic" data-kh-y="-1"><img src="${img('kurumsal-veteriner/kopek.jpg')}" alt="" fetchpriority="high"></div></figure>
            <figure class="kh__foto kh__foto--kedi"><div class="kh__foto-ic" data-kh-y="1"><img src="${img('kurumsal-veteriner/kedi.jpg')}" alt=""></div></figure>
            <div class="kh__karne">
              <p class="kh__karne-bas"><span>Aşı karnesi</span></p>
              <ul class="kh__satirlar">
                <li><span>Genel muayene</span><b class="kh__tik">✓</b></li>
                <li><span>Karma aşı</span><b class="kh__tik">✓</b></li>
                <li><span>Kuduz aşısı</span><b class="kh__tik">✓</b></li>
                <li class="is-sonraki"><span>Sonraki kontrol</span><b>${kisaTarih(sonraki)}</b></li>
              </ul>
              ${muhur(d, 'KONTROL', kisaTarih(bugun), 'kh__muhur')}
            </div>
            <span class="kh__iz kh__iz--1">${pati}</span><span class="kh__iz kh__iz--2">${pati}</span><span class="kh__iz kh__iz--3">${pati}</span>
          </div>
        </div>
        <div class="k-kap">
          <a class="kh__acil" href="${telHref(d)}"><span class="kh__acil-nokta"></span><span><strong>Acil bir durum mu var?</strong> Yola çıkmadan önce arayın, ilk yapılacakları telefonda söyleyelim.</span><span class="kh__acil-tel">${icons.phone}${esc(d.iletisim.telefon)}</span></a>
          <dl class="k-hero__bilgi">${bilgi}</dl>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    const tl = gsap.timeline({ delay: 0.25 });
    tl.from(el.querySelectorAll('.kh__foto'), { clipPath: 'inset(100% 0 0 0 round 999px)', duration: 1.1, stagger: 0.12, ease: 'power3.inOut' })
      .from(el.querySelectorAll('.kh__foto img'), { scale: 1.25, duration: 1.4, stagger: 0.12, ease: 'power3.out' }, 0)
      .from(el.querySelector('.kh__karne'), { y: 60, rotate: 0, opacity: 0, duration: 0.9, ease: 'back.out(1.4)' }, 0.55)
      .from(el.querySelectorAll('.kh__satirlar li'), { x: -14, opacity: 0, duration: 0.4, stagger: 0.08 }, 0.9)
      .from(el.querySelectorAll('.kh__tik'), { scale: 0, duration: 0.35, stagger: 0.1, ease: 'back.out(3)' }, 1.05)
      .fromTo(el.querySelector('.kh__muhur'), { scale: 2.2, opacity: 0, rotate: -40 }, { scale: 1, opacity: 1, rotate: -14, duration: 0.42, ease: 'power4.in' }, 1.45)
      .add(() => el.querySelector('.kh__karne')?.classList.add('is-basildi'), 1.85)
      .from(el.querySelectorAll('.kh__iz'), { scale: 0, opacity: 0, duration: 0.4, stagger: 0.18, ease: 'back.out(2)' }, 1.6);
    // Portreler kaydırdıkça zıt yönlere kayar.
    el.querySelectorAll('[data-kh-y]').forEach((f) =>
      gsap.to(f, { yPercent: 8 * Number(f.dataset.khY), ease: 'none', scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true } })
    );
  },
};

// --- Hizmet özeti ------------------------------------------------------------------------

export const hizmetOzet = {
  render(d) {
    const list = d.hizmetler || [];
    if (!list.length) return '';
    return `
      <section class="k-bolum ho">
        <div class="k-kap">
          <div class="k-bolum__bas"><h2 class="k-h2" data-bol>${esc(d.kurumsal?.hizmetOzetBaslik || 'Hizmetlerimiz')}</h2>${rota('hizmetler', `Tüm ayrıntılar ${ok}`, 'k-link')}</div>
          <ul class="ho__liste" data-sira>
            ${list
              .map(
                (h, i) => `<li class="${h.id === 'acil' ? 'is-acil' : ''}"><a href="#/hizmetler" data-rota="hizmetler">
                  <span class="ho__no">${String(i + 1).padStart(2, '0')}</span>
                  ${h.gorsel ? `<span class="ho__gorsel"><img src="${h.gorsel}" alt="" loading="lazy"></span>` : ''}
                  <span class="ho__ad">${esc(h.baslik)}</span>
                  <span class="ho__metin">${esc(h.kisa || h.aciklama)}</span>
                  ${h.sure ? `<span class="ho__sure">${esc(h.sure)}</span>` : ''}
                  ${ok}</a></li>`
              )
              .join('')}
          </ul>
        </div>
      </section>`;
  },
};

// --- Hizmetler: randevu dili -------------------------------------------------------------

export const hizmetler = {
  render(d, ctx, sorgu) {
    return BOLUMLER.hizmetler.render(d, ctx, sorgu).replaceAll('Bu hizmet için teklif isteyin', 'Bu hizmet için randevu isteyin');
  },
};

// --- Aşı karnesi -------------------------------------------------------------------------
// Örnek takvim (hafta = doğumdan sonra). Aşı adları genel; marka ya da ilaç adı yok.
const PLAN = {
  kopek: [
    { h: 6, ad: 'İlk muayene', not: 'Genel kontrol, iç ve dış parazit kontrolü' },
    { h: 8, ad: 'Karma aşı, 1. doz', not: 'Aşıdan önce kısa muayene' },
    { h: 12, ad: 'Karma aşı, 2. doz' },
    { h: 16, ad: 'Karma aşı, 3. doz' },
    { h: 17, ad: 'Kuduz aşısı' },
    { h: 20, ad: 'Bronşit aşısı', not: 'Çok köpekle bir arada kalacaksa hekim önerir' },
  ],
  kedi: [
    { h: 6, ad: 'İlk muayene', not: 'Genel kontrol, iç ve dış parazit kontrolü' },
    { h: 8, ad: 'Karma aşı, 1. doz', not: 'Aşıdan önce kısa muayene' },
    { h: 10, ad: 'Lösemi testi ve aşısı', not: 'Dışarı çıkan ya da başka kedilerle yaşayan kedide' },
    { h: 12, ad: 'Karma aşı, 2. doz' },
    { h: 16, ad: 'Kuduz aşısı' },
  ],
};
const TUR = {
  kedi: { ad: 'Kedi', iyelik: 'kedim', foto: 'kurumsal-veteriner/kedi2.jpg' },
  kopek: { ad: 'Köpek', iyelik: 'köpeğim', foto: 'kurumsal-veteriner/kopek.jpg' },
};

function yasMetni(dogum, bugun) {
  const gun = Math.floor((bugun - dogum) / GUN);
  if (gun < 7) return `${gun} günlük`;
  if (gun < 120) return `${Math.floor(gun / 7)} haftalık`;
  let ay = (bugun.getFullYear() - dogum.getFullYear()) * 12 + bugun.getMonth() - dogum.getMonth();
  if (bugun.getDate() < dogum.getDate()) ay--;
  if (ay < 24) return `${ay} aylık`;
  return `${Math.floor(ay / 12)} yaşında`;
}

export function takvim(tur, dogum, bugun = gunBasi(new Date())) {
  const gun = (t) => Math.round((t - bugun) / GUN);
  const seri = PLAN[tur].map((x) => ({ ...x, tarih: new Date(+dogum + x.h * 7 * GUN) }));
  const seriSon = seri.at(-1).tarih;
  let yil = new Date(dogum.getFullYear() + 1, dogum.getMonth(), dogum.getDate() + 16 * 7);
  while (gun(yil) < -3) yil = new Date(yil.getFullYear() + 1, yil.getMonth(), yil.getDate());
  const yetiskin = gun(seriSon) < -60;
  let satirlar = yetiskin
    ? [{ ad: 'Yavru aşı serisi', not: `${kisaTarih(seri[0].tarih)} – ${kisaTarih(seriSon)} arası. Karnede eksik varsa muayenede tamamlarız.`, tarih: seriSon, seriMi: true }]
    : seri;
  satirlar = [...satirlar, { ad: 'Yıllık tekrar', not: 'Karma ve kuduz aşısının tekrarı, öncesinde genel muayene', tarih: yil }];
  if (yetiskin) {
    // Düzenli kontroller: doğumdan itibaren belirli aralıklarla, bugünden sonraki ilk tarih.
    const sonraki = (aralik) => {
      const k = Math.ceil(((+bugun - 3 * GUN) - +dogum) / (aralik * GUN));
      return new Date(+dogum + Math.max(1, k) * aralik * GUN);
    };
    satirlar.push({ ad: 'İç ve dış parazit kontrolü', not: 'Üç ayda bir; tüy, deri ve dışkı kontrolü', tarih: sonraki(91) });
    if (bugun - dogum > 7 * 365 * GUN) satirlar.push({ ad: 'Kan tahlili ve genel kontrol', not: 'Yaşlı dostlarda altı ayda bir önerilir', tarih: sonraki(182) });
    const [ilk, ...kalan] = satirlar;
    satirlar = [ilk, ...kalan.sort((a, b) => a.tarih - b.tarih)];
  }
  let sirada = false;
  satirlar = satirlar.map((s) => {
    const g = gun(s.tarih);
    let durum = g < -3 ? 'gecti' : g <= 30 ? 'yakin' : 'plan';
    let siradaki = false;
    if (durum !== 'gecti' && !sirada) {
      sirada = true;
      siradaki = true;
    }
    return { ...s, durum, siradaki, gun: g };
  });
  return { satirlar, siradaki: satirlar.find((s) => s.siradaki), yetiskin };
}

const DURUM = { gecti: 'Geçti', yakin: 'Yaklaşıyor', plan: 'Planlandı' };

function karneIc(d, s) {
  const tur = TUR[s.tur];
  const bugun = gunBasi(new Date());
  const ad = s.ad || (s.tur === 'kedi' ? 'Kediniz' : 'Köpeğiniz');
  if (!s.dogum || s.dogum > bugun) {
    return `<div class="ak__bos">${pati}<p>${s.dogum ? 'Doğum tarihi bugünden sonra olamaz.' : 'Doğum tarihini girin, takvim karneye dökülsün.'}</p></div>`;
  }
  if (bugun - s.dogum > 25 * 365 * GUN) return `<div class="ak__bos">${pati}<p>Doğum tarihini kontrol edin.</p></div>`;
  const t = takvim(s.tur, s.dogum, bugun);
  // Çizelge eşit aralıklı: her durak bir iz; "bugün" komşu iki durak arasına orantılı yerleşir.
  const n = t.satirlar.length;
  const adim = 100 / Math.max(1, n - 1);
  const duraklar = t.satirlar.map((x) => +x.tarih);
  const yuzde = (x) => {
    const v = +x;
    const i = duraklar.findIndex((dd) => v <= dd);
    if (i === 0) return 0;
    if (i === -1) return 100;
    const [a, b] = [duraklar[i - 1], duraklar[i]];
    return ((i - 1 + (v - a) / (b - a || 1)) * adim).toFixed(2);
  };
  const konum = (i) => (n > 1 ? (i * adim).toFixed(2) : 50);
  const sira = t.siradaki;
  return `
    <div class="ak__kimlik">
      <div class="ak__foto"><img src="${img(tur.foto)}" alt=""></div>
      <dl>
        <div><dt>Adı</dt><dd>${esc(ad)}</dd></div>
        <div><dt>Türü</dt><dd>${tur.ad}</dd></div>
        <div><dt>Doğum</dt><dd>${kisaTarih(s.dogum)}</dd></div>
        <div><dt>Yaşı</dt><dd>${yasMetni(s.dogum, bugun)}</dd></div>
      </dl>
    </div>
    <div class="ak__cizelge" aria-hidden="true">
      <span class="ak__yol"><i style="width:${yuzde(bugun)}%"></i></span>
      ${t.satirlar.map((x, i) => `<span class="ak__iz ${x.durum === 'gecti' ? 'is-gecti' : ''} ${x.siradaki ? 'is-sira' : ''}" style="left:${konum(i)}%; --r:${i % 2 ? 14 : -14}deg; --y:${i % 2 ? 7 : -7}px">${pati}</span>`).join('')}
      <span class="ak__bugun" style="left:${yuzde(bugun)}%"><b>Bugün</b></span>
    </div>
    <ol class="ak__satirlar">
      ${t.satirlar
        .map(
          (x) => `<li class="ak__satir is-${x.durum} ${x.siradaki ? 'is-sira' : ''}">
            <span class="ak__tarih">${kisaTarih(x.tarih)}</span>
            <span class="ak__ad">${esc(x.ad)}${x.not ? `<small>${esc(x.not)}</small>` : ''}</span>
            <span class="ak__durum">${x.siradaki ? 'Sıradaki' : DURUM[x.durum]}</span>
          </li>`
        )
        .join('')}
    </ol>
    ${
      sira
        ? `<div class="ak__sonuc">
            ${muhur(d, 'SIRADAKİ', kisaTarih(sira.tarih), 'ak__muhur')}
            <p><span>Sıradaki</span><strong>${esc(sira.ad)}</strong>${uzunTarih(sira.tarih)}${sira.gun > 0 ? `, ${sira.gun} gün sonra` : sira.gun === 0 ? ', bugün' : ', geçen günlerde'}</p>
          </div>`
        : ''
    }`;
}

function mesaj(d, s) {
  const bugun = gunBasi(new Date());
  const tur = TUR[s.tur];
  const kim = s.ad ? `${s.ad} adlı ${tur.iyelik}` : tur.iyelik.replace(/^./, (c) => c.toLocaleUpperCase('tr-TR'));
  if (!s.dogum || s.dogum > bugun) return `Merhaba ${d.isletme.ad}, ${tur.iyelik} için aşı takvimi hakkında bilgi almak istiyorum.`;
  const t = takvim(s.tur, s.dogum, bugun);
  const sira = t.siradaki;
  return `Merhaba ${d.isletme.ad}, ${kim} ${kisaTarih(s.dogum)} doğumlu (${yasMetni(s.dogum, bugun)}). ${sira ? `Sitenizdeki örnek takvime göre sıradaki: ${sira.ad}, ${uzunTarih(sira.tarih)}. ` : ''}Muayene ve aşı için randevu almak, karnesini hatırlatma listenize eklemek istiyorum.`;
}

export const asiKarnesi = {
  render(d) {
    const bugun = gunBasi(new Date());
    const s = { tur: 'kedi', ad: '', dogum: new Date(+bugun - 9 * 7 * GUN) };
    return `
      <section class="k-bolum ak" aria-label="Aşı karnesi">
        <div class="k-kap">
          <div class="ak__bas">
            <p class="ak__etiket">${pati}Aşı karnesi</p>
            <h2 class="k-h2" data-bol>Karnesini şimdiden görün</h2>
            <p class="k-lead">Türünü ve doğum tarihini girin; örnek aşı takvimi karneye dökülsün, sıradaki tarihi mühürleyelim. Kesin takvimi hekimimiz muayeneden sonra belirler.</p>
          </div>
          <div class="ak__ic">
            <form class="ak__panel" novalidate>
              <fieldset class="ak__tur">
                <legend>Dostunuz</legend>
                ${Object.entries(TUR)
                  .map(
                    ([id, t]) => `<label class="ak__tur-sec"><input type="radio" name="tur" value="${id}"${id === s.tur ? ' checked' : ''}><span class="ak__tur-foto"><img src="${img(t.foto)}" alt="" loading="lazy"></span><span class="ak__tur-ad">${t.ad}</span></label>`
                  )
                  .join('')}
              </fieldset>
              <label class="ak__alan"><span>Adı <em>(isteğe bağlı)</em></span><input name="ad" maxlength="20" autocomplete="off" placeholder="${s.tur === 'kedi' ? 'Duman' : 'Karamel'}"></label>
              <label class="ak__alan"><span>Doğum tarihi</span><input name="dogum" type="date" value="${isoTarih(s.dogum)}" max="${isoTarih(bugun)}"></label>
              <p class="ak__ipucu">Tam bilmiyorsanız yaklaşık bir tarih girin. Sahiplendiğiniz dostun yaşını muayenede dişlerinden de tahmin ederiz.</p>
              <div class="ak__hizli" role="group" aria-label="Hızlı yaş seçimi">
                <button type="button" data-hafta="7">7 haftalık</button><button type="button" data-hafta="14">3 aylık</button><button type="button" data-hafta="106">2 yaşında</button>
              </div>
            </form>
            <article class="ak__karne">
              <header class="ak__karne-bas"><span>Aşı karnesi</span><span class="ak__karne-ad">${esc(d.isletme.ad)}</span></header>
              <div class="ak__govde" aria-live="polite">${karneIc(d, s)}</div>
              <footer class="ak__butonlar">
                <a class="k-btn ak__wa" href="${waHref(d, mesaj(d, s))}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu takvimle randevu iste</span></a>
                <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
              </footer>
            </article>
          </div>
          <p class="k-not ak__not">Bu genel bir örnek takvimdir; teşhis ya da tedavi önerisi değildir. Aşıdan önce hayvanınızı muayene eder, takvimi yaşına, sağlığına ve yaşam koşullarına göre birlikte belirleriz.</p>
        </div>
      </section>`;
  },
  mount(el, d) {
    const form = el.querySelector('.ak__panel');
    const govde = el.querySelector('.ak__govde');
    const wa = el.querySelector('.ak__wa');
    const adIn = form.elements.ad;
    const durum = () => {
      const f = new FormData(form);
      const v = f.get('dogum');
      const [y, m, g] = (v || '').split('-').map(Number);
      return { tur: f.get('tur') || 'kedi', ad: String(f.get('ad') || '').trim().slice(0, 20), dogum: v && y > 1900 ? new Date(y, m - 1, g) : null };
    };
    const oynat = (ilk) => {
      if (reducedMotion) return;
      const izler = govde.querySelectorAll('.ak__iz');
      gsap.fromTo(izler, { opacity: 0, scale: 0.4 }, { opacity: (i, t) => (t.classList.contains('is-gecti') ? 0.55 : 1), scale: 1, duration: 0.35, stagger: 0.09, ease: 'back.out(2.5)', clearProps: 'scale' });
      gsap.from(govde.querySelectorAll('.ak__satir'), { x: -12, opacity: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' });
      gsap.from(govde.querySelector('.ak__yol i'), { width: 0, duration: 0.8, ease: 'power2.inOut' });
      const m = govde.querySelector('.ak__muhur');
      if (m) {
        gsap.fromTo(m, { scale: 2.4, opacity: 0, rotate: -50 }, { scale: 1, opacity: 1, rotate: -12, duration: 0.4, delay: ilk ? 0.7 : 0.45, ease: 'power4.in', onComplete: () => {
          const k = el.querySelector('.ak__karne');
          k.classList.remove('is-sars');
          void k.offsetWidth;
          k.classList.add('is-sars');
        } });
      }
    };
    const guncelle = () => {
      const s = durum();
      adIn.placeholder = s.tur === 'kedi' ? 'Duman' : 'Karamel';
      govde.innerHTML = karneIc(d, s);
      wa.href = waHref(d, mesaj(d, s));
      oynat(false);
    };
    let zaman;
    form.addEventListener('change', guncelle);
    adIn.addEventListener('input', () => {
      clearTimeout(zaman);
      zaman = setTimeout(() => {
        const s = durum();
        const dd = govde.querySelector('.ak__kimlik dd');
        if (dd) dd.textContent = s.ad || (s.tur === 'kedi' ? 'Kediniz' : 'Köpeğiniz');
        wa.href = waHref(d, mesaj(d, s));
      }, 120);
    });
    form.addEventListener('submit', (e) => e.preventDefault());
    el.querySelectorAll('[data-hafta]').forEach((b) =>
      b.addEventListener('click', () => {
        form.elements.dogum.value = isoTarih(new Date(+gunBasi(new Date()) - Number(b.dataset.hafta) * 7 * GUN));
        guncelle();
      })
    );
    if (!reducedMotion) {
      // Giriş: ScrollTrigger yerine IntersectionObserver (tek seferlik tetik, yenileme döngüsüne girmez).
      const karne = el.querySelector('.ak__karne');
      gsap.set(karne, { y: 50, rotate: 2.5, opacity: 0 });
      const io = new IntersectionObserver((e) => {
        if (!e[0].isIntersecting) return;
        io.disconnect();
        gsap.to(karne, { y: 0, rotate: 0, opacity: 1, duration: 0.9, ease: 'power3.out', clearProps: 'transform' });
        oynat(true);
      }, { rootMargin: '0px 0px -18% 0px' });
      io.observe(el.querySelector('.ak__ic'));
    }
  },
};

// Özet bölümündeki "Kurumsal" bağlantısı bu sitede "Kliniğimiz" sayfasına gidiyor; adını ona göre yaz.
export const ozet = {
  ...BOLUMLER.ozet,
  render: (d, ctx, sorgu) => BOLUMLER.ozet.render(d, ctx, sorgu).replace('>Kurumsal ', '>Kliniğimiz '),
};
