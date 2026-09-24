// Sektöre özel modül: "Şu an açık mıyız?" ve nöbetçi eczane kartı.
import { esc, openStatus, groupedHours, telHref, icons } from '../../shared/core.js';

export const nobetDurum = {
  render(d) {
    const st = openStatus(d.saatler);
    const n = d.nobet || {};
    return `
      <section class="k-bolum nobet" aria-labelledby="nobet-baslik">
        <div class="k-kap nobet__ic">
          <div class="nobet__durum ${st.open ? 'is-acik' : 'is-kapali'}">
            <span class="nobet__lamba" aria-hidden="true"></span>
            <h2 class="nobet__baslik" id="nobet-baslik">${st.open ? 'Şu an açığız' : 'Şu an kapalıyız'}</h2>
            <p class="nobet__metin">${esc(st.text)}</p>
            <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
          </div>
          <div class="nobet__saat">
            <h3 class="k-h3">Çalışma saatleri</h3>
            <dl>${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${g}</dt><dd>${s}</dd></div>`).join('')}</dl>
          </div>
          <div class="nobet__gece">
            <h3 class="k-h3">Gece ilaç mı lazım?</h3>
            <p>Kapalı olduğumuz saatlerde bu gece nöbetçi eczaneler için ${esc(n.kaynak || 'Ankara Eczacı Odası')} listesine bakın.</p>
            <a class="k-btn" href="${esc(n.url || 'https://www.aeo.org.tr/nobetci-eczaneler')}" target="_blank" rel="noopener">Nöbetçi eczaneleri gör</a>
          </div>
        </div>
      </section>`;
  },
};
