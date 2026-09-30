// Bakım Planı: kurumsal aile, filo ve şirket araçları odağı. Planlama çizelgesi dili: beyaz kâğıt, ince ızgara,
// yeşil (#3a7d44), Geist + Geist Mono. Modüller:
//  planHero   künye: dev ad, çizelge satırı gibi künye, filo fotoğrafı bandı, plan ve kayıt bağlantıları
//  filoBant   ana sayfa: filo için üç iş (plan, kayıt, kurumsal) ve plan sayfasına geçiş
//  filoPlani  araç türü + adet + yıllık km → 12 aylık bakım takvimi (araçlar aylara yayılır), fiyatsız
//  aracKaydi  kayıt düzeni (alanlar ve ne yazıldığı) + plakayla kayıt isteği → WhatsApp mesajı
import { esc, waHref, telHref, mapsHref, icons, gsap, ScrollTrigger, reducedMotion, gunDurumu, kisaAdres } from '../../shared/core.js';
import { rota, ok } from '../_kurumsal/bolumler.js';

const k = (d) => d.kurumsal || {};
const B = import.meta.env.BASE_URL;
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
const trLower = (s) => String(s).toLocaleLowerCase('tr');
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

// --- Künye ----------------------------------------------------------------------------------

export const planHero = {
  render(d) {
    const b = gunDurumu(d.saatler);
    return `
      <section class="k-hero k-hero--kunye bp-hero" aria-label="Künye">
        <div class="k-kap bp-hero__ic">
          <div class="k-hero__metin bp-hero__metin">
            <p class="bp-mono bp-hero__ust">${esc(d.isletme.tanim || d.isletme.sektor)} · Şahıs, şirket ve filo araçları</p>
            <h1 class="k-h1 k-hero__baslik" data-bol>${esc(d.isletme.ad)}</h1>
            <dl class="k-kunye bp-kunye">
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
        </div>
        <div class="bp-hero__bant">
          <figure class="bp-hero__foto" data-perde><img src="${B}img/kurumsal-bakim2/filo.jpg" alt="Park alanında iki beyaz hafif ticari araç" fetchpriority="high" width="1600" height="734"></figure>
          <nav class="bp-hero__git" aria-label="Filo">
            ${rota('filo-plani', `<span class="bp-mono">01</span><strong>Filo bakım planı</strong><small>Araç sayısı ve kilometreyle 12 aylık takvim</small>${ok}`, 'bp-git')}
            ${rota('arac-kaydi', `<span class="bp-mono">02</span><strong>Araç kaydı</strong><small>Plakayla bakım kaydı isteği</small>${ok}`, 'bp-git')}
          </nav>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    gsap.from(el.querySelectorAll('.bp-kunye > div, .bp-hero .k-butonlar .k-btn, .bp-hero__ust'), { y: 12, autoAlpha: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out', delay: 0.4, clearProps: 'transform,opacity,visibility' });
    gsap.from(el.querySelectorAll('.bp-git'), { y: 24, autoAlpha: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out', delay: 0.75, clearProps: 'transform,opacity,visibility' });
  },
};

// --- Ana sayfa: filo için ---------------------------------------------------------------------

export const filoBant = {
  render(d) {
    const a = k(d).anlasmalar || [];
    if (!a.length) return '';
    return `
      <section class="k-bolum bp-fb" aria-labelledby="bp-fb-baslik">
        <div class="k-kap">
          <div class="k-bolum__bas">
            <h2 class="k-h2" id="bp-fb-baslik" data-bol>Filo ve şirket araçları</h2>
            ${rota('kurumsal-musteriler', `Kurumsal müşteriler ${ok}`, 'k-link')}
          </div>
          <ol class="bp-fb__liste" data-sira>
            ${a.map((x, i) => `<li><span class="bp-mono">${String(i + 1).padStart(2, '0')}</span><h3 class="k-h3">${esc(x.baslik)}</h3><p>${esc(x.kisa || x.metin)}</p></li>`).join('')}
          </ol>
          <div class="bp-fb__cta">
            <p>Araç türü, sayısı ve yıllık kilometreyle on iki aylık bakım takvimi çıkarılabilir.</p>
            ${rota('filo-plani', `Planı çıkar ${ok}`, 'k-btn')}
          </div>
        </div>
      </section>`;
  },
};

// --- Filo bakım planı ---------------------------------------------------------------------------

// Bir araç grubu için aralık (ay): genel aralık km ya da yılda bir, hangisi önce gelirse.
const aralikAy = (F, km) => Math.max(1, Math.min(F.aralikAy || 12, Math.round((12 * F.aralikKm) / Math.max(1, km))));

function planla(F, satirlar, basla) {
  const bugun = new Date();
  const ilk = new Date(bugun.getFullYear(), bugun.getMonth() + basla, 1);
  const aylar = Array.from({ length: 12 }, (_, m) => {
    const t = new Date(ilk.getFullYear(), ilk.getMonth() + m, 1);
    return { ay: t.getMonth(), yil: t.getFullYear() };
  });
  const gruplar = satirlar.filter((s) => s.adet > 0).map((s) => {
    const tur = F.turler.find((t) => t.id === s.tur) || F.turler[0];
    const aralik = aralikAy(F, s.km);
    const kmZiyaret = (aralik * s.km) / 12; // iki bakım arası km
    // 30–40 bin km işleri: plan başından beri 30 bin km'nin katı geçilen bakımda
    const otuzMu = (n) => Math.floor(((n + 1) * kmZiyaret) / 30000) > Math.floor((n * kmZiyaret) / 30000);
    const hucre = aylar.map(() => ({ arac: 0, yillik: 0, otuz: 0 }));
    // Araçlar aralığa eşit yayılır: j. aracın ilk bakımı floor(j·aralık/adet). ayında.
    for (let j = 0; j < s.adet; j++) {
      const ofs = Math.floor((j * aralik) / s.adet) % aralik;
      let ziyaret = 0;
      for (let m = ofs; m < 12; m += aralik, ziyaret++) {
        const c = hucre[m];
        c.arac++;
        if (ziyaret === 0) c.yillik++;
        if (otuzMu(ziyaret)) c.otuz++;
      }
    }
    const toplam = hucre.reduce((a, c) => a + c.arac, 0);
    return { ...s, tur, aralik, hucre, toplam };
  });
  const ayToplam = aylar.map((_, m) => gruplar.reduce((a, g) => a + g.hucre[m].arac, 0));
  const yilToplam = ayToplam.reduce((a, b) => a + b, 0);
  const enCok = Math.max(0, ...ayToplam);
  const enCokAy = ayToplam.indexOf(enCok);
  return { aylar, gruplar, ayToplam, yilToplam, enCok, enCokAy, araclar: gruplar.reduce((a, g) => a + g.adet, 0) };
}

const kmSecenekleri = (F, secili) => F.kmSecenek.map((v) => `<option value="${v}"${v === secili ? ' selected' : ''}>${fmt(v)} km</option>`).join('');
const turSecenekleri = (F, secili) => F.turler.map((t) => `<option value="${t.id}"${t.id === secili ? ' selected' : ''}>${esc(t.ad)}</option>`).join('');

export const filoPlani = {
  render(d) {
    const F = k(d).filo;
    if (!F) return '';
    return `
      <section class="k-bolum bp-fp" aria-labelledby="bp-fp-baslik">
        <div class="k-kap">
          <div class="bp-fp__bas">
            <h2 class="k-h2" id="bp-fp-baslik" data-bol>Plan çizelgesi</h2>
            <p class="k-metin">${esc(F.not)}</p>
          </div>
          <div class="bp-fp__ic">
            <form class="bp-fp__form" onsubmit="return false" aria-label="Filo bilgileri">
              <p class="bp-adim"><span class="bp-mono">1</span>Araç grupları</p>
              <div class="bp-satirlar" data-satirlar></div>
              <button type="button" class="bp-ekle" data-ekle>${'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'}<span>Araç grubu ekle</span></button>
              <p class="bp-adim"><span class="bp-mono">2</span>Plan başlangıcı</p>
              <div class="bp-cipler" role="group" aria-label="Plan başlangıcı">
                ${F.baslangic.map((b, i) => `<button type="button" class="bp-cip" data-basla="${b.id}" aria-pressed="${i === 0}">${esc(b.ad)}</button>`).join('')}
              </div>
            </form>
            <div class="bp-sonuc" aria-live="polite">
              <p class="bp-adim"><span class="bp-mono">3</span>Yıllık bakım takvimi</p>
              <dl class="bp-ozet" data-o="ozet"></dl>
              <div class="bp-cizelge" data-o="cizelge"></div>
              <p class="bp-lejant"><span><i class="bp-nokta"></i>Periyodik bakım</span><span><i class="bp-nokta bp-nokta--y"></i>Yıllık kontroller (polen filtresi, klima, akü)</span><span><i class="bp-nokta bp-nokta--o"></i>30–40 bin km işleri</span></p>
              <div class="k-butonlar bp-sonuc__dugmeler">
                <a class="k-btn" data-o="wa" href="#" target="_blank" rel="noopener">${icons.whatsapp}<span>Planı WhatsApp'tan gönder</span></a>
                <button type="button" class="k-btn k-btn--ikincil" data-o="kopya">Planı metin olarak kopyala</button>
              </div>
              <p class="bp-kopya" data-o="kopyaSonuc" role="status" hidden></p>
              <p class="bp-sonuc__not">Genel aralık, kitapçığa göre değişir. Plan, araçların son bakım kayıtlarına bakılarak birlikte kesinleştirilir.</p>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const F = k(d).filo;
    if (!F) return;
    const o = (n) => el.querySelector(`[data-o="${n}"]`);
    const satirKutu = el.querySelector('[data-satirlar]');
    let satirlar = (F.ornek || []).map((s) => ({ ...s }));
    let basla = 0;
    let metin = '';

    const satirCiz = () => {
      satirKutu.innerHTML = satirlar.map((s, i) => `
        <fieldset class="bp-satir" data-i="${i}">
          <legend class="sr-only">Araç grubu ${i + 1}</legend>
          <label class="bp-alan bp-alan--tur"><span>Araç türü</span><select data-f="tur">${turSecenekleri(F, s.tur)}</select></label>
          <div class="bp-alan bp-alan--adet"><span id="bp-adet-${i}">Adet</span>
            <div class="bp-adet" role="group" aria-labelledby="bp-adet-${i}">
              <button type="button" data-a="-1" aria-label="Bir araç azalt">−</button>
              <input data-f="adet" inputmode="numeric" value="${s.adet}" aria-labelledby="bp-adet-${i}" maxlength="3" autocomplete="off">
              <button type="button" data-a="1" aria-label="Bir araç artır">+</button>
            </div>
          </div>
          <label class="bp-alan bp-alan--km"><span>Araç başı yıllık km</span><select data-f="km">${kmSecenekleri(F, s.km)}</select></label>
          ${satirlar.length > 1 ? `<button type="button" class="bp-sil" data-sil="${i}" aria-label="${i + 1}. araç grubunu sil"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>` : ''}
          <p class="bp-satir__aralik bp-mono">${aralikAy(F, s.km)} ayda bir bakım</p>
        </fieldset>`).join('');
      el.querySelector('[data-ekle]').hidden = satirlar.length >= 4;
    };

    const hesapla = (anim) => {
      const r = planla(F, satirlar, basla);
      const ilk = r.aylar[0], son = r.aylar[11];
      const donem = `${AYLAR[ilk.ay]} ${ilk.yil} – ${AYLAR[son.ay]} ${son.yil}`;
      o('ozet').innerHTML = `
        <div><dt>Araç</dt><dd>${fmt(r.araclar)}</dd></div>
        <div><dt>Yılda bakım girişi</dt><dd>${fmt(r.yilToplam)}</dd></div>
        <div><dt>Ayda en çok</dt><dd>${fmt(r.enCok)}<small>${r.enCok ? esc(AYLAR[r.aylar[r.enCokAy].ay]) : ''}</small></dd></div>
        <div><dt>Dönem</dt><dd class="bp-ozet__donem">${esc(donem)}</dd></div>`;
      // Geniş ekran: tablo; dar ekran: ay ay liste (CSS gösterir)
      const hucreHtml = (c) => c.arac
        ? `<span class="bp-h"><b>${c.arac}</b>${c.yillik ? '<i class="bp-nokta bp-nokta--y" title="Yıllık kontroller"></i>' : ''}${c.otuz ? '<i class="bp-nokta bp-nokta--o" title="30–40 bin km işleri"></i>' : ''}</span>`
        : '<span class="bp-h bp-h--bos" aria-label="yok">·</span>';
      o('cizelge').innerHTML = `
        <table class="bp-tablo">
          <caption class="sr-only">Aylara göre bakıma girecek araç sayısı</caption>
          <thead><tr><th scope="col">Grup</th>${r.aylar.map((a) => `<th scope="col"><span>${AY_KISA[a.ay]}</span>${a.ay === 0 || a === r.aylar[0] ? `<small>${a.yil}</small>` : ''}</th>`).join('')}<th scope="col">Yıl</th></tr></thead>
          <tbody>
            ${r.gruplar.map((g) => `<tr><th scope="row"><strong>${esc(g.tur.ad)}</strong><small>${g.adet} araç · ${fmt(g.km)} km · ${g.aralik} ayda bir</small></th>${g.hucre.map((c) => `<td>${hucreHtml(c)}</td>`).join('')}<td class="bp-top">${g.toplam}</td></tr>`).join('')}
          </tbody>
          <tfoot><tr><th scope="row">Toplam</th>${r.ayToplam.map((t) => `<td>${t || '·'}</td>`).join('')}<td class="bp-top">${r.yilToplam}</td></tr></tfoot>
        </table>
        <ol class="bp-aylar">
          ${r.aylar.map((a, m) => `
            <li class="${r.ayToplam[m] ? '' : 'is-bos'}${m === r.enCokAy && r.enCok ? ' is-yogun' : ''}">
              <p class="bp-aylar__ay"><strong>${AYLAR[a.ay]}</strong><small>${a.yil}</small></p>
              <p class="bp-aylar__say">${r.ayToplam[m] ? `${r.ayToplam[m]} araç` : 'Bakım yok'}</p>
              ${r.ayToplam[m] ? `<ul>${r.gruplar.filter((g) => g.hucre[m].arac).map((g) => `<li>${esc(g.tur.ad)}: ${g.hucre[m].arac}${g.hucre[m].yillik ? '<i class="bp-nokta bp-nokta--y"></i>' : ''}${g.hucre[m].otuz ? '<i class="bp-nokta bp-nokta--o"></i>' : ''}</li>`).join('')}</ul>` : ''}
            </li>`).join('')}
        </ol>`;
      // Mesaj ve düz metin
      const gruplarMetni = r.gruplar.map((g) => `${g.adet} ${trLower(g.tur.ad)} (araç başı yılda ${fmt(g.km)} km)`).join(', ');
      o('wa').href = waHref(d, `Merhaba ${d.isletme.ad}, filomuz için yıllık bakım planı konuşmak istiyoruz. Araçlar: ${gruplarMetni}. Sitedeki plana göre yılda ${r.yilToplam} bakım girişi var, ayda en çok ${r.enCok} araç bakıma giriyor. Plan dönemi ${donem}.`);
      metin = [
        `Filo bakım planı (${donem})`,
        ...r.gruplar.map((g) => `${g.tur.ad}: ${g.adet} araç, araç başı yılda ${fmt(g.km)} km, ${g.aralik} ayda bir bakım`),
        '',
        ...r.aylar.map((a, m) => `${AYLAR[a.ay]} ${a.yil}: ${r.ayToplam[m] ? r.gruplar.filter((g) => g.hucre[m].arac).map((g) => `${g.tur.ad} ${g.hucre[m].arac}`).join(', ') : 'bakım yok'}`),
        '',
        `Yılda ${r.yilToplam} bakım girişi. ${F.not}`,
      ].join('\n');
      o('kopyaSonuc').hidden = true;
      if (anim && !reducedMotion) {
        gsap.fromTo(el.querySelectorAll('.bp-h b, .bp-aylar > li'), { scale: 0.85, autoAlpha: 0.2 }, { scale: 1, autoAlpha: 1, duration: 0.35, stagger: { each: 0.012, from: 'start' }, ease: 'power3.out', clearProps: 'transform' });
      }
    };

    const tazele = (anim = true) => { satirCiz(); hesapla(anim); ScrollTrigger.refresh(); };

    el.addEventListener('change', (e) => {
      const f = e.target.dataset.f;
      const i = Number(e.target.closest('[data-i]')?.dataset.i);
      if (!f || Number.isNaN(i)) return;
      if (f === 'tur') satirlar[i].tur = e.target.value;
      if (f === 'km') satirlar[i].km = Number(e.target.value);
      if (f === 'adet') satirlar[i].adet = Math.min(500, Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0));
      tazele();
    });
    el.addEventListener('input', (e) => {
      if (e.target.dataset.f !== 'adet') return;
      const i = Number(e.target.closest('[data-i]').dataset.i);
      satirlar[i].adet = Math.min(500, Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0));
      hesapla(false);
    });
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.a) {
        const i = Number(b.closest('[data-i]').dataset.i);
        satirlar[i].adet = Math.min(500, Math.max(1, satirlar[i].adet + Number(b.dataset.a)));
        b.parentElement.querySelector('input').value = satirlar[i].adet;
        hesapla(true);
      } else if (b.dataset.sil != null) {
        satirlar.splice(Number(b.dataset.sil), 1);
        tazele();
      } else if (b.hasAttribute('data-ekle')) {
        const kullanilan = new Set(satirlar.map((s) => s.tur));
        const tur = F.turler.find((t) => !kullanilan.has(t.id))?.id || F.turler[0].id;
        satirlar.push({ tur, adet: 2, km: 20000 });
        tazele();
        satirKutu.lastElementChild?.querySelector('select')?.focus({ preventScroll: true });
      } else if (b.dataset.basla != null) {
        basla = Number(b.dataset.basla);
        el.querySelectorAll('[data-basla]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        hesapla(true);
      } else if (b.dataset.o === 'kopya') {
        const s = o('kopyaSonuc');
        try { await navigator.clipboard.writeText(metin); s.textContent = 'Plan panoya kopyalandı; e-postaya ya da mesaja yapıştırılabilir.'; }
        catch { s.textContent = 'Kopyalama bu tarayıcıda açılmadı. Plan WhatsApp düğmesiyle de gönderilebilir.'; }
        s.hidden = false;
      }
    });
    tazele(false);
  },
};

// --- Araç kaydı ------------------------------------------------------------------------------------

const plakaBicim = (s) => {
  const t = String(s).toLocaleUpperCase('en').replace(/[^0-9A-Z]/g, '');
  const m = t.match(/^(\d{1,2})([A-Z]{0,3})(\d{0,5})$/);
  if (!m) return t.slice(0, 9);
  return [m[1], m[2], m[3]].filter(Boolean).join(' ');
};
const plakaGecerli = (s) => /^(0[1-9]|[1-7]\d|8[01]) [A-Z]{1,3} \d{2,5}$/.test(s);

export const aracKaydi = {
  render(d) {
    const K = k(d).kayit;
    if (!K) return '';
    return `
      <section class="k-bolum bp-ak" aria-labelledby="bp-ak-baslik">
        <div class="k-kap bp-ak__ic">
          <div class="bp-ak__kart" aria-labelledby="bp-ak-baslik">
            <div class="bp-ak__ust">
              <h2 class="k-h3" id="bp-ak-baslik">Kayıt düzeni</h2>
              <p class="bp-mono">Her araç için ayrı tutulur</p>
            </div>
            <div class="bp-plaka" aria-hidden="true"><span class="bp-plaka__tr">TR</span><span class="bp-plaka__no">06 ··· ···</span></div>
            <dl class="bp-ak__alanlar">
              ${K.alanlar.map(([a, v], i) => `<div style="--i:${i}"><dt><span class="bp-mono">${String(i + 1).padStart(2, '0')}</span>${esc(a)}</dt><dd>${esc(v)}</dd></div>`).join('')}
            </dl>
          </div>
          <form class="bp-istek" onsubmit="return false" aria-labelledby="bp-istek-baslik">
            <h2 class="k-h2" id="bp-istek-baslik" data-bol>Kayıt isteği</h2>
            <p class="k-metin">Plaka yazılıp istenen kayıt seçilince mesaj hazırlanır. Birden fazla araç için plakalar tek tek eklenir.</p>
            <label class="bp-alan"><span>Plaka</span>
              <span class="bp-plaka-giris"><span class="bp-plaka__tr" aria-hidden="true">TR</span><input data-o="plaka" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="11" placeholder="06 ABC 123" enterkeyhint="done"></span>
            </label>
            <div class="bp-istek__ekle">
              <button type="button" class="k-btn k-btn--ikincil k-btn--kucuk" data-o="ekle">Plakayı listeye ekle</button>
              <p class="bp-istek__hata" data-o="hata" role="alert" hidden></p>
            </div>
            <ul class="bp-plakalar" data-o="liste" aria-label="Eklenen plakalar"></ul>
            <fieldset class="bp-alan">
              <legend>İstenen</legend>
              <div class="bp-cipler bp-cipler--3">${K.istekler.map((x, i) => `<button type="button" class="bp-cip" data-istek="${x.id}" aria-pressed="${i === 0}">${esc(x.ad)}</button>`).join('')}</div>
            </fieldset>
            <label class="bp-alan"><span>Firma <small>isteğe bağlı</small></span><input data-o="firma" maxlength="60" autocomplete="organization" placeholder="Firma adı"></label>
            <p class="bp-onizle" data-o="onizle"></p>
            <div class="k-butonlar">
              <a class="k-btn" data-o="wa" href="#" target="_blank" rel="noopener">${icons.whatsapp}<span>İsteği WhatsApp'tan gönder</span></a>
            </div>
          </form>
        </div>
      </section>`;
  },
  mount(el, d) {
    const K = k(d).kayit;
    if (!K) return;
    const o = (n) => el.querySelector(`[data-o="${n}"]`);
    const plakalar = [];
    let istek = K.istekler[0];
    const hata = (m) => { o('hata').hidden = !m; o('hata').textContent = m || ''; };
    const ciz = () => {
      const giris = plakaBicim(o('plaka').value);
      const liste = [...plakalar, ...(plakaGecerli(giris) && !plakalar.includes(giris) ? [giris] : [])];
      o('liste').innerHTML = plakalar.map((p, i) => `<li><span>${esc(p)}</span><button type="button" data-x="${i}" aria-label="${esc(p)} plakasını çıkar">×</button></li>`).join('');
      const firma = o('firma').value.trim().replace(/[<>]/g, '');
      let msg;
      if (!liste.length) msg = `Merhaba ${d.isletme.ad}, aracımın ${istek.mesaj} istiyorum. Plaka: `;
      else if (liste.length === 1) msg = `Merhaba ${d.isletme.ad}, ${liste[0]} plakalı aracın ${istek.mesaj} istiyorum.`;
      else msg = `Merhaba ${d.isletme.ad}, şu plakalı araçların ${istek.mesaj} istiyorum: ${liste.join(', ')}.`;
      if (firma) msg += `\nFirma: ${firma}`;
      o('onizle').textContent = msg;
      o('wa').href = waHref(d, msg);
    };
    const ekle = () => {
      const p = plakaBicim(o('plaka').value);
      if (!p) return hata('Önce plaka yazılır.');
      if (!plakaGecerli(p)) return hata('Plaka "06 ABC 123" biçiminde yazılır.');
      if (plakalar.includes(p)) return hata('Bu plaka listede var.');
      if (plakalar.length >= 20) return hata('Tek mesajda en fazla 20 plaka gönderilir.');
      plakalar.push(p);
      o('plaka').value = '';
      hata('');
      ciz();
      if (!reducedMotion) gsap.from(o('liste').lastElementChild, { scale: 0.8, autoAlpha: 0, duration: 0.3, ease: 'power3.out', clearProps: 'all' });
    };
    o('plaka').addEventListener('input', () => {
      const b = plakaBicim(o('plaka').value);
      if (b !== o('plaka').value) o('plaka').value = b;
      hata('');
      ciz();
    });
    o('plaka').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ekle(); } });
    o('ekle').addEventListener('click', ekle);
    o('firma').addEventListener('input', ciz);
    el.addEventListener('click', (e) => {
      const x = e.target.closest('[data-x]');
      if (x) { plakalar.splice(Number(x.dataset.x), 1); ciz(); return; }
      const b = e.target.closest('[data-istek]');
      if (b) {
        istek = K.istekler.find((i) => i.id === b.dataset.istek);
        el.querySelectorAll('[data-istek]').forEach((y) => y.setAttribute('aria-pressed', String(y === b)));
        ciz();
      }
    });
    ciz();
    if (!reducedMotion) {
      gsap.from(el.querySelectorAll('.bp-ak__alanlar > div'), {
        x: -16, autoAlpha: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out', clearProps: 'transform,opacity,visibility',
        scrollTrigger: { trigger: el.querySelector('.bp-ak__alanlar'), start: 'top 85%', toggleActions: 'play none none none' },
      });
    }
  },
};
