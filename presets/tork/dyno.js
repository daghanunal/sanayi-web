// Temsili motor eğrisi ve Türkçe yıl eki.

// Tork (Nm) devirle yükselir, orta devirde tepe yapar, yüksek devirde düşer.
const nm = (r) => 170 + 150 * Math.exp(-(((r - 3800) / 2100) ** 2));
// Beygir gücü = tork x devir / 7121
const hpMutlak = (r) => (nm(r) * r) / 7121;
const HP_TEPE = Math.max(...Array.from({ length: 61 }, (_, i) => hpMutlak(1000 + i * 100)));

export function devirEgrisi() {
  return { nm, hpMutlak, hp: (r) => hpMutlak(r) / HP_TEPE };
}

// "1996'dan", "2004'ten", "1998'den": ek, yılın okunuşundaki son kelimeye göre seçilir.
const BIRLER = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const ONLAR = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
export function tonDen(yil) {
  const n = Number(yil);
  const son = n % 10 ? BIRLER[n % 10] : n % 100 ? ONLAR[(n / 10) % 10 | 0] : n % 1000 ? 'yüz' : 'bin';
  const unlu = [...son].reverse().find((c) => 'aeıioöuü'.includes(c));
  const kalin = 'aıou'.includes(unlu);
  const sert = 'çfhkpsşt'.includes(son.at(-1));
  return `'${sert ? 't' : 'd'}${kalin ? 'a' : 'e'}n`;
}
