// Çekici şasisi, üstten görünüş. Her `alt` kaydının şasi üzerindeki yeri (nokta) burada.
// Araç sağa bakar: ön dingil ve motor sağda.

export const NOKTALAR = {
  motor: [496, 120],
  sanziman: [412, 120],
  diferansiyel: [250, 120],
  fren: [296, 54],
  adblue: [362, 186],
  korug: [132, 58],
};

const tyre = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#1e2023"/>`;

export function chassisSVG() {
  return `
<svg class="sasi__svg" viewBox="0 0 600 240" aria-hidden="true">
  <!-- kabin izdüşümü -->
  <rect x="446" y="18" width="116" height="204" rx="16" fill="none" stroke="#9c988e" stroke-width="2" stroke-dasharray="6 6"/>
  <text x="504" y="236" text-anchor="middle" class="sasi__etiket">kabin</text>

  <!-- dingiller -->
  <rect x="244" y="26" width="12" height="188" fill="#6d7076"/>
  <rect x="164" y="26" width="12" height="188" fill="#6d7076"/>
  <rect x="478" y="30" width="10" height="180" fill="#6d7076"/>

  <!-- lastikler (arka çift, ön tek) -->
  ${tyre(222, 6, 56, 30)}${tyre(222, 204, 56, 30)}
  ${tyre(142, 6, 56, 30)}${tyre(142, 204, 56, 30)}
  ${tyre(462, 10, 42, 24)}${tyre(462, 206, 42, 24)}

  <!-- şasi kirişleri -->
  <rect x="36" y="82" width="530" height="10" fill="#3a3d42"/>
  <rect x="36" y="148" width="530" height="10" fill="#3a3d42"/>
  ${[90, 200, 330, 430].map((x) => `<rect x="${x}" y="82" width="8" height="76" fill="#3a3d42"/>`).join('')}

  <!-- motor, şanzıman, şaft -->
  <rect x="452" y="90" width="88" height="60" rx="8" fill="#55595f"/>
  <rect x="384" y="100" width="58" height="40" rx="6" fill="#6b6f75"/>
  <rect x="262" y="116" width="122" height="8" fill="#8a8e94"/>
  <rect x="182" y="116" width="62" height="8" fill="#8a8e94"/>

  <!-- diferansiyeller -->
  <circle cx="250" cy="120" r="19" fill="#4a4d52"/>
  <circle cx="170" cy="120" r="17" fill="#4a4d52"/>

  <!-- hava tankları, yakıt deposu -->
  <rect x="268" y="42" width="56" height="26" rx="13" fill="#9aa0a6"/>
  <rect x="332" y="36" width="92" height="34" rx="10" fill="#b9bdc2"/>

  <!-- AdBlue, akü -->
  <rect x="340" y="172" width="44" height="30" rx="8" fill="#2d6fb5"/>
  <rect x="394" y="172" width="46" height="30" rx="3" fill="#34373b"/>

  <!-- körükler -->
  <circle cx="132" cy="58" r="13" fill="#2c2e31"/>
  <circle cx="132" cy="182" r="13" fill="#2c2e31"/>
  <circle cx="92" cy="58" r="13" fill="#2c2e31"/>
  <circle cx="92" cy="182" r="13" fill="#2c2e31"/>

  <!-- beşinci teker -->
  <circle cx="210" cy="120" r="0" fill="none"/>
  <rect x="190" y="98" width="44" height="44" rx="22" fill="none" stroke="#8a8e94" stroke-width="3"/>

  <g data-noktalar></g>
</svg>`;
}
