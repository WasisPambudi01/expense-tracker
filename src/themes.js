// Tema warna aplikasi.
//
// Setiap tema berisi:
//   vars    : variabel CSS (dipasang lewat style di elemen paling luar, jadi berlaku juga di halaman login)
//   palette : 12 warna kategori. Kategori menyimpan INDEKS warna (`ci`), bukan kode hex, sehingga
//             warna kategori ikut berganti saat tema diganti.
//
// Beauties dan Retro berbasis palet warna; Terang dan Gelap netral (abu grafit/putih) dengan warna status konvensional.
//
// Aturan peran warna (semua teks sudah diuji >= 4,5:1 di atas --bg dan --surface):
//   --ink / --ink-soft ........ teks dan garis tepi
//   --primary / --on-primary .. isian utama (tombol, kartu ringkasan) dan teks di atasnya
//   --ok / --warn-fill ........ isian bar anggaran (aman / hampir habis); --danger untuk melebihi
//   --accent ................... HANYA dekoratif (bayangan, garis): kontrasnya dengan teks bisa rendah
//   --warn-text / --income .... pengganti --accent / --ok bila warna itu dipakai untuk teks

export const PALETTE_SIZE = 12;
export const DEFAULT_THEME_ID = "beauties";
export const THEME_STORAGE_KEY = "catatan-keuangan:tema";

export const THEMES = [
  {
    id: "beauties",
    name: "Beauties",
    desc: "Biru, teal, dan pink",
    swatch: ["#24A19C", "#FAEEE7", "#325288", "#D96098"], // 4 warna yang ditampilkan di pemilih tema
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
    palette: ["#325288", "#D96098", "#24A19C", "#1F3358", "#869EC9", "#CA8BA5", "#17706C", "#A8326F", "#67A8A5", "#5A6FA3", "#6B3E5C", "#949FB5"],
  },
  {
    id: "retro",
    name: "Retro",
    desc: "Navy, krem, dan cokelat",
    swatch: ["#0A2947", "#F3E4C9", "#D3D4C0", "#8B5E3C"], // 4 warna yang ditampilkan di pemilih tema
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
    palette: ["#0A2947", "#8B5E3C", "#4F7396", "#B88458", "#6B6D52", "#2A3644", "#2C4F74", "#5C3A22", "#8397AA", "#9B9577", "#3A3C2B", "#445868"],
  },
  {
    id: "terang",
    name: "Terang",
    desc: "Putih bersih, netral",
    swatch: ["#FFFFFF", "#F2F3F5", "#2B3036", "#1F9D6B"], // 4 warna yang ditampilkan di pemilih tema
    scheme: "light",
    themeColor: "#2B3036", // warna bilah browser di HP
    vars: {
      "--bg": "#F2F3F5",
      "--surface": "#FFFFFF",
      "--ink": "#1B1F24",
      "--ink-soft": "#6B6D71",
      "--line": "#DDE0E5",
      "--track": "#E6E8EC",
      "--dots": "#E4E6EA",
      "--primary": "#2B3036",
      "--on-primary": "#FFFFFF",
      "--ok": "#1F9D6B",
      "--accent": "#8E96A3",
      "--warn-fill": "#D18C12",
      "--warn-text": "#8A5A00",
      "--income": "#17744A",
      "--savings": "#2A62A8",
      "--danger": "#B3261E",
      "--hero-label": "#CDD2D9",
      "--hero-pos": "#FFFFFF",
      "--hero-gold": "#F2C14E",
      "--hero-neg": "#FFB3AB",
      "--overlay": "rgba(27,31,36,0.5)",
      "--stripe": "rgba(255,255,255,0.28)",
    },
    palette: ["#3A6EB5", "#D9691F", "#2E9E6B", "#B5446E", "#7A5AC8", "#C99A1B", "#1F8FA3", "#C2453B", "#6B7B8C", "#8A6D3B", "#7DA32F", "#D0699E"],
  },
  {
    id: "gelap",
    name: "Gelap",
    desc: "Grafit gelap, netral",
    swatch: ["#121417", "#1B1E23", "#2F3640", "#5FD39B"], // 4 warna yang ditampilkan di pemilih tema
    scheme: "dark",
    themeColor: "#121417", // warna bilah browser di HP
    vars: {
      "--bg": "#121417",
      "--surface": "#1B1E23",
      "--ink": "#ECEEF1",
      "--ink-soft": "#86888B",
      "--line": "#2B3037",
      "--track": "#2A2F36",
      "--dots": "#1A1D22",
      "--primary": "#2F3640",
      "--on-primary": "#F3F4F6",
      "--ok": "#3DBE8B",
      "--accent": "#4A525E",
      "--warn-fill": "#E0A93B",
      "--warn-text": "#F0C060",
      "--income": "#5FD39B",
      "--savings": "#7AB2F0",
      "--danger": "#FF8F85",
      "--hero-label": "#C9CED6",
      "--hero-pos": "#F3F4F6",
      "--hero-gold": "#F0C060",
      "--hero-neg": "#FFB3AB",
      "--overlay": "rgba(0,0,0,0.6)",
      "--stripe": "rgba(255,255,255,0.18)",
    },
    palette: ["#6FA3E8", "#F29A5A", "#5FD39B", "#E27BA6", "#A78BFA", "#E6C05A", "#4FC3D9", "#F08080", "#9AA7B5", "#C9A46A", "#9ED45A", "#F0A0C8"],
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

// Tema yang sudah dihapus -> tema pengganti terdekat (tersimpan di akun/browser pengguna lama).
const LEGACY_THEME_IDS = { laguna: "beauties", navy: "retro", hutan: "gelap", anggur: "terang", mint: "terang" };

export const getTheme = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

// Id tema yang valid (id lama dipetakan ke penggantinya), atau null bila tidak dikenal.
export function resolveThemeId(id) {
  if (THEMES.some((t) => t.id === id)) return id;
  return LEGACY_THEME_IDS[id] || null;
}

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
    return resolveThemeId(localStorage.getItem(THEME_STORAGE_KEY)) || DEFAULT_THEME_ID;
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
