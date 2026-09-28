// Temsili motor eğrisi (arka plandaki süs çizgisi için; ekranda sayı olarak gösterilmez).

// Tork (Nm) devirle yükselir, orta devirde tepe yapar, yüksek devirde düşer.
const nm = (r) => 170 + 150 * Math.exp(-(((r - 3800) / 2100) ** 2));
// Beygir gücü = tork x devir / 7121
const hpMutlak = (r) => (nm(r) * r) / 7121;
const HP_TEPE = Math.max(...Array.from({ length: 61 }, (_, i) => hpMutlak(1000 + i * 100)));

export function devirEgrisi() {
  return { nm, hpMutlak, hp: (r) => hpMutlak(r) / HP_TEPE };
}
