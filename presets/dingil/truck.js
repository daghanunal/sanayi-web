// Yandan çekici + tenteli dorse: lib3d çekici ve dorsenin Cycles render'ı (sağ yandan ortografik, tekersiz,
// saydam zemin) + ayrı render edilmiş teker görselleri (kaydırınca dönerler) + brandada işletme adı (HTML).
// Görsel 2400 × 618 birimlik kadrajda çizildi; aşağıdaki değerler o kadrajın birimleridir.
import { asset } from '../../shared/core.js';

const W = 2400, H = 618;
// Görünen (sağ) taraftaki teker merkezleri ve yarıçapı (render_av.py çıktısı)
const WHEELS = [381.8, 558.0, 734.1, 1667.2, 2164.7].map((x) => [x, 512.7]);
export const WHEEL_R = 72.2;
export const IMG_W = W;
const pct = (v, of) => `${((v / of) * 100).toFixed(3)}%`;

export function truckHTML(ad) {
  const r = WHEEL_R * 1.012;
  return `
<div class="truck" role="img" aria-label="${ad} yazılı tenteli tır" style="aspect-ratio:${W}/${H}">
  <img class="truck__govde" src="${asset('/img/dingil/tir.webp')}" alt="" width="${W}" height="${H}" decoding="async" fetchpriority="high" />
  <span class="truck__ad" data-curtain style="left:${pct(60, W)};width:${pct(1800, W)};top:${pct(64, H)};height:${pct(318, H)}"><b></b></span>
  ${WHEELS.map(([x, y], i) => `<img class="truck__teker" data-wheel="${i}" src="${asset('/img/dingil/teker.webp')}" alt="" width="320" height="320" style="left:${pct(x - r, W)};top:${pct(y - r, H)};width:${pct(2 * r, W)}" />`).join('')}
  <i class="truck__lamba truck__lamba--on" data-hazard style="left:${pct(2318, W)};top:${pct(478, H)}"></i>
  <i class="truck__lamba" data-hazard style="left:${pct(1444, W)};top:${pct(410, H)}"></i>
  <i class="truck__lamba truck__lamba--arka" data-hazard style="left:${pct(52, W)};top:${pct(462, H)}"></i>
  <i class="truck__far" data-beam style="left:${pct(2372, W)};top:${pct(452, H)}"></i>
</div>`;
}
