// Jant ve kaliper seçenekleri (three.js'siz: main.js bunları sahne yüklenmeden de kullanır).
// face: elmas kesim ön yüz. null → işlenmiş parlak alüminyum kalır (iki renk), yoksa yüz de boyanır.
export const RIM_FINISHES = {
  parlakSiyah: { ad: 'Parlak siyah', color: '#0b0c0e', metalness: 0.25, roughness: 0.14, face: null },
  grafit: { ad: 'Grafit', color: '#2c2f35', metalness: 0.8, roughness: 0.36, face: null },
  fume: { ad: 'Füme', color: '#50555d', metalness: 0.9, roughness: 0.3, face: null },
  parlakGumus: { ad: 'Gümüş', color: '#c4c8ce', metalness: 0.95, roughness: 0.24, face: null },
  bronz: { ad: 'Bronz', color: '#7d5a2e', metalness: 0.92, roughness: 0.3, face: { color: '#a8844f', metalness: 0.95, roughness: 0.26 } },
  matSiyah: { ad: 'Mat siyah', color: '#18191b', metalness: 0.3, roughness: 0.74, face: { color: '#1c1d20', metalness: 0.3, roughness: 0.7 } },
};
export const CALIPER_COLORS = {
  sari: { ad: 'Sarı', color: '#ffc800' },
  kirmizi: { ad: 'Kırmızı', color: '#c8161b' },
  mavi: { ad: 'Mavi', color: '#1d5fd0' },
  siyah: { ad: 'Siyah', color: '#141414' },
};
export const DEFAULT_RIM = 'parlakSiyah';
export const DEFAULT_CAL = 'sari';
