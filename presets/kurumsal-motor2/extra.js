// Sektör modülleri: (1) arıza kabul iş emri — şikâyeti işaretle, karbon kopya iş emri canlı yazılsın, kaşe basılsın,
// WhatsApp'a hazır mesaj; (2) mesai kartı — saatler, canlı açık/kapalı, yol tarifi, yaklaşınca yüklenen harita.
import { esc, waHref, telHref, mapsHref, mapsEmbed, openStatus, GUNLER, icons, gsap, reducedMotion } from '../../shared/core.js';

const SIKAYETLER = [
  { id: 'ses', ad: 'Tıkırtı ya da vuruntu sesi', bak: 'Supap boşluğu, kol yatağı, triger gergisi' },
  { id: 'mavi', ad: 'Egzozdan mavi duman', bak: 'Kompresyon testi, segman ve supap lastiği' },
  { id: 'beyaz', ad: 'Egzozdan beyaz duman', bak: 'Silindir kapak contası, su kaçağı testi' },
  { id: 'hararet', ad: 'Hararet yapıyor', bak: 'Termostat, radyatör, devirdaim, basınç testi' },
  { id: 'yag', ad: 'Yağ eksiltiyor', bak: 'Keçe ve karter kaçağı, yağ yakma kontrolü' },
  { id: 'cekis', ad: 'Çekişten düştü', bak: 'Enjektör, yakıt pompası, hava akış, turbo' },
  { id: 'titreme', ad: 'Rölantide titriyor', bak: 'Buji, bobin, motor kulakları' },
  { id: 'lamba', ad: 'Arıza lambası yandı', bak: 'Arıza tespit cihazıyla hata kaydı okuma' },
  { id: 'vites', ad: 'Vites zor geçiyor', bak: 'Debriyaj seti, şanzıman yağı, vites telleri' },
  { id: 'bakim', ad: 'Bakım zamanı geldi', bak: 'Yağ, filtreler, buji ve sıvılar' },
];
const KMLER = ['50.000 altı', '50-100 bin', '100-200 bin', '200 bin üstü'];
const buYil = new Date().getFullYear();
const YILLAR = Array.from({ length: 22 }, (_, i) => String(buYil - i));

const kutu = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="1.5" width="21" height="21" /><path d="M6 6.5 18 17.5M18 6 6 18" /></svg>`;

export const isEmri = {
  render(d) {
    const markalar = [...(d.markalar || []), 'Diğer'];
    const no = `${String(buYil).slice(2)}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;
    return `
      <section class="k-bolum ie" aria-labelledby="ie-baslik">
        <div class="k-kap">
          <div class="ie__bas">
            <p class="ie__etiket">Form 02 · Arıza kabul</p>
            <h2 class="k-h2" id="ie-baslik" data-bol>Şikâyeti işaretleyin, iş emri kendiliğinden yazılsın.</h2>
            <p class="k-lead">Ne duyduğunuzu, ne gördüğünüzü seçin. Ustamızın ilk bakacağı yerler kâğıda düşer; bu kâğıdı WhatsApp'tan bize gönderin, fiyatı işe başlamadan söyleyelim.</p>
          </div>
          <div class="ie__ic">
            <form class="ie__form" onsubmit="return false">
              <fieldset class="ie__alan">
                <legend><span>1</span>Şikâyet</legend>
                <div class="ie__isaretler">
                  ${SIKAYETLER.map((s) => `<label class="ie__isaret"><input type="checkbox" name="s" value="${s.id}"${s.id === 'lamba' ? ' checked' : ''}>${kutu}<span>${esc(s.ad)}</span></label>`).join('')}
                </div>
              </fieldset>
              <fieldset class="ie__alan ie__alan--arac">
                <legend><span>2</span>Araç</legend>
                <label><small>Marka</small><select name="marka">${markalar.map((m, i) => `<option${i === 0 ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
                <label><small>Model yılı</small><select name="yil">${YILLAR.map((y, i) => `<option${i === 8 ? ' selected' : ''}>${y}</option>`).join('')}<option>Daha eski</option></select></label>
                <label><small>Kilometre</small><select name="km">${KMLER.map((k, i) => `<option${i === 2 ? ' selected' : ''}>${k}</option>`).join('')}</select></label>
              </fieldset>
            </form>
            <article class="ie__kagit" aria-label="İş emri önizlemesi">
              <header class="ie__kafa">
                <div><strong>İş emri</strong><span>${esc(d.isletme.ad)}</span></div>
                <p>No <b>${no}</b><br>Müşteri nüshası</p>
              </header>
              <dl class="ie__arac">
                <div><dt>Araç</dt><dd data-o="marka"></dd></div>
                <div><dt>Yıl</dt><dd data-o="yil"></dd></div>
                <div><dt>Km</dt><dd data-o="km"></dd></div>
              </dl>
              <div class="ie__satirlar">
                <p class="ie__alt">Müşteri şikâyeti</p>
                <ol class="ie__liste" data-o="sikayet"></ol>
                <p class="ie__alt">İlk bakılacaklar</p>
                <ol class="ie__liste ie__liste--bak" data-o="bak"></ol>
              </div>
              <p class="ie__fiyat"><span>Fiyat</span>Teşhisten sonra, işe başlamadan yazılır.</p>
              <p class="ie__kalem" aria-hidden="true">eski parça müşteriye!</p>
              <div class="ie__damga" aria-hidden="true"><span>Onayınız olmadan</span><b>başlanmaz</b><span>${esc(d.isletme.ad)}</span></div>
              <a class="k-btn ie__gonder" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu iş emrini gönderin</span></a>
            </article>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const form = el.querySelector('.ie__form');
    const o = (k) => el.querySelector(`[data-o="${k}"]`);
    const gonder = el.querySelector('.ie__gonder');
    const damga = el.querySelector('.ie__damga');
    const kagit = el.querySelector('.ie__kagit');
    let onceki = new Set();

    const yaz = (liste, satirlar, yeniler) => {
      liste.innerHTML = satirlar.length
        ? satirlar.map(([id, t]) => `<li data-id="${id}">${esc(t)}</li>`).join('')
        : `<li class="ie__bos">İşaretlemediniz; ustamız dinleyip yazacak.</li>`;
      if (reducedMotion) return;
      liste.querySelectorAll('li').forEach((li) => {
        if (yeniler.has(li.dataset.id)) gsap.fromTo(li, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.55, ease: 'steps(22)' });
      });
    };

    const guncelle = (ilk) => {
      const f = new FormData(form);
      const secili = SIKAYETLER.filter((s) => f.getAll('s').includes(s.id));
      const simdi = new Set(secili.map((s) => s.id));
      const yeniler = ilk ? new Set() : new Set([...simdi].filter((x) => !onceki.has(x)));
      onceki = simdi;
      o('marka').textContent = f.get('marka');
      o('yil').textContent = f.get('yil');
      o('km').textContent = f.get('km');
      yaz(o('sikayet'), secili.map((s) => [s.id, s.ad]), yeniler);
      yaz(o('bak'), secili.map((s) => [s.id, s.bak]), yeniler);
      const mesaj = [
        `Merhaba ${d.isletme.ad}, aracım için iş emri açmak istiyorum.`,
        `Araç: ${f.get('marka')}, ${f.get('yil')}, ${f.get('km')} km`,
        secili.length ? `Şikâyet: ${secili.map((s) => s.ad.toLowerCase()).join(', ')}` : 'Şikâyet: yerinde anlatırım',
        'Ne zaman getirebilirim?',
      ].join('\n');
      gonder.href = waHref(d, mesaj);
    };

    const bas = () => {
      if (reducedMotion) return;
      gsap.timeline()
        .fromTo(damga, { scale: 2.4, opacity: 0, rotate: -26 }, { scale: 1, opacity: 1, rotate: -11, duration: 0.32, ease: 'power4.in' })
        .fromTo(kagit, { y: 0 }, { y: 5, duration: 0.06, yoyo: true, repeat: 1, ease: 'power1.out' });
    };

    form.addEventListener('input', () => guncelle(false));
    gonder.addEventListener('click', bas);
    guncelle(true);
    if (!reducedMotion) {
      gsap.set(damga, { opacity: 0 });
      gsap.timeline({ scrollTrigger: { trigger: kagit, start: 'top 70%', once: true } })
        .from(kagit, { rotate: 3, y: 60, duration: 0.9, ease: 'power3.out' })
        .add(bas, '-=0.1')
        .fromTo(el.querySelector('.ie__kalem'), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.8, ease: 'power1.inOut' }, '+=0.2');
    }
  },
};

export const mesai = {
  render(d) {
    if (!d.saatler) return '';
    const st = openStatus(d.saatler);
    const bugun = new Date().getDay();
    const sira = [1, 2, 3, 4, 5, 6, 0];
    return `
      <section class="k-bolum ms" aria-labelledby="ms-baslik">
        <div class="k-kap ms__ic">
          <div class="ms__sol">
            <p class="ie__etiket">Form 03 · Mesai kartı</p>
            <h2 class="k-h2" id="ms-baslik" data-bol>Kapımız bu saatlerde açık.</h2>
            <p class="ms__durum ${st.open ? 'is-acik' : ''}"><span></span>${esc(st.text)}</p>
            <p class="ms__adres">${esc(d.iletisim.adres)}</p>
            <div class="k-butonlar">
              <a class="k-btn" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
          <div class="ms__kart">
            <div class="ms__kart-bas"><span>Gün</span><span>Giriş</span><span>Çıkış</span><span></span></div>
            <ol class="ms__gunler" data-sira>
              ${sira
                .map((g) => {
                  const s = d.saatler[g];
                  const [a, b] = s ? s.split('-') : [];
                  return `<li class="${g === bugun ? 'is-bugun' : ''}${s ? '' : ' is-kapali'}"><span>${GUNLER[g]}</span>${s ? `<time>${a}</time><time>${b}</time>` : `<em>Kapalı</em>`}${g === bugun ? '<i aria-label="bugün">bugün</i>' : ''}</li>`;
                })
                .join('')}
            </ol>
            <div class="ms__harita" data-q="${esc(mapsEmbed(d))}"><p>Harita yükleniyor</p></div>
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    const h = el.querySelector('.ms__harita');
    const io = new IntersectionObserver((e) => {
      if (!e[0].isIntersecting) return;
      h.innerHTML = `<iframe title="Konum haritası" src="${h.dataset.q}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      io.disconnect();
    }, { rootMargin: '300px' });
    io.observe(h);
    if (!reducedMotion) {
      const d = el.querySelector('.is-bugun i');
      if (d) gsap.fromTo(d, { scale: 2.2, opacity: 0, rotate: -30 }, { scale: 1, opacity: 1, rotate: -8, duration: 0.35, ease: 'power4.in', scrollTrigger: { trigger: el.querySelector('.ms__kart'), start: 'top 70%', once: true }, delay: 0.5 });
    }
  },
};

// Hero altında eğik şerit: iş akışı kayan yazı (yalnızca CSS animasyonu, kompozitörde).
const ADIMLAR = ['Dinleriz', 'Ölçeriz', 'Yazarız', 'Onayınızı alırız', 'Onarırız', 'Yolda deneriz', 'Eski parçayı teslim ederiz'];
export const serit = {
  render() {
    const grup = ADIMLAR.map((a) => `<span>${esc(a)}</span>`).join('');
    return `
      <div class="sr" aria-label="Çalışma sıramız: ${esc(ADIMLAR.join(', '))}">
        <div class="sr__bant" aria-hidden="true"><div class="sr__akis">${grup}${grup}</div></div>
      </div>`;
  },
};
