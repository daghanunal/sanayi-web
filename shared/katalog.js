// Preset kataloğu ve satış ayarları. Saha kiti, vitrin ve presetlerdeki vitrin çubuğu bunu kullanır.

// Seçimlerin geleceği WhatsApp numarası (ülke koduyla, sadece rakam).
// TODO: gerçek satış numarasıyla değiştir.
export const SATIS_WHATSAPP = '905555555555';

export const SEKTORLER = [
  { id: 'motor', ad: 'Motor ve mekanik', ornek: 'Motor, şanzıman, bakım' },
  { id: 'boya', ad: 'Boya ve kaporta', ornek: 'Boya, göçük, pasta-cila, seramik' },
  { id: 'lastik', ad: 'Lastik ve jant', ornek: 'Lastik, jant, rot-balans' },
  { id: 'elektrik', ad: 'Oto elektrik', ornek: 'Elektrik, beyin, arıza tespit' },
  { id: 'doseme', ad: 'Döşeme', ornek: 'Koltuk, tavan, direksiyon' },
  { id: 'yedekparca', ad: 'Yedek parça', ornek: 'Orijinal ve muadil parça' },
  { id: 'rektifiye', ad: 'Rektifiye ve torna', ornek: 'Honlama, krank, kafa planyası' },
  { id: 'egzoz', ad: 'Egzoz', ornek: 'Susturucu, DPF, katalitik' },
  { id: 'cam', ad: 'Oto cam', ornek: 'Ön cam, taş izi, cam filmi' },
  { id: 'agirvasita', ad: 'Ağır vasıta', ornek: 'Kamyon, çekici, otobüs servisi' },
  { id: 'klima', ad: 'Oto klima', ornek: 'Gaz dolumu, kompresör, kaçak testi' },
  { id: 'lpg', ad: 'LPG dönüşüm', ornek: 'Dönüşüm, bakım, tank muayenesi' },
  { id: 'kilit', ad: 'Oto kilit ve anahtar', ornek: 'Yedek anahtar, immobilizer, kumanda' },
  { id: 'turbo', ad: 'Turbo', ornek: 'Revizyon, balans, intercooler' },
  { id: 'dizel', ad: 'Dizel enjektör ve pompa', ornek: 'Enjektör test, pompa, kodlama' },
  { id: 'radyator', ad: 'Radyatör ve soğutma', ornek: 'Radyatör, fan, termostat, hararet' },
  { id: 'sanziman', ad: 'Otomatik şanzıman', ornek: 'Otomatik, DSG, CVT, mekatronik' },
  { id: 'yikama', ad: 'Oto yıkama ve detay', ornek: 'İç-dış temizlik, koltuk yıkama' },
  { id: 'ekspertiz', ad: 'Oto ekspertiz', ornek: 'Alım-satım öncesi kontrol, rapor' },
  { id: 'cekici', ad: 'Çekici ve yol yardım', ornek: '7/24 çekici, akü takviye' },
];

// Vitrinde sektör olarak görünmeyen, ayrı satılan işler (saha kitinde "Özel işler").
export const OZEL_SEKTORLER = [
  { id: 'eczane', ad: 'Eczane' },
  { id: 'alci', ad: 'Alçı üreticisi' },
  { id: 'veteriner', ad: 'Veteriner kliniği' },
  { id: 'dis', ad: 'Diş kliniği' },
  { id: 'restoran', ad: 'Ocakbaşı restoran' },
  { id: 'mimarlik', ad: 'Mimarlık ofisi' },
];

// Ailelerin sırası: normal cihazda sinematik önce, zayıf cihazda klasik önce.
export const GRUP_SIRASI = ['sinematik', 'kurumsal', 'kinetik', 'klasik'];

export const PRESETS = [
  { id: 'silindir', grup: 'sinematik', sektor: 'motor', ad: 'Silindir', icin: 'Motor, mekanik, şanzıman', renk: '#ff5a17' },
  { id: 'vernik', grup: 'sinematik', sektor: 'boya', ad: 'Vernik', icin: 'Boya, kaporta, detaylı temizlik, seramik kaplama', renk: '#b9c7ff' },
  { id: 'drift', grup: 'sinematik', sektor: 'lastik', ad: 'Drift', icin: 'Lastik, jant, rot-balans', renk: '#ffd000' },
  { id: 'voltaj', grup: 'sinematik', sektor: 'elektrik', ad: 'Voltaj', icin: 'Oto elektrik, elektronik, arıza tespit', renk: '#5ee6ff' },
  { id: 'kapitone', grup: 'sinematik', sektor: 'doseme', ad: 'Kapitone', icin: 'Döşeme, köklü aile işletmeleri', renk: '#c0763f' },
  { id: 'depo', grup: 'sinematik', sektor: 'yedekparca', ad: 'Depo', icin: 'Yedek parça', renk: '#d9a441' },
  { id: 'mikron', grup: 'sinematik', sektor: 'rektifiye', ad: 'Mikron', icin: 'Rektifiye ve torna', renk: '#7fb2d9' },
  { id: 'manifold', grup: 'sinematik', sektor: 'egzoz', ad: 'Manifold', icin: 'Egzoz, DPF, katalitik', renk: '#9b7fd9' },
  { id: 'kristal', grup: 'sinematik', sektor: 'cam', ad: 'Kristal', icin: 'Oto cam', renk: '#8fe3e0' },
  { id: 'tonaj', grup: 'sinematik', sektor: 'agirvasita', ad: 'Tonaj', icin: 'Ağır vasıta servisi', renk: '#e0b22f' },
  { id: 'tork', grup: 'kinetik', sektor: 'motor', ad: 'Tork', icin: 'Motor, mekanik, şanzıman', renk: '#1630e8' },
  { id: 'pigment', grup: 'kinetik', sektor: 'boya', ad: 'Pigment', icin: 'Boya, kaporta, detaylı temizlik', renk: '#ff4f8b' },
  { id: 'asfalt', grup: 'kinetik', sektor: 'lastik', ad: 'Asfalt', icin: 'Lastik, jant, rot-balans', renk: '#d8332a' },
  { id: 'amper', grup: 'kinetik', sektor: 'elektrik', ad: 'Amper', icin: 'Oto elektrik, arıza tespit', renk: '#ffab1f' },
  { id: 'ilmek', grup: 'kinetik', sektor: 'doseme', ad: 'İlmek', icin: 'Döşeme', renk: '#1d5a45' },
  { id: 'garaj', grup: 'klasik', sektor: 'motor', ad: 'Garaj', icin: 'Motor, mekanik, şanzıman', renk: '#e8742a' },
  { id: 'showroom', grup: 'klasik', sektor: 'boya', ad: 'Showroom', icin: 'Boya, kaporta, detaylı temizlik, seramik kaplama', renk: '#c9d6df' },
  { id: 'pist', grup: 'klasik', sektor: 'lastik', ad: 'Pist', icin: 'Lastik, jant, rot-balans', renk: '#f2c230' },
  { id: 'devre', grup: 'klasik', sektor: 'elektrik', ad: 'Devre', icin: 'Oto elektrik, elektronik, arıza tespit', renk: '#3fa9f5' },
  { id: 'usta', grup: 'klasik', sektor: 'doseme', ad: 'Usta', icin: 'Döşeme, köklü aile işletmeleri', renk: '#a8552f' },
  { id: 'raf', grup: 'klasik', sektor: 'yedekparca', ad: 'Raf', icin: 'Yedek parça', renk: '#d7262e' },
  { id: 'tezgah', grup: 'klasik', sektor: 'rektifiye', ad: 'Tezgâh', icin: 'Rektifiye ve torna', renk: '#c53a25' },
  { id: 'susturucu', grup: 'klasik', sektor: 'egzoz', ad: 'Susturucu', icin: 'Egzoz, DPF, katalitik', renk: '#1f9d6b' },
  { id: 'seffaf', grup: 'klasik', sektor: 'cam', ad: 'Şeffaf', icin: 'Oto cam', renk: '#f2a60c' },
  { id: 'dingil', grup: 'klasik', sektor: 'agirvasita', ad: 'Dingil', icin: 'Ağır vasıta servisi', renk: '#d4202c' },
  { id: 'recete', grup: 'klasik', sektor: 'eczane', ad: 'Reçete', icin: 'Mahalle eczanesi', renk: '#1c6f40' },
  { id: 'perdah', grup: 'klasik', sektor: 'alci', ad: 'Perdah', icin: 'Alçıbay için sade yeniden tasarım', renk: '#f29d20' },
  { id: 'kurumsal-motor', grup: 'kurumsal', sektor: 'motor', ad: 'Kurumsal Filo', icin: 'Motor ve mekanik, kurumsal görünüm', renk: '#0f5a45' },
  { id: 'kurumsal-boya', grup: 'kurumsal', sektor: 'boya', ad: 'Kurumsal Ekspertiz', icin: 'Boya ve kaporta, kurumsal görünüm', renk: '#d8c29a' },
  { id: 'kurumsal-lastik', grup: 'kurumsal', sektor: 'lastik', ad: 'Kurumsal Lastik Oteli', icin: 'Lastik ve jant, kurumsal görünüm', renk: '#ffc800' },
  { id: 'kurumsal-elektrik', grup: 'kurumsal', sektor: 'elektrik', ad: 'Kurumsal Teşhis', icin: 'Oto elektrik, kurumsal görünüm', renk: '#2449ff' },
  { id: 'kurumsal-doseme', grup: 'kurumsal', sektor: 'doseme', ad: 'Kurumsal Atölye', icin: 'Döşeme, kurumsal görünüm', renk: '#6e1b27' },
  { id: 'kurumsal-yedekparca', grup: 'kurumsal', sektor: 'yedekparca', ad: 'Kurumsal Katalog', icin: 'Yedek parça, kurumsal görünüm', renk: '#1f3fd1' },
  { id: 'kurumsal-rektifiye', grup: 'kurumsal', sektor: 'rektifiye', ad: 'Kurumsal Ölçü', icin: 'Rektifiye ve torna, kurumsal görünüm', renk: '#f4c542' },
  { id: 'kurumsal-egzoz', grup: 'kurumsal', sektor: 'egzoz', ad: 'Kurumsal Muayene', icin: 'Egzoz, kurumsal görünüm', renk: '#b83d12' },
  { id: 'kurumsal-cam', grup: 'kurumsal', sektor: 'cam', ad: 'Kurumsal Kasko', icin: 'Oto cam, kurumsal görünüm', renk: '#0b6e99' },
  { id: 'kurumsal-agirvasita', grup: 'kurumsal', sektor: 'agirvasita', ad: 'Kurumsal Filo Servis', icin: 'Ağır vasıta, kurumsal görünüm', renk: '#f5b700' },
  { id: 'kurumsal-eczane', grup: 'kurumsal', sektor: 'eczane', ad: 'Kurumsal Nöbet', icin: 'Eczane, kurumsal görünüm', renk: '#1d5c45' },
  { id: 'kurumsal-alci', grup: 'kurumsal', sektor: 'alci', ad: 'Kurumsal Fabrika', icin: 'Alçıbay, kurumsal görünüm', renk: '#f29d20' },
  { id: 'kurumsal-motor2', grup: 'kurumsal', sektor: 'motor', ad: 'İş Emri', icin: 'Motor ve mekanik', renk: '#d42a2f' },
  { id: 'motor-klasik2', grup: 'klasik', sektor: 'motor', ad: 'Conta', icin: 'Motor ve mekanik', renk: '#d4281c' },
  { id: 'boya-klasik2', grup: 'klasik', sektor: 'boya', ad: 'Katman', icin: 'Boya ve kaporta', renk: '#ff4d1a' },
  { id: 'kurumsal-boya2', grup: 'kurumsal', sektor: 'boya', ad: 'Katman', icin: 'Boya ve kaporta, ölçüm odaklı kurumsal site', renk: '#1b2bd0' },
  { id: 'kurumsal-elektrik2', grup: 'kurumsal', sektor: 'elektrik', ad: 'Huzme', icin: 'Oto elektrik, far ayarı, akü, kurumsal görünüm', renk: '#ffd21a' },
  { id: 'motor-sinematik2', grup: 'sinematik', sektor: 'motor', ad: 'Saplama', icin: 'Motor ve mekanik', renk: '#c3121b' },
  { id: 'lastik-klasik2', grup: 'klasik', sektor: 'lastik', ad: 'Profil', icin: 'Lastik, jant, rot-balans', renk: '#2143e0' },
  { id: 'elektrik-klasik2', grup: 'klasik', sektor: 'elektrik', ad: 'Demet', icin: 'Oto elektrik', renk: '#e2261c' },
  { id: 'boya-sinematik2', grup: 'sinematik', sektor: 'boya', ad: 'Yansıma', icin: 'Boya, kaporta, boyasız göçük, pasta ve seramik', renk: '#4b1fff' },
  { id: 'lastik-sinematik2', grup: 'sinematik', sektor: 'lastik', ad: 'Kar İzi', icin: 'Lastik, jant, rot-balans', renk: '#ff4d00' },
  { id: 'kurumsal-lastik2', grup: 'kurumsal', sektor: 'lastik', ad: 'Halka', icin: 'Lastik ve jant, yuvarlak kurumsal görünüm', renk: '#5a3cf0' },
  { id: 'elektrik-sinematik2', grup: 'sinematik', sektor: 'elektrik', ad: 'Bobin', icin: 'Oto elektrik, arıza tespit, sargı ve dinamo', renk: '#e0894c' },
  { id: 'kurumsal-doseme2', grup: 'kurumsal', sektor: 'doseme', ad: 'Pepita', icin: 'Oto döşeme, kurumsal', renk: '#c2185b' },
  { id: 'doseme-sinematik2', grup: 'sinematik', sektor: 'doseme', ad: 'Örtü', icin: 'Oto döşeme', renk: '#1f2bdb' },
  { id: 'yedekparca-klasik2', grup: 'klasik', sektor: 'yedekparca', ad: 'Bijon', icin: 'Yedek parça', renk: '#4fe0b5' },
  { id: 'doseme-klasik2', grup: 'klasik', sektor: 'doseme', ad: 'Nappa', icin: 'Oto döşeme', renk: '#ff5a1f' },
  { id: 'egzoz-klasik2', grup: 'klasik', sektor: 'egzoz', ad: 'Desibel', icin: 'Egzoz, susturucu, muayene', renk: '#ff2e63' },
  { id: 'yedekparca-sinematik2', grup: 'sinematik', sektor: 'yedekparca', ad: 'Kaide', icin: 'Yedek parça', renk: '#5b2bff' },
  { id: 'kurumsal-yedekparca2', grup: 'kurumsal', sektor: 'yedekparca', ad: 'Şekil 1', icin: 'Yedek parça (kurumsal, patlatılmış çizim)', renk: '#ff4a1c' },
  { id: 'kurumsal-rektifiye2', grup: 'kurumsal', sektor: 'rektifiye', ad: 'Tav Rengi', icin: 'Rektifiye ve torna, kurumsal görünüm', renk: '#5a2d91' },
  { id: 'rektifiye-klasik2', grup: 'klasik', sektor: 'rektifiye', ad: 'Ayna', icin: 'Rektifiye ve torna', renk: '#00a39a' },
  { id: 'egzoz-sinematik2', grup: 'sinematik', sektor: 'egzoz', ad: 'Duman Dili', icin: 'Egzoz', renk: '#ff3b5c' },
  { id: 'rektifiye-sinematik2', grup: 'sinematik', sektor: 'rektifiye', ad: 'Tav', icin: 'Rektifiye ve torna', renk: '#6b34d4' },
  { id: 'cam-klasik2', grup: 'klasik', sektor: 'cam', ad: 'Vantuz', icin: 'Oto cam', renk: '#e3202c' },
  { id: 'kurumsal-cam2', grup: 'kurumsal', sektor: 'cam', ad: 'Polarize', icin: 'Oto cam', renk: '#d90f5a' },
  { id: 'cam-sinematik2', grup: 'sinematik', sektor: 'cam', ad: 'Prizma', icin: 'Oto cam', renk: '#ff4d8d' },
  { id: 'kurumsal-agirvasita2', grup: 'kurumsal', sektor: 'agirvasita', ad: 'Otoyol', icin: 'Ağır vasıta', renk: '#00704a' },
  { id: 'kurumsal-egzoz2', grup: 'kurumsal', sektor: 'egzoz', ad: 'Ozalit', icin: 'Egzoz, DPF, katalitik (kurumsal)', renk: '#1c3f9e' },
  { id: 'agirvasita-klasik2', grup: 'klasik', sektor: 'agirvasita', ad: 'Otoyol', icin: 'Ağır vasıta', renk: '#006b3c' },
  { id: 'agirvasita-sinematik2', grup: 'sinematik', sektor: 'agirvasita', ad: 'Gece Seferi', icin: 'Ağır vasıta', renk: '#0b7a4b' },
  { id: 'yedekparca-kinetik', grup: 'kinetik', sektor: 'yedekparca', ad: 'Şasi Afiş', icin: 'Oto yedek parça', renk: '#ff2e88' },
  { id: 'egzoz-kinetik', grup: 'kinetik', sektor: 'egzoz', ad: 'Desibel', icin: 'Egzoz, DPF ve susturucu', renk: '#ff5a1f' },
  { id: 'rektifiye-kinetik', grup: 'kinetik', sektor: 'rektifiye', ad: 'Talaş', icin: 'Rektifiye ve torna', renk: '#ff5a1a' },
  { id: 'agirvasita-kinetik', grup: 'kinetik', sektor: 'agirvasita', ad: 'Konvoy', icin: 'Ağır vasıta', renk: '#0b6e4f' },
  { id: 'alci-kinetik', grup: 'kinetik', sektor: 'alci', ad: 'Priz', icin: 'Alçıbay (yapı alçısı üreticisi)', renk: '#1f33d6' },
  { id: 'eczane-kinetik', grup: 'kinetik', sektor: 'eczane', ad: 'Kapsül', icin: 'Mahalle eczanesi', renk: '#5b2cff' },
  { id: 'lpg-sinematik', grup: 'sinematik', sektor: 'lpg', ad: 'Mavi Hat', icin: 'LPG dönüşüm', renk: '#2447ff' },
  { id: 'lpg-klasik', grup: 'klasik', sektor: 'lpg', ad: 'Dolum', icin: 'LPG dönüşüm', renk: '#f0531c' },
  { id: 'cam-kinetik', grup: 'kinetik', sektor: 'cam', ad: 'Şangır', icin: 'Oto cam', renk: '#ff5b1f' },
  { id: 'kurumsal-lpg', grup: 'kurumsal', sektor: 'lpg', ad: 'Tüp Yeşili', icin: 'LPG dönüşüm', renk: '#1fd17a' },
  { id: 'klima-klasik', grup: 'klasik', sektor: 'klima', ad: 'Ayaz', icin: 'Oto klima', renk: '#16a6e0' },
  { id: 'kurumsal-klima', grup: 'kurumsal', sektor: 'klima', ad: 'Termal Göz', icin: 'Oto klima', renk: '#00a5b8' },
  { id: 'kurumsal-turbo', grup: 'kurumsal', sektor: 'turbo', ad: 'Isıl Kesit', icin: 'Turbo revizyon', renk: '#e8491d' },
  { id: 'klima-sinematik', grup: 'sinematik', sektor: 'klima', ad: 'Kırağı', icin: 'Oto klima', renk: '#0aa2c9' },
  { id: 'turbo-klasik', grup: 'klasik', sektor: 'turbo', ad: 'Salyangoz', icin: 'Turbo revizyon', renk: '#5b34a8' },
  { id: 'turbo-sinematik', grup: 'sinematik', sektor: 'turbo', ad: 'Girdap', icin: 'Turbo', renk: '#ff6b1c' },
  { id: 'sanziman-klasik', grup: 'klasik', sektor: 'sanziman', ad: 'Kademe', icin: 'Otomatik şanzıman', renk: '#d7193f' },
  { id: 'dis-klasik', grup: 'klasik', sektor: 'dis', ad: 'Ayna', icin: 'Diş kliniği', renk: '#34d6a6' },
  { id: 'kurumsal-dis', grup: 'kurumsal', sektor: 'dis', ad: 'Diş Haritası', icin: 'Diş kliniği', renk: '#de3d66' },
  { id: 'sanziman-sinematik', grup: 'sinematik', sektor: 'sanziman', ad: 'Planet', icin: 'Otomatik şanzıman', renk: '#ff2e4d' },
  { id: 'kurumsal-sanziman', grup: 'kurumsal', sektor: 'sanziman', ad: 'Vites Kaydı', icin: 'Otomatik şanzıman', renk: '#ff9a1f' },
  { id: 'ekspertiz-klasik', grup: 'klasik', sektor: 'ekspertiz', ad: 'Mühür', icin: 'Oto ekspertiz', renk: '#5b34e0' },
  { id: 'kurumsal-ekspertiz', grup: 'kurumsal', sektor: 'ekspertiz', ad: 'Ölçüm Föyü', icin: 'Oto ekspertiz', renk: '#17c28f' },
  { id: 'dis-sinematik', grup: 'sinematik', sektor: 'dis', ad: 'Işık Masası', icin: 'Diş kliniği', renk: '#ff5d7a' },
  { id: 'cekici-klasik', grup: 'klasik', sektor: 'cekici', ad: 'İkaz', icin: 'Çekici ve yol yardım', renk: '#e3241b' },
  { id: 'cekici-sinematik', grup: 'sinematik', sektor: 'cekici', ad: 'Gece Çağrısı', icin: 'Çekici ve yol yardım', renk: '#ffb21e' },
  { id: 'ekspertiz-sinematik', grup: 'sinematik', sektor: 'ekspertiz', ad: 'Tarama Kapısı', icin: 'Oto ekspertiz', renk: '#1ed69b' },
  { id: 'kurumsal-radyator', grup: 'kurumsal', sektor: 'radyator', ad: 'Bakır Petek', icin: 'Radyatör ve soğutma', renk: '#c4561a' },
  { id: 'kurumsal-cekici', grup: 'kurumsal', sektor: 'cekici', ad: 'Reflektör', icin: 'Çekici ve yol yardım', renk: '#c8f031' },
  { id: 'radyator-klasik', grup: 'klasik', sektor: 'radyator', ad: 'Petek', icin: 'Radyatör ve soğutma', renk: '#3fe196' },
  { id: 'yikama-klasik', grup: 'klasik', sektor: 'yikama', ad: 'Çekpas', icin: 'Oto yıkama ve detay', renk: '#e5177e' },
  { id: 'radyator-sinematik', grup: 'sinematik', sektor: 'radyator', ad: 'Kabarcık', icin: 'Radyatör ve soğutma', renk: '#ff3d7f' },
  { id: 'veteriner-klasik', grup: 'klasik', sektor: 'veteriner', ad: 'Burun Buruna', icin: 'Veteriner kliniği', renk: '#f2641f' },
  { id: 'veteriner-sinematik', grup: 'sinematik', sektor: 'veteriner', ad: 'Pati Karnesi', icin: 'Veteriner kliniği', renk: '#43d6b0' },
  { id: 'kurumsal-dizel', grup: 'kurumsal', sektor: 'dizel', ad: 'Menzür', icin: 'Dizel enjektör ve pompa', renk: '#f0a202' },
  { id: 'kurumsal-veteriner', grup: 'kurumsal', sektor: 'veteriner', ad: 'Pati Karnesi', icin: 'Veteriner kliniği', renk: '#0b6f6a' },
  { id: 'yikama-sinematik', grup: 'sinematik', sektor: 'yikama', ad: 'Köpük Gecesi', icin: 'Oto yıkama ve detay', renk: '#ff5c9d' },
  { id: 'kurumsal-yikama', grup: 'kurumsal', sektor: 'yikama', ad: 'Sedef', icin: 'Oto yıkama ve detay', renk: '#ff4f93' },
  { id: 'dizel-sinematik', grup: 'sinematik', sektor: 'dizel', ad: 'Pülverize', icin: 'Dizel enjektör ve pompa', renk: '#f5a524' },
  { id: 'restoran-klasik', grup: 'klasik', sektor: 'restoran', ad: 'Sofra', icin: 'Ocakbaşı restoran', renk: '#1d3fc4' },
  { id: 'dizel-klasik', grup: 'klasik', sektor: 'dizel', ad: 'Ateşleme', icin: 'Dizel enjektör ve pompa', renk: '#e0362c' },
  { id: 'kurumsal-restoran', grup: 'kurumsal', sektor: 'restoran', ad: 'Çini Sofra', icin: 'Ocakbaşı restoran', renk: '#d8361f' },
  { id: 'kurumsal-kilit', grup: 'kurumsal', sektor: 'kilit', ad: 'Diş Kodu', icin: 'Oto kilit ve anahtar', renk: '#00c2b3' },
  { id: 'restoran-sinematik', grup: 'sinematik', sektor: 'restoran', ad: 'Köz Saati', icin: 'Ocakbaşı restoran', renk: '#ff5d1f' },
  { id: 'kilit-sinematik', grup: 'sinematik', sektor: 'kilit', ad: 'Kesme Hattı', icin: 'Oto kilit ve anahtar', renk: '#e8b04e' },
  { id: 'kilit-klasik', grup: 'klasik', sektor: 'kilit', ad: 'Pim Hizası', icin: 'Oto kilit ve anahtar', renk: '#1a2fb0' },
  { id: 'mimarlik-klasik', grup: 'klasik', sektor: 'mimarlik', ad: 'Ozalit', icin: 'Mimarlık ofisi', renk: '#3b35d4' },
  { id: 'mimarlik-sinematik', grup: 'sinematik', sektor: 'mimarlik', ad: 'Ozalit', icin: 'Mimarlık ofisi', renk: '#e9ff70' },
  { id: 'kurumsal-mimarlik', grup: 'kurumsal', sektor: 'mimarlik', ad: 'Pafta', icin: 'Mimarlık ofisi', renk: '#2f3cf5' },
  { id: 'eczane', grup: 'ozel', sektor: 'eczane', ad: 'Eczane', icin: 'Mahalle eczanesi', renk: '#3fbf8a' },
  { id: 'alcibay', grup: 'ozel', sektor: 'alci', ad: 'Alçıbay', icin: 'Alçıbay için yeniden tasarım önerisi', renk: '#e8e4dc' },
];

// Henüz yapılmamış ya da yayına alınmamış presetler burada gizlenir.
export const HAZIR_OLMAYAN = new Set([]);
export const hazirPresetler = () => PRESETS.filter((p) => !HAZIR_OLMAYAN.has(p.id));

export const presetById = (id) => PRESETS.find((p) => p.id === id);

// 0532 123 45 67 → 905321234567
export const toWhatsapp = (tel) => {
  let n = String(tel).replace(/\D/g, '');
  if (n.startsWith('0')) n = n.slice(1);
  if (n.length === 10) n = '90' + n;
  return n;
};

// Zayıf telefonda sinematik (3D) tasarımlar ağır gelebilir; önce klasiği öner.
export const zayifCihaz = () => {
  const nav = navigator;
  return (
    (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) ||
    (nav.deviceMemory && nav.deviceMemory <= 3) ||
    nav.connection?.saveData === true
  );
};
