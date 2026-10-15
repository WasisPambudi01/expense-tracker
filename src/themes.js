// Tema warna aplikasi.
//
// Setiap tema berisi:
//   vars    : variabel CSS (dipasang lewat style di elemen paling luar, jadi berlaku juga di halaman login)
//   palette : 12 warna kategori. Kategori menyimpan INDEKS warna (`ci`), bukan kode hex, sehingga
//             warna kategori ikut berganti saat tema diganti.
//
// Aturan peran warna (semua teks sudah diuji >= 4,5:1 di atas --bg dan --surface):
//   --ink / --ink-soft ........ teks dan garis tepi
//   --primary / --on-primary .. isian utama (tombol, kartu ringkasan) dan teks di atasnya
//   --ok / --warn-fill ........ isian bar anggaran (aman / hampir habis); --danger untuk melebihi
//   --accent ................... HANYA dekoratif (bayangan, garis): kontrasnya dengan teks bisa rendah
//   --warn-text / --income .... pengganti --accent / --ok bila warna itu dipakai untuk teks

export const PALETTE_SIZE = 12;
export const DEFAULT_THEME_ID = "laguna";
export const THEME_STORAGE_KEY = "catatan-keuangan:tema";

export const THEMES = [
  {
    id: "laguna",
    name: "Laguna",
    desc: "Biru, teal, dan pink",
    swatch: ["#24A19C", "#FAEEE7", "#325288", "#D96098"], // 4 warna palet asli
    scheme: "light",
    themeColor: "#325288", // warna bilah browser di HP
    vars: {
      "--bg": "#FAEEE7",
      "--surface": "#FFF8F4",
      "--ink": "#325288",
      "--ink-soft": "#5A6A8C",
      "--line": "#E8D3C8",
      "--track": "#F0DCD1",
      "--dots": "#F0DCD1",
      "--primary": "#325288",
      "--on-primary": "#FFF8F4",
      "--ok": "#24A19C",
      "--accent": "#D96098",
      "--warn-fill": "#D96098",
      "--warn-text": "#A8326F",
      "--income": "#0B6F6A",
      "--savings": "#0B6F6A",
      "--danger": "#B3261E",
      "--hero-label": "#F0DCD1",
      "--hero-pos": "#FFF8F4",
      "--hero-gold": "#8EE0DB",
      "--hero-neg": "#FFB0C8",
      "--overlay": "rgba(50,82,136,0.5)",
      "--stripe": "rgba(255,248,244,0.28)",
    },
    palette: ["#325288", "#D96098", "#24A19C", "#1F3358", "#8FA8D6", "#F0A6C4", "#17706C", "#A8326F", "#7FD0CC", "#5A6FA3", "#6B3E5C", "#B9C7E2"],
  },
  {
    id: "anggur",
    name: "Anggur Segar",
    desc: "Plum dan hijau pucuk",
    swatch: ["#450C3F", "#B9D175", "#D9EFBD", "#F5FBDA"], // 4 warna palet asli
    scheme: "light",
    themeColor: "#450C3F", // warna bilah browser di HP
    vars: {
      "--bg": "#D9EFBD",
      "--surface": "#F5FBDA",
      "--ink": "#450C3F",
      "--ink-soft": "#7A5E6C",
      "--line": "#DCDAC4",
      "--track": "#CAD8B0",
      "--dots": "#CFDFB4",
      "--primary": "#450C3F",
      "--on-primary": "#F5FBDA",
      "--ok": "#4F7A14",
      "--accent": "#7FA13A",
      "--warn-fill": "#A64D97",
      "--warn-text": "#8E2F82",
      "--income": "#2F6B0F",
      "--savings": "#2F6B0F",
      "--danger": "#A31D15",
      "--hero-label": "#D9EFBD",
      "--hero-pos": "#F5FBDA",
      "--hero-gold": "#B9D175",
      "--hero-neg": "#FFB3D1",
      "--overlay": "rgba(69,12,63,0.5)",
      "--stripe": "rgba(245,251,218,0.28)",
    },
    palette: ["#450C3F", "#4F7A14", "#8F7E7E", "#A64D97", "#5C683A", "#74496F", "#6B4D51", "#220620", "#939063", "#A2869F", "#6C785E", "#7F6E5A"],
  },
  {
    id: "hutan",
    name: "Hutan Malam",
    desc: "Tema gelap, hijau dan mint",
    swatch: ["#091413", "#285A48", "#408A71", "#B0E4CC"], // 4 warna palet asli
    scheme: "dark",
    themeColor: "#091413", // warna bilah browser di HP
    vars: {
      "--bg": "#091413",
      "--surface": "#0F2420",
      "--ink": "#B0E4CC",
      "--ink-soft": "#6D9182",
      "--line": "#21433A",
      "--track": "#1B3A31",
      "--dots": "#11241F",
      "--primary": "#285A48",
      "--on-primary": "#E8FAF2",
      "--ok": "#408A71",
      "--accent": "#408A71",
      "--warn-fill": "#D9A441",
      "--warn-text": "#F0C36A",
      "--income": "#6FE3A8",
      "--savings": "#6FE3A8",
      "--danger": "#FF8A80",
      "--hero-label": "#B0E4CC",
      "--hero-pos": "#E8FAF2",
      "--hero-gold": "#F0C36A",
      "--hero-neg": "#FFB3AB",
      "--overlay": "rgba(0,0,0,0.6)",
      "--stripe": "rgba(232,250,242,0.18)",
    },
    palette: ["#F0C36A", "#34725C", "#D8F2E6", "#FFB3AB", "#6FE3A8", "#848A89", "#78B79E", "#587266", "#A0C4B8", "#B0E4CC", "#D9A441", "#799F8F"],
  },
  {
    id: "navy",
    name: "Navy Klasik",
    desc: "Navy, krem, dan cokelat",
    swatch: ["#0A2947", "#F3E4C9", "#D3D4C0", "#8B5E3C"], // 4 warna palet asli
    scheme: "light",
    themeColor: "#0A2947", // warna bilah browser di HP
    vars: {
      "--bg": "#F3E4C9",
      "--surface": "#FAF2E1",
      "--ink": "#0A2947",
      "--ink-soft": "#46586E",
      "--line": "#C9C8B0",
      "--track": "#D3D4C0",
      "--dots": "#D3D4C0",
      "--primary": "#0A2947",
      "--on-primary": "#F3E4C9",
      "--ok": "#0A2947",
      "--accent": "#8B5E3C",
      "--warn-fill": "#8B5E3C",
      "--warn-text": "#7A5033",
      "--income": "#7F5535",
      "--savings": "#2C4F74",
      "--danger": "#A63A2B",
      "--hero-label": "#D3D4C0",
      "--hero-pos": "#FAF2E1",
      "--hero-gold": "#D9A877",
      "--hero-neg": "#F2A58E",
      "--overlay": "rgba(10,41,71,0.55)",
      "--stripe": "rgba(243,228,201,0.28)",
    },
    palette: ["#0A2947", "#8B5E3C", "#4F7396", "#B88458", "#6B6D52", "#C9A56A", "#2C4F74", "#5C3A22", "#8DA2B7", "#A59E7F", "#3A3C2B", "#D2A27E"],
  },
  {
    id: "mint",
    name: "Mint & Jingga",
    desc: "Mint, kuning pucat, dan jingga",
    swatch: ["#C1EBE9", "#FFF7C5", "#F4AE52", "#4F252E"], // 4 warna palet asli
    scheme: "light",
    themeColor: "#4F252E", // warna bilah browser di HP
    vars: {
      "--bg": "#C1EBE9",
      "--surface": "#FFF7C5",
      "--ink": "#4F252E",
      "--ink-soft": "#705E64",
      "--line": "#E6DAB0",
      "--track": "#DDF3F1",
      "--dots": "#B9DDDC",
      "--primary": "#4F252E",
      "--on-primary": "#FFF7C5",
      "--ok": "#2E8C86",
      "--accent": "#F4AE52",
      "--warn-fill": "#E0861A",
      "--warn-text": "#8A4B00",
      "--income": "#1B6B66",
      "--savings": "#1B6B66",
      "--danger": "#B3261E",
      "--hero-label": "#C1EBE9",
      "--hero-pos": "#FFF7C5",
      "--hero-gold": "#F4AE52",
      "--hero-neg": "#FFB3A8",
      "--overlay": "rgba(79,37,46,0.5)",
      "--stripe": "rgba(255,247,197,0.28)",
    },
    palette: ["#281217", "#E0861A", "#2E8C86", "#7A5729", "#A79296", "#BE8146", "#807C62", "#7B5C62", "#607674", "#4F252E", "#A78E7A", "#85523A"],
  },
];

// Palet kategori dari versi-versi aplikasi sebelumnya (warna lama disimpan sebagai hex).
// Indeks yang sama = warna yang sama, jadi hex lama bisa diubah menjadi indeks `ci`.
const LEGACY_PALETTES = [
  ["#3B5D50", "#C4632B", "#7C5A8B", "#35617A", "#8A7B5E", "#C99A44", "#2E6F6B", "#B98A2E", "#4A6FA5", "#7A7A6E", "#9C4F4F", "#5C7A99"],
  ["#0A2947", "#8B5E3C", "#4F7396", "#B88458", "#6B6D52", "#C9A56A", "#2C4F74", "#5C3A22", "#8DA2B7", "#A59E7F", "#3A3C2B", "#D2A27E"],
  ["#344F1F", "#F4991A", "#6B8E3A", "#C97B0E", "#9DB36B", "#E0B96A", "#1F3312", "#D9822B", "#7A6A3A", "#F7BE6B", "#50673A", "#B8A878"],
  ["#4A503D", "#E28F83", "#8E9775", "#B5645A", "#6B7554", "#D9C48A", "#2F3427", "#F0B5AC", "#A8B08F", "#8C6A5B", "#5B6347", "#C9A98F"],
  ["#2F5755", "#432323", "#5A9690", "#8A5A5A", "#8FBDB7", "#B08B8B", "#1F3B39", "#6E3A3A", "#A8C9C5", "#7D6666", "#3F6F6B", "#C9B8B8"],
  ["#325288", "#D96098", "#24A19C", "#1F3358", "#8FA8D6", "#F0A6C4", "#17706C", "#A8326F", "#7FD0CC", "#5A6FA3", "#6B3E5C", "#B9C7E2"],
];

export const getTheme = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
export const isThemeId = (id) => THEMES.some((t) => t.id === id);

// Objek style untuk elemen paling luar. colorScheme membuat kontrol bawaan browser (kalender, scrollbar) ikut gelap/terang.
export const themeStyle = (theme) => ({ ...theme.vars, colorScheme: theme.scheme });

export const catColor = (theme, ci) => theme.palette[((ci % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE];

function colorToIndex(hex) {
  if (typeof hex !== "string") return -1;
  const h = hex.toUpperCase();
  for (const p of LEGACY_PALETTES) {
    const i = p.findIndex((c) => c.toUpperCase() === h);
    if (i >= 0) return i;
  }
  return -1;
}

// Data lama menyimpan `color` (hex); data baru menyimpan `ci` (indeks). Hex yang tidak dikenal memakai urutan kategori.
export function normalizeCategories(list) {
  return list.map(({ color, ...c }, pos) => {
    let ci = Number.isInteger(c.ci) ? c.ci : colorToIndex(color);
    if (ci < 0) ci = pos;
    return { ...c, ci: ((ci % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE };
  });
}

// Indeks warna pertama yang belum dipakai kelompok lain.
export function nextCi(list) {
  const used = new Set(list.map((c) => c.ci));
  for (let i = 0; i < PALETTE_SIZE; i++) if (!used.has(i)) return i;
  return list.length % PALETTE_SIZE;
}

export function readStoredThemeId() {
  try {
    const id = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(id) ? id : DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function storeThemeId(id) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    /* penyimpanan browser tidak tersedia: tema tetap tersimpan di akun */
  }
}
