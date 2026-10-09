import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Trash2, Pencil, Settings2, X, Plus, LogOut, Mail } from "lucide-react";
import { supabase } from "./supabaseClient";

// Warna kategori: turunan dari palet krem #FAF2DA, sage #8E9775, zaitun #4A503D, salmon #E28F83.
const PALETTE = ["#4A503D", "#E28F83", "#8E9775", "#B5645A", "#6B7554", "#D9C48A", "#2F3427", "#F0B5AC", "#A8B08F", "#8C6A5B", "#5B6347", "#C9A98F"];
// Palet-palet sebelumnya (hijau awal, navy, hijau-oranye). Warna kategori tersimpan di database,
// jadi dipetakan sekali saat data dimuat (indeks sama = warna yang sama).
const OLD_PALETTES = [
  ["#3B5D50", "#C4632B", "#7C5A8B", "#35617A", "#8A7B5E", "#C99A44", "#2E6F6B", "#B98A2E", "#4A6FA5", "#7A7A6E", "#9C4F4F", "#5C7A99"],
  ["#0A2947", "#8B5E3C", "#4F7396", "#B88458", "#6B6D52", "#C9A56A", "#2C4F74", "#5C3A22", "#8DA2B7", "#A59E7F", "#3A3C2B", "#D2A27E"],
  ["#344F1F", "#F4991A", "#6B8E3A", "#C97B0E", "#9DB36B", "#E0B96A", "#1F3312", "#D9822B", "#7A6A3A", "#F7BE6B", "#50673A", "#B8A878"],
];
const COLOR_MIGRATION = Object.fromEntries(OLD_PALETTES.flatMap((old) => old.map((c, i) => [c, PALETTE[i]])));
const recolor = (list) => list.map((c) => ({ ...c, color: COLOR_MIGRATION[c.color] || c.color }));

const DEFAULT_EXPENSE = [
  { key: "Tagihan", color: PALETTE[0], subs: ["Listrik", "Air", "Internet/WiFi", "Pulsa & Paket Data", "Sewa/Kos", "Asuransi", "Lainnya"] },
  { key: "Makan & Minum", color: PALETTE[1], subs: ["Sarapan", "Makan Siang", "Makan Malam", "Kopi & Snack", "Lainnya"] },
  { key: "Belanja", color: PALETTE[2], subs: ["Kebutuhan Rumah", "Pakaian", "Elektronik", "Perawatan Diri", "Lainnya"] },
  { key: "Transportasi", color: PALETTE[3], subs: ["Bensin", "Ojek Online", "Transportasi Umum", "Parkir & Tol", "Servis Kendaraan", "Lainnya"] },
  { key: "Lainnya", color: PALETTE[4], subs: ["Hiburan", "Kesehatan", "Pendidikan", "Sosial & Hadiah", "Lainnya"] },
  { key: "Tabungan", color: PALETTE[5], subs: ["Tabungan Umum", "Dana Darurat", "Investasi", "Tujuan Khusus"] },
];

const DEFAULT_INCOME = [
  { key: "Gaji", color: PALETTE[6], subs: ["Gaji Pokok", "Tunjangan", "Lembur"] },
  { key: "Bonus & Hadiah", color: PALETTE[7], subs: ["Bonus", "THR", "Hadiah", "Lainnya"] },
  { key: "Usaha & Investasi", color: PALETTE[8], subs: ["Usaha Sampingan", "Freelance", "Hasil Investasi", "Lainnya"] },
  { key: "Pemasukan Lainnya", color: PALETTE[9], subs: ["Lainnya"] },
];

const nextColor = (list) => PALETTE[list.length % PALETTE.length];

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
// Rincian barang: [{ name, qty, price }]. Jumlah transaksi = total rincian bila ada rincian.
const itemsSum = (items) => items.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
const toDraftItem = (i) => ({ id: newId(), name: i.name, qty: String(i.qty), price: String(i.price) });

const rupiah = (n) => "Rp" + Math.round(n || 0).toLocaleString("id-ID");

// Semua helper tanggal memakai zona waktu lokal. Jangan pakai toISOString() di sini:
// ia mengonversi ke UTC, sehingga di WIB (UTC+7) jam 00.00–06.59 dianggap masih hari/bulan kemarin.
const pad = (n) => String(n).padStart(2, "0");
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; // "2026-10"
const todayStr = () => {
  const d = new Date();
  return `${monthKey(d)}-${pad(d.getDate())}`;
};
const lastDayOfMonth = (key) => {
  const [y, m] = key.split("-").map(Number);
  return `${key}-${pad(new Date(y, m, 0).getDate())}`;
};
const monthName = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
};
// Tanggal awal untuk form: hari ini kalau bulan yang dilihat adalah bulan ini, selain itu tanggal 1.
const defaultDateFor = (key) => (todayStr().startsWith(key) ? todayStr() : `${key}-01`);

// Anggaran disimpan per bulan: { "2026-10": { Tagihan: 500000, ... } }.
// Format lama (satu anggaran { Tagihan: 500000, ... } untuk semua bulan) dipindahkan ke
// setiap bulan yang sudah punya transaksi, ditambah bulan ini, supaya angka yang sudah dilihat tidak hilang.
const migrateBudgets = (raw, txs) => {
  if (!raw) return {};
  if (!Object.values(raw).some((v) => typeof v === "number")) return raw;
  const months = new Set(txs.map((t) => t.date.slice(0, 7)));
  months.add(monthKey(new Date()));
  return Object.fromEntries([...months].map((m) => [m, { ...raw }]));
};

export default function ExpenseTracker() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authStatus, setAuthStatus] = useState("idle"); // idle | sending | error
  const [authError, setAuthError] = useState("");

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState({}); // { "YYYY-MM": { [kelompok]: nominal } }
  const [categories, setCategories] = useState({ pemasukan: DEFAULT_INCOME, pengeluaran: DEFAULT_EXPENSE });
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const listFor = (type) => categories[type];
  const catInfo = (type, name) => categories[type].find((c) => c.key === name) || categories[type][0];

  const [fType, setFType] = useState("pengeluaran");
  const [fDate, setFDate] = useState(todayStr());
  const [fCategory, setFCategory] = useState(DEFAULT_EXPENSE[0].key);
  const [fSub, setFSub] = useState(DEFAULT_EXPENSE[0].subs[0]);
  const [fAmount, setFAmount] = useState("");
  const [fNote, setFNote] = useState("");
  const [fItems, setFItems] = useState([]); // draf rincian barang (nilai input berupa string)
  const [editingId, setEditingId] = useState(null); // id transaksi yang sedang diedit, null = tambah baru
  const formRef = useRef(null);

  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("anggaran");
  const [budgetDraft, setBudgetDraft] = useState({});
  const [manageType, setManageType] = useState("pengeluaran");
  const [newCatName, setNewCatName] = useState("");
  const [subDrafts, setSubDrafts] = useState({});

  const [filterCat, setFilterCat] = useState("Semua");
  const [groupBy, setGroupBy] = useState("tanggal");

  // ---- Autentikasi (email + password, lewat Supabase Auth) ----
  // Supabase menyimpan sesi login di localStorage browser secara default,
  // jadi setelah sekali login, sesi akan bertahan (tidak perlu login ulang)
  // sampai kamu klik Keluar atau data browser dihapus.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleAuthSubmit(e) {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword) return;
    setAuthStatus("sending");
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
    if (error) {
      setAuthStatus("error");
      setAuthError(error.message);
    } else {
      setAuthStatus("idle");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setLoaded(false);
    setTransactions([]);
    setBudgets({});
    setCategories({ pemasukan: DEFAULT_INCOME, pengeluaran: DEFAULT_EXPENSE });
  }

  // ---- Muat data dari Supabase saat sudah login ----
  // PENTING: `loaded` hanya boleh jadi true kalau proses ambil data BENAR-BENAR berhasil
  // (baik itu dapat data, maupun memang belum ada data sama sekali untuk user baru).
  // Kalau gagal (mis. koneksi putus), JANGAN set loaded=true, karena itu akan memicu
  // efek auto-save di bawah dan menimpa data asli di server dengan state kosong/default.
  useEffect(() => {
    if (!session) return;
    setLoadError("");
    (async () => {
      try {
        const { data, error } = await supabase
          .from("app_data")
          .select("data")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (error) throw error;
        if (data && data.data) {
          const parsed = data.data;
          const savedCats = parsed.categories || { pemasukan: DEFAULT_INCOME, pengeluaran: DEFAULT_EXPENSE };
          const loadedCats = { pemasukan: recolor(savedCats.pemasukan), pengeluaran: recolor(savedCats.pengeluaran) };
          const normalized = (parsed.transactions || []).map((t) => ({
            ...t,
            type: t.type || (loadedCats.pemasukan.some((c) => c.key === t.category) ? "pemasukan" : "pengeluaran"),
          }));
          setCategories(loadedCats);
          setTransactions(normalized);
          setBudgets(migrateBudgets(parsed.budgets, normalized));
          if (loadedCats.pengeluaran[0]) {
            setFCategory(loadedCats.pengeluaran[0].key);
            setFSub(loadedCats.pengeluaran[0].subs[0]);
          }
        }
        setLoaded(true); // hanya sampai sini kalau sukses (dengan atau tanpa data)
      } catch (e) {
        console.error("Gagal memuat data dari Supabase", e);
        setLoadError(e.message || "Gagal memuat data dari server.");
        // loaded TIDAK diset true di sini — mencegah auto-save menimpa data dengan kondisi kosong
      }
    })();
  }, [session, retryCount]);

  // ---- Simpan data ke Supabase setiap ada perubahan ----
  useEffect(() => {
    if (!loaded || !session) return;
    (async () => {
      try {
        const { error } = await supabase.from("app_data").upsert({
          user_id: session.user.id,
          data: { transactions, budgets, categories },
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } catch (e) {
        console.error("Gagal menyimpan data ke Supabase", e);
      }
    })();
  }, [transactions, budgets, categories, loaded, session]);

  const mKey = monthKey(cursor);
  const monthLabel = monthName(mKey);
  const monthBudget = budgets[mKey] || {};
  // Bulan terdekat sebelum bulan ini yang punya anggaran (untuk tombol "Salin").
  const prevBudgetKey = Object.keys(budgets).filter((k) => k < mKey).sort().pop();
  const monthTx = useMemo(() => transactions.filter((t) => t.date.startsWith(mKey)), [transactions, mKey]);
  const incomeTx = useMemo(() => monthTx.filter((t) => t.type === "pemasukan"), [monthTx]);
  const expenseTx = useMemo(() => monthTx.filter((t) => t.type === "pengeluaran"), [monthTx]);

  const spentByCategory = useMemo(() => {
    const map = Object.fromEntries(categories.pengeluaran.map((c) => [c.key, 0]));
    expenseTx.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return map;
  }, [expenseTx, categories.pengeluaran]);

  const totalPemasukan = incomeTx.reduce((s, t) => s + t.amount, 0);
  const totalPengeluaran = categories.pengeluaran.filter((c) => c.key !== "Tabungan").reduce((s, c) => s + (spentByCategory[c.key] || 0), 0);
  const totalTabungan = spentByCategory["Tabungan"] || 0;
  const totalBudgetPengeluaran = categories.pengeluaran.filter((c) => c.key !== "Tabungan").reduce((s, c) => s + (monthBudget[c.key] || 0), 0);
  const sisaBudget = totalBudgetPengeluaran - totalPengeluaran;
  const saldo = totalPemasukan - totalPengeluaran - totalTabungan;

  const hasItems = fItems.length > 0;
  const itemsTotal = Math.round(itemsSum(fItems));

  function changeMonth(delta) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
    setCursor(next);
    setFDate(defaultDateFor(monthKey(next))); // tanggal form selalu berada di bulan yang sedang dilihat
    if (editingId) resetForm(); // transaksi yang diedit milik bulan sebelumnya
  }

  function switchType(type) {
    setFType(type);
    const first = listFor(type)[0];
    setFCategory(first.key);
    setFSub(first.subs[0]);
  }

  function resetForm() {
    setEditingId(null);
    setFAmount("");
    setFNote("");
    setFItems([]);
  }

  const addItem = () => setFItems((prev) => [...prev, { id: newId(), name: "", qty: "1", price: "" }]);
  const updateItem = (id, patch) => setFItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id) => setFItems((prev) => prev.filter((i) => i.id !== id));

  function startEdit(t) {
    const cat = categories[t.type].find((c) => c.key === t.category) || categories[t.type][0];
    setEditingId(t.id);
    setFType(t.type);
    setFDate(t.date);
    setFCategory(cat.key);
    setFSub(cat.subs.includes(t.subcategory) ? t.subcategory : cat.subs[0]);
    setFAmount(String(t.amount));
    setFNote(t.note || "");
    setFItems((t.items || []).map(toDraftItem));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function submitTransaction(e) {
    e.preventDefault();
    const items = fItems
      .map((i) => ({ name: i.name.trim(), qty: Number(i.qty), price: Number(i.price) }))
      .filter((i) => i.name && i.qty > 0 && i.price >= 0);
    const amt = items.length ? Math.round(itemsSum(items)) : Number(fAmount);
    if (!amt || amt <= 0 || !fSub || !fDate.startsWith(mKey)) return;
    const tx = {
      id: editingId || newId(),
      type: fType,
      date: fDate,
      category: fCategory,
      subcategory: fSub,
      amount: amt,
      note: fNote.trim(),
      ...(items.length ? { items } : {}),
    };
    setTransactions((prev) => (editingId ? prev.map((t) => (t.id === editingId ? tx : t)) : [tx, ...prev]));
    resetForm();
  }

  function deleteTx(id) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) resetForm();
  }

  function openSettings() {
    setBudgetDraft(monthBudget);
    setSettingsTab("anggaran");
    setShowSettings(true);
  }

  function saveSettings() {
    setBudgets((prev) => ({ ...prev, [mKey]: budgetDraft }));
    setShowSettings(false);
  }

  function clearAllData() {
    if (window.confirm("Hapus semua transaksi dan anggaran (semua bulan)? Tindakan ini tidak bisa dibatalkan.")) {
      setTransactions([]);
      setBudgets({});
      setShowSettings(false);
    }
  }

  // Terapkan fungsi ke anggaran setiap bulan (dipakai saat kelompok diganti nama / dihapus).
  const updateAllBudgets = (fn) =>
    setBudgets((prev) => Object.fromEntries(Object.entries(prev).map(([m, b]) => [m, fn(b)])));

  // ---- Manajemen kelompok & sub-kelompok ----
  function renameCategory(type, oldKey, rawNewKey) {
    const newKey = rawNewKey.trim();
    if (!newKey || newKey === oldKey) return;
    if (categories[type].some((c) => c.key === newKey)) {
      window.alert(`Kelompok "${newKey}" sudah ada.`);
      return;
    }
    setCategories((prev) => ({ ...prev, [type]: prev[type].map((c) => (c.key === oldKey ? { ...c, key: newKey } : c)) }));
    setTransactions((prev) => prev.map((t) => (t.category === oldKey ? { ...t, category: newKey } : t)));
    if (type === "pengeluaran") {
      updateAllBudgets((b) => {
        if (!(oldKey in b)) return b;
        const { [oldKey]: val, ...rest } = b;
        return { ...rest, [newKey]: val };
      });
    }
    if (fCategory === oldKey) setFCategory(newKey);
  }

  function addCategory(type) {
    const name = newCatName.trim();
    if (!name) return;
    if (categories[type].some((c) => c.key === name)) {
      window.alert(`Kelompok "${name}" sudah ada.`);
      return;
    }
    const newCat = { key: name, color: nextColor(categories[type]), subs: ["Lainnya"] };
    setCategories((prev) => ({ ...prev, [type]: [...prev[type], newCat] }));
    setNewCatName("");
  }

  function deleteCategory(type, key) {
    if (categories[type].length <= 1) {
      window.alert("Minimal harus ada satu kelompok.");
      return;
    }
    if (!window.confirm(`Hapus kelompok "${key}"? Transaksi lama tetap ada di riwayat, tapi tidak lagi dihitung dalam ringkasan dan anggaran.`)) return;
    setCategories((prev) => ({ ...prev, [type]: prev[type].filter((c) => c.key !== key) }));
    if (type === "pengeluaran") {
      updateAllBudgets((b) => {
        const { [key]: _, ...rest } = b;
        return rest;
      });
    }
    if (fCategory === key) {
      const remaining = categories[type].filter((c) => c.key !== key);
      if (remaining[0]) {
        setFCategory(remaining[0].key);
        setFSub(remaining[0].subs[0]);
      }
    }
  }

  function renameSub(type, catKey, oldSub, rawNewSub) {
    const newSub = rawNewSub.trim();
    if (!newSub || newSub === oldSub) return;
    setCategories((prev) => ({
      ...prev,
      [type]: prev[type].map((c) => (c.key === catKey ? { ...c, subs: c.subs.map((s) => (s === oldSub ? newSub : s)) } : c)),
    }));
    setTransactions((prev) => prev.map((t) => (t.category === catKey && t.subcategory === oldSub ? { ...t, subcategory: newSub } : t)));
    if (fCategory === catKey && fSub === oldSub) setFSub(newSub);
  }

  function addSub(type, catKey) {
    const name = (subDrafts[catKey] || "").trim();
    if (!name) return;
    setCategories((prev) => ({
      ...prev,
      [type]: prev[type].map((c) => (c.key === catKey && !c.subs.includes(name) ? { ...c, subs: [...c.subs, name] } : c)),
    }));
    setSubDrafts((prev) => ({ ...prev, [catKey]: "" }));
  }

  function deleteSub(type, catKey, sub) {
    const cat = categories[type].find((c) => c.key === catKey);
    if (!cat || cat.subs.length <= 1) {
      window.alert("Minimal harus ada satu sub-kelompok di dalam kelompok ini.");
      return;
    }
    if (!window.confirm(`Hapus sub-kelompok "${sub}"?`)) return;
    setCategories((prev) => ({ ...prev, [type]: prev[type].map((c) => (c.key === catKey ? { ...c, subs: c.subs.filter((s) => s !== sub) } : c)) }));
  }

  const filteredHistory = filterCat === "Semua" ? monthTx : monthTx.filter((t) => t.category === filterCat);

  const groupedByDate = useMemo(() => {
    const sorted = [...filteredHistory].sort((a, b) => (a.date < b.date ? 1 : -1));
    const groups = [];
    let lastDate = null;
    sorted.forEach((t) => {
      if (t.date !== lastDate) {
        groups.push({ label: t.date, items: [] });
        lastDate = t.date;
      }
      groups[groups.length - 1].items.push(t);
    });
    return groups;
  }, [filteredHistory]);

  const groupedByCategory = useMemo(() => {
    const allCats = [...categories.pemasukan, ...categories.pengeluaran];
    return allCats
      .map((c) => ({
        label: c.key,
        color: c.color,
        items: filteredHistory.filter((t) => t.category === c.key).sort((a, b) => (a.date < b.date ? 1 : -1)),
      }))
      .filter((g) => g.items.length > 0);
  }, [filteredHistory, categories]);

  const fmtDateHeader = (dateStr) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });

  // Satu baris transaksi, dipakai di tampilan "Per Tanggal" dan "Per Kategori".
  const renderTx = (t, showDate) => (
    <div className={`tx-row${editingId === t.id ? " editing" : ""}`} key={t.id}>
      <div className="tx-main">
        <span className="tx-cat">{showDate ? t.subcategory : `${t.category} — ${t.subcategory}`}</span>
        {showDate ? (
          <span className="tx-note">
            {new Date(t.date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
            {t.note ? ` · ${t.note}` : ""}
          </span>
        ) : (
          t.note && <span className="tx-note">{t.note}</span>
        )}
        {t.items?.length > 0 && (
          <details className="tx-items">
            <summary>{t.items.length} barang</summary>
            <ul>
              {t.items.map((it, i) => (
                <li key={i}>
                  <span>
                    {it.qty}× {it.name} <em>@{rupiah(it.price)}</em>
                  </span>
                  <span>{rupiah(it.qty * it.price)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <div className="tx-right">
        <span className={`tx-amount ${t.type === "pemasukan" ? "income" : t.category === "Tabungan" ? "savings" : ""}`}>
          {t.type === "pemasukan" ? "+" : "-"}{rupiah(t.amount)}
        </span>
        <button className="row-btn" onClick={() => startEdit(t)} aria-label="Ubah transaksi" title="Ubah"><Pencil size={14} /></button>
        <button className="row-btn del" onClick={() => deleteTx(t.id)} aria-label="Hapus transaksi" title="Hapus"><Trash2 size={14} /></button>
      </div>
    </div>
  );

  const loginStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Raleway:wght@400;500;600;700&display=swap');
    .login-wrap { min-height: 100vh; background-color: #FAF2DA; background-image: radial-gradient(#E9E0C0 1.2px, transparent 1.2px); background-size: 16px 16px; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: 'Raleway', system-ui, sans-serif; font-variant-numeric: lining-nums; }
    .login-card { background: #FEFAEE; border: 2px solid #4A503D; border-radius: 6px; box-shadow: 5px 5px 0 #E28F83; padding: 32px; width: 100%; max-width: 380px; text-align: center; }
    .login-card h1 { font-family: 'Playfair Display', Georgia, serif; font-weight: 700; color: #4A503D; font-size: 28px; margin: 0 0 6px; }
    .login-card p { color: #656B54; font-size: 13.5px; margin: 0 0 22px; line-height: 1.5; }
    .login-card input { width: 100%; font-family: inherit; color: #4A503D; background: #FAF2DA; border: 2px solid #4A503D; border-radius: 4px; padding: 11px 12px; font-size: 14px; margin-bottom: 12px; box-sizing: border-box; }
    .login-card input:focus { outline: 2px solid #94483C; outline-offset: 1px; }
    .login-card button { width: 100%; font-family: inherit; background: #4A503D; color: #FAF2DA; border: 2px solid #4A503D; border-radius: 4px; box-shadow: 3px 3px 0 #E28F83; padding: 12px; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; }
    .login-card button:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 #E28F83; }
    .login-card button:disabled { opacity: 0.6; cursor: default; }
    .login-msg { font-size: 13px; margin-top: 14px; }
    .login-msg.err { color: #B3261E; }
  `;

  if (checkingSession) {
    return <div style={{ padding: 40, minHeight: "100vh", background: "#FAF2DA", fontFamily: "'Raleway', system-ui, sans-serif", color: "#656B54" }}>Memuat…</div>;
  }

  if (!session) {
    return (
      <div className="login-wrap">
        <style>{loginStyles}</style>
        <div className="login-card">
          <h1>Catatan Keuangan</h1>
          <p>Masuk untuk melanjutkan catatan keuanganmu. Sesi login akan tersimpan otomatis di browser ini.</p>
          <form onSubmit={handleAuthSubmit}>
            <input
              type="email"
              required
              placeholder="emailmu@contoh.com"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button type="submit" disabled={authStatus === "sending"}>
              <Mail size={15} />
              {authStatus === "sending" ? "Memproses…" : "Masuk"}
            </button>
          </form>

          {authStatus === "error" && <div className="login-msg err">Gagal: {authError}</div>}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="login-wrap">
        <style>{loginStyles}</style>
        <div className="login-card">
          <h1>Gagal memuat data</h1>
          <p>
            Terjadi masalah saat mengambil data dari server: <strong>{loadError}</strong>
            <br />
            Data lamamu aman (tidak ditimpa) — coba lagi setelah memastikan koneksi internet stabil.
          </p>
          <button type="button" onClick={() => setRetryCount((n) => n + 1)}>
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return <div style={{ padding: 40, minHeight: "100vh", background: "#FAF2DA", fontFamily: "'Raleway', system-ui, sans-serif", color: "#656B54" }}>Memuat data…</div>;
  }

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Raleway:wght@400;500;600;700&display=swap');

        .app {
          /* Palet: krem #FAF2DA, sage #8E9775, zaitun #4A503D, salmon #E28F83 (+ turunannya) */
          --bg: #FAF2DA;
          --surface: #FEFAEE;
          --ink: #4A503D;
          --ink-soft: #656B54;
          --line: #D9D0B0;
          --track: #E9E0C0;
          --dots: #E9E0C0;
          --primary: #4A503D;
          --accent: #E28F83; /* hanya untuk isian, bayangan, dan garis: kontras dengan teks terlalu rendah (2,2:1) */
          --warn-text: #94483C; /* salmon tua: pengganti --accent untuk teks dan ikon */
          --income: #66704F;
          --savings: #94483C;
          --danger: #B3261E;
          --hero-gold: #E28F83;
          --hero-pos: #FEFAEE;
          --hero-neg: #FFB3A5;
          --display: 'Playfair Display', Georgia, serif;
          --body: 'Raleway', system-ui, -apple-system, 'Segoe UI', sans-serif;
          background-color: var(--bg);
          background-image: radial-gradient(var(--dots) 1.2px, transparent 1.2px);
          background-size: 16px 16px;
          color: var(--ink);
          font-family: var(--body);
          font-weight: 500;
          font-variant-numeric: lining-nums; /* Playfair & Raleway: angka bawaannya gaya lama (naik-turun) */
          font-size: 14px;
          min-height: 100vh;
          padding: clamp(14px, 4vw, 28px);
          box-sizing: border-box;
        }
        .app * { box-sizing: border-box; }
        .app input, .app select, .app button { font-family: inherit; font-variant-numeric: inherit; }
        .wrap { max-width: 880px; margin: 0 auto; }

        .month-nav { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .month-nav button { background: var(--surface); border: 2px solid var(--ink); border-radius: 4px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--ink); flex-shrink: 0; }
        .month-nav button:hover { background: var(--ink); color: var(--bg); }
        .month-label { font-size: 13px; font-weight: 700; letter-spacing: 0.14em; color: var(--ink); }

        .title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; flex-wrap: wrap; gap: 10px; }
        h1 { font-family: var(--display); font-weight: 700; font-size: clamp(26px, 5vw, 36px); margin: 0; color: var(--ink); }
        .icon-action-btn { background: var(--surface); border: 2px solid var(--ink); border-radius: 4px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--ink); flex-shrink: 0; }
        .icon-action-btn:hover { background: var(--ink); color: var(--bg); }

        .hero { background: var(--primary); border: 2px solid var(--ink); border-radius: 6px; box-shadow: 5px 5px 0 var(--accent); padding: clamp(18px, 3vw, 26px); display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 24px; }
        .hero-item .lbl { color: var(--track); font-weight: 600; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px; }
        .hero-item .val { font-size: clamp(18px, 3vw, 24px); font-weight: 700; color: var(--bg); word-break: break-word; }
        .hero-item .sub { font-size: 11.5px; margin-top: 4px; }
        .sub.pos { color: var(--hero-pos); }
        .sub.neg { color: var(--hero-neg); }

        .card { background: var(--surface); border: 2px solid var(--ink); border-radius: 6px; box-shadow: 4px 4px 0 var(--accent); padding: clamp(14px, 3vw, 20px); margin-bottom: 24px; }
        .card.editing { background: var(--bg); box-shadow: 4px 4px 0 var(--ink); }
        .card h2 { font-family: var(--display); font-weight: 700; font-size: 21px; margin: 0 0 16px; color: var(--ink); }

        .type-toggle { display: flex; gap: 8px; margin-bottom: 16px; }
        .type-toggle button { flex: 1; border: 2px solid var(--ink); border-radius: 4px; padding: 10px; font-size: 13px; font-weight: 700; cursor: pointer; background: var(--bg); color: var(--ink); min-height: 42px; }
        .type-toggle button.active.income { background: var(--income); color: var(--bg); border-color: var(--income); }
        .type-toggle button.active.expense { background: var(--primary); color: var(--bg); border-color: var(--primary); }

        form.tx-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; align-items: end; }
        .field { display: flex; flex-direction: column; gap: 5px; }
        .field.note, .field.items, .form-actions { grid-column: 1 / -1; }
        .field label { font-size: 12px; color: var(--ink-soft); }
        .field input, .field select, .item-row input { border: 2px solid var(--ink); border-radius: 4px; padding: 10px; font-size: 14px; background: var(--bg); color: var(--ink); min-height: 42px; width: 100%; }
        .field input:focus, .field select:focus, .item-row input:focus { outline: 2px solid var(--warn-text); outline-offset: 1px; }
        .field input[readonly] { background: var(--track); font-weight: 700; }

        .items-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .add-item-btn { display: flex; align-items: center; gap: 4px; background: var(--surface); border: 2px dashed var(--ink); border-radius: 4px; color: var(--ink); font-size: 12.5px; font-weight: 700; padding: 6px 10px; cursor: pointer; }
        .add-item-btn:hover { background: var(--ink); color: var(--bg); }
        .item-row { display: grid; grid-template-columns: 2fr 72px 1.2fr 1fr auto; gap: 8px; align-items: center; margin-top: 8px; }
        .item-row input { min-height: 38px; padding: 8px; font-size: 13px; }
        .item-sub { font-size: 12.5px; text-align: right; color: var(--ink-soft); white-space: nowrap; }
        .items-total { font-size: 13px; font-weight: 700; text-align: right; margin-top: 6px; }

        .form-actions { display: flex; gap: 10px; }
        .submit-btn { flex: 1; background: var(--primary); color: var(--bg); border: 2px solid var(--ink); border-radius: 4px; box-shadow: 3px 3px 0 var(--accent); padding: 12px; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; }
        .submit-btn:active, .cancel-btn:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--accent); }
        .cancel-btn { background: var(--surface); color: var(--ink); border: 2px solid var(--ink); border-radius: 4px; box-shadow: 3px 3px 0 var(--accent); padding: 12px 18px; font-size: 14px; font-weight: 700; cursor: pointer; min-height: 44px; }

        .budget-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
        .budget-card { border: 2px solid var(--ink); border-radius: 4px; padding: 14px; background: var(--bg); }
        .budget-card .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .budget-card .name { font-weight: 700; font-size: 14px; display: flex; align-items: center; }
        .dot { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid var(--ink); display: inline-block; margin-right: 7px; flex-shrink: 0; }
        .budget-card .amounts { font-size: 12px; color: var(--ink-soft); margin-bottom: 8px; word-break: break-word; }
        .track { background: var(--track); border: 1.5px solid var(--ink); border-radius: 3px; height: 12px; overflow: hidden; }
        .fill { height: 100%; transition: width 0.3s ease; background-image: repeating-linear-gradient(135deg, rgba(254,250,238,0.28) 0 5px, transparent 5px 10px); }
        .status-line { font-size: 11.5px; font-weight: 700; margin-top: 8px; }

        .history-controls { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
        .history-controls select { border: 2px solid var(--ink); border-radius: 4px; padding: 9px 10px; font-size: 13px; background: var(--bg); color: var(--ink); min-height: 40px; flex: 1 1 160px; }
        .toggle-group { display: flex; border: 2px solid var(--ink); border-radius: 4px; overflow: hidden; flex: 1 1 260px; }
        .toggle-group button { border: none; background: var(--bg); padding: 9px 10px; font-size: 12.5px; font-weight: 700; cursor: pointer; color: var(--ink); flex: 1; min-height: 36px; }
        .toggle-group button.active { background: var(--primary); color: var(--bg); }

        .group-block { margin-bottom: 18px; }
        .group-title { font-size: 12.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-soft); margin-bottom: 6px; padding-bottom: 6px; border-bottom: 2px solid var(--ink); display: flex; align-items: center; gap: 8px; }
        .tx-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 6px; border-bottom: 1px dashed var(--line); gap: 10px; }
        .tx-row:last-child { border-bottom: none; }
        .tx-row.editing { background: var(--bg); outline: 2px dashed var(--accent); outline-offset: -2px; }
        .tx-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .tx-cat { font-size: 13px; font-weight: 700; overflow-wrap: break-word; }
        .tx-note { font-size: 12px; color: var(--ink-soft); overflow-wrap: break-word; }
        .tx-items { margin-top: 4px; font-size: 12px; }
        .tx-items summary { cursor: pointer; color: var(--warn-text); font-weight: 700; width: fit-content; }
        .tx-items ul { list-style: none; margin: 6px 0 0; padding: 8px 10px; background: var(--bg); border-left: 3px solid var(--accent); }
        .tx-items li { display: flex; justify-content: space-between; gap: 12px; padding: 2px 0; }
        .tx-items li em { font-style: normal; color: var(--ink-soft); }
        .tx-right { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .tx-amount { font-size: 13.5px; font-weight: 700; white-space: nowrap; margin-right: 6px; }
        .tx-amount.income { color: var(--income); }
        .tx-amount.savings { color: var(--savings); }
        .row-btn { background: none; border: none; color: var(--ink-soft); cursor: pointer; padding: 6px; display: flex; flex-shrink: 0; }
        .row-btn:hover { color: var(--warn-text); }
        .row-btn.del:hover { color: var(--danger); }
        .empty { color: var(--ink-soft); font-size: 13px; padding: 20px 0; text-align: center; }

        .overlay { position: fixed; inset: 0; background: rgba(74,80,61,0.55); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
        .panel { background: var(--surface); border: 2px solid var(--ink); border-radius: 6px; box-shadow: 6px 6px 0 var(--accent); padding: 24px; width: 100%; max-width: 480px; max-height: 85vh; overflow-y: auto; }
        .panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .panel-head h2 { font-family: var(--display); font-weight: 700; font-size: 22px; margin: 0; }
        .panel-head button { background: none; border: none; cursor: pointer; color: var(--ink-soft); }

        .tabs { display: flex; border-bottom: 2px solid var(--ink); margin-bottom: 18px; gap: 4px; }
        .tabs button { background: none; border: none; padding: 9px 4px; margin-right: 14px; font-size: 13px; font-weight: 700; color: var(--ink-soft); cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -2px; }
        .tabs button.active { color: var(--ink); border-bottom-color: var(--accent); }

        .budget-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 10px; }
        .budget-row label { font-size: 13px; display: flex; align-items: center; }
        .budget-row input { width: 130px; border: 2px solid var(--ink); border-radius: 4px; padding: 8px 9px; font-size: 13px; text-align: right; background: var(--bg); color: var(--ink); }
        .panel-actions { display: flex; gap: 10px; margin-top: 18px; }
        .panel-actions button { flex: 1; border-radius: 4px; padding: 11px; font-size: 13px; font-weight: 700; cursor: pointer; min-height: 42px; }
        .btn-primary { background: var(--primary); color: var(--bg); border: 2px solid var(--ink); }
        .btn-ghost { background: var(--surface); border: 2px solid var(--ink); color: var(--ink); }
        .copy-budget-btn { width: 100%; border-radius: 4px; padding: 9px; font-size: 12.5px; font-weight: 700; cursor: pointer; margin-bottom: 14px; border-style: dashed; }
        .btn-danger-text { background: none; border: none; color: var(--danger); font-size: 12px; cursor: pointer; margin-top: 14px; text-decoration: underline; padding: 4px 0; }

        .manage-type-toggle { display: flex; gap: 8px; margin-bottom: 16px; }
        .manage-type-toggle button { flex: 1; border: 2px solid var(--ink); border-radius: 4px; padding: 8px; font-size: 12.5px; font-weight: 700; cursor: pointer; background: var(--bg); color: var(--ink); }
        .manage-type-toggle button.active { background: var(--primary); color: var(--bg); }

        .cat-block { border: 2px solid var(--ink); border-radius: 4px; padding: 12px; margin-bottom: 12px; background: var(--bg); }
        .cat-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .cat-head input { flex: 1; border: 2px solid transparent; background: transparent; font-size: 14px; font-weight: 700; padding: 5px 6px; border-radius: 4px; color: var(--ink); min-width: 0; }
        .cat-head input:focus { border-color: var(--ink); background: var(--surface); outline: none; }
        .icon-btn { background: none; border: none; color: var(--ink-soft); cursor: pointer; padding: 5px; display: flex; flex-shrink: 0; }
        .icon-btn:hover { color: var(--danger); }
        .sub-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
        .sub-chip { display: flex; align-items: center; gap: 5px; background: var(--track); border: 1.5px solid var(--ink); border-radius: 999px; padding: 3px 4px 3px 10px; }
        .sub-chip input { border: none; background: transparent; font-size: 12.5px; width: auto; min-width: 40px; padding: 2px; color: var(--ink); }
        .sub-chip input:focus { outline: none; }
        .sub-chip button { background: none; border: none; color: var(--ink-soft); cursor: pointer; display: flex; padding: 2px; }
        .sub-chip button:hover { color: var(--danger); }
        .add-sub-row { display: flex; gap: 6px; }
        .add-sub-row input { flex: 1; border: 2px solid var(--ink); border-radius: 4px; padding: 6px 8px; font-size: 12.5px; background: var(--surface); color: var(--ink); }
        .add-sub-row button { border: 2px solid var(--ink); background: var(--surface); border-radius: 4px; padding: 0 10px; cursor: pointer; color: var(--ink); font-weight: 700; }
        .add-cat-row { display: flex; gap: 8px; margin-top: 6px; }
        .add-cat-row input { flex: 1; border: 2px solid var(--ink); border-radius: 4px; padding: 9px 10px; font-size: 13px; background: var(--bg); color: var(--ink); }
        .add-cat-row button { background: var(--primary); color: var(--bg); border: 2px solid var(--ink); border-radius: 4px; padding: 0 14px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 700; }

        @media (max-width: 560px) {
          .item-row { grid-template-columns: 72px 1fr auto; }
          .item-row .item-name { grid-column: 1 / -1; }
          .item-sub { display: none; }
        }
        @media (max-width: 480px) {
          .title-row { align-items: flex-start; }
        }
      `}</style>

      <div className="wrap">
        <div className="month-nav">
          <button onClick={() => changeMonth(-1)} aria-label="Bulan sebelumnya"><ChevronLeft size={16} /></button>
          <span className="month-label">{monthLabel.toUpperCase()}</span>
          <button onClick={() => changeMonth(1)} aria-label="Bulan berikutnya"><ChevronRight size={16} /></button>
        </div>

        <div className="title-row">
          <h1>Catatan Keuangan</h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="icon-action-btn" onClick={openSettings} aria-label="Pengaturan" title="Pengaturan">
              <Settings2 size={17} />
            </button>
            <button className="icon-action-btn" onClick={signOut} aria-label="Keluar" title="Keluar">
              <LogOut size={17} />
            </button>
          </div>
        </div>

        {/* 1. TOTAL PEMASUKAN DAN PENGELUARAN */}
        <div className="hero">
          <div className="hero-item">
            <div className="lbl">Total Pemasukan</div>
            <div className="val">{rupiah(totalPemasukan)}</div>
          </div>
          <div className="hero-item">
            <div className="lbl">Total Pengeluaran</div>
            <div className="val">{rupiah(totalPengeluaran)}</div>
            {totalBudgetPengeluaran > 0 && (
              <div className={`sub ${sisaBudget >= 0 ? "pos" : "neg"}`}>
                {sisaBudget >= 0 ? `Sisa anggaran ${rupiah(sisaBudget)}` : `Lebih ${rupiah(-sisaBudget)} dari anggaran`}
              </div>
            )}
          </div>
          <div className="hero-item">
            <div className="lbl">Ditabung</div>
            <div className="val" style={{ color: "var(--hero-gold)" }}>{rupiah(totalTabungan)}</div>
          </div>
          <div className="hero-item">
            <div className="lbl">Saldo Bersih</div>
            <div className="val" style={{ color: saldo >= 0 ? "var(--hero-pos)" : "var(--hero-neg)" }}>{rupiah(saldo)}</div>
          </div>
        </div>

        {/* 2. ANGGARAN DAN SISA BUDGET */}
        <div className="card">
          <h2>Anggaran & Sisa Budget — {monthLabel}</h2>
          <div className="budget-grid">
            {categories.pengeluaran.map((c) => {
              const spent = spentByCategory[c.key] || 0;
              const budget = monthBudget[c.key] || 0;
              const isSavings = c.key === "Tabungan";
              const nearLimit = !isSavings && budget > 0 && spent <= budget && spent >= budget * 0.8;
              const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : spent > 0 ? 100 : 0;
              let fillColor = c.color;
              if (!isSavings && budget > 0) {
                if (spent > budget) fillColor = "var(--danger)";
                else if (spent >= budget * 0.8) fillColor = "var(--accent)";
                else fillColor = "var(--primary)";
              }
              return (
                <div className="budget-card" key={c.key}>
                  <div className="top">
                    <span className="name"><span className="dot" style={{ background: c.color }}></span>{c.key}</span>
                  </div>
                  <div className="amounts">
                    {rupiah(spent)} {budget > 0 ? `/ ${rupiah(budget)}` : "(anggaran belum diatur)"}
                  </div>
                  <div className="track"><div className="fill" style={{ width: `${pct}%`, background: fillColor }}></div></div>
                  {budget > 0 && (
                    <div className="status-line" style={{ color: isSavings ? "var(--savings)" : spent > budget ? "var(--danger)" : nearLimit ? "var(--warn-text)" : "var(--ink-soft)" }}>
                      {isSavings
                        ? `Terkumpul ${Math.round(pct)}% dari target`
                        : spent > budget
                        ? `Lebih ${rupiah(spent - budget)} dari anggaran`
                        : `Sisa ${rupiah(budget - spent)}${nearLimit ? " — hampir habis" : ""}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. TAMBAH TRANSAKSI */}
        <div className={`card${editingId ? " editing" : ""}`} ref={formRef}>
          <h2>{editingId ? "Edit Transaksi" : "Tambah Transaksi"}</h2>
          <div className="type-toggle">
            <button className={fType === "pemasukan" ? "active income" : ""} onClick={() => switchType("pemasukan")} type="button">Pemasukan</button>
            <button className={fType === "pengeluaran" ? "active expense" : ""} onClick={() => switchType("pengeluaran")} type="button">Pengeluaran</button>
          </div>
          <form className="tx-form" onSubmit={submitTransaction}>
            <div className="field">
              <label>Tanggal</label>
              <input
                type="date"
                value={fDate}
                min={`${mKey}-01`}
                max={lastDayOfMonth(mKey)}
                onChange={(e) => setFDate(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Kelompok</label>
              <select
                value={fCategory}
                onChange={(e) => {
                  const cat = e.target.value;
                  setFCategory(cat);
                  setFSub(catInfo(fType, cat).subs[0]);
                }}
              >
                {listFor(fType).map((c) => (
                  <option key={c.key} value={c.key}>{c.key}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Sub-kelompok</label>
              <select value={fSub} onChange={(e) => setFSub(e.target.value)}>
                {catInfo(fType, fCategory).subs.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{hasItems ? "Jumlah (Rp) — dari rincian" : "Jumlah (Rp)"}</label>
              <input
                type="number"
                min="1"
                placeholder="0"
                value={hasItems ? String(itemsTotal) : fAmount}
                readOnly={hasItems}
                onChange={(e) => setFAmount(e.target.value)}
                required
              />
            </div>
            <div className="field note">
              <label>Catatan (opsional)</label>
              <input type="text" placeholder="mis. makan siang di kantor" value={fNote} onChange={(e) => setFNote(e.target.value)} />
            </div>
            <div className="field items">
              <div className="items-head">
                <label>Rincian barang (opsional)</label>
                <button className="add-item-btn" type="button" onClick={addItem}><Plus size={13} /> Tambah barang</button>
              </div>
              {fItems.map((it) => (
                <div className="item-row" key={it.id}>
                  <input
                    className="item-name"
                    type="text"
                    placeholder="Nama barang"
                    aria-label="Nama barang"
                    value={it.name}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="Qty"
                    aria-label="Jumlah barang"
                    value={it.qty}
                    onChange={(e) => updateItem(it.id, { qty: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Harga satuan"
                    aria-label="Harga satuan"
                    value={it.price}
                    onChange={(e) => updateItem(it.id, { price: e.target.value })}
                    required
                  />
                  <span className="item-sub">{rupiah(itemsSum([it]))}</span>
                  <button className="row-btn del" type="button" onClick={() => removeItem(it.id)} aria-label="Hapus barang"><X size={14} /></button>
                </div>
              ))}
              {hasItems && <div className="items-total">Total rincian: {rupiah(itemsTotal)}</div>}
            </div>
            <div className="form-actions">
              <button className="submit-btn" type="submit">
                {editingId ? "Simpan Perubahan" : <><Plus size={15} /> Simpan Transaksi</>}
              </button>
              {editingId && <button className="cancel-btn" type="button" onClick={resetForm}>Batal</button>}
            </div>
          </form>
        </div>

        {/* 4. RIWAYAT PEMASUKAN DAN PENGELUARAN */}
        <div className="card">
          <h2>Riwayat Pemasukan & Pengeluaran — {monthLabel}</h2>
          <div className="history-controls">
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="Semua">Semua Kelompok</option>
              <optgroup label="Pemasukan">
                {categories.pemasukan.map((c) => (
                  <option key={c.key} value={c.key}>{c.key}</option>
                ))}
              </optgroup>
              <optgroup label="Pengeluaran">
                {categories.pengeluaran.map((c) => (
                  <option key={c.key} value={c.key}>{c.key}</option>
                ))}
              </optgroup>
            </select>
            <div className="toggle-group">
              <button className={groupBy === "tanggal" ? "active" : ""} onClick={() => setGroupBy("tanggal")}>Per Tanggal</button>
              <button className={groupBy === "kategori" ? "active" : ""} onClick={() => setGroupBy("kategori")}>Per Kategori</button>
            </div>
          </div>

          {filteredHistory.length === 0 && (
            <div className="empty">Belum ada transaksi tercatat untuk periode ini. Mulai catat di atas.</div>
          )}

          {groupBy === "tanggal" &&
            groupedByDate.map((g) => (
              <div className="group-block" key={g.label}>
                <div className="group-title">{fmtDateHeader(g.label)}</div>
                {g.items.map((t) => renderTx(t, false))}
              </div>
            ))}

          {groupBy === "kategori" &&
            groupedByCategory.map((g) => (
              <div className="group-block" key={g.label}>
                <div className="group-title">
                  <span className="dot" style={{ background: g.color }}></span>
                  {g.label} · {rupiah(g.items.reduce((sum, t) => sum + t.amount, 0))}
                </div>
                {g.items.map((t) => renderTx(t, true))}
              </div>
            ))}
        </div>
      </div>

      {showSettings && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}>
          <div className="panel">
            <div className="panel-head">
              <h2>Pengaturan</h2>
              <button onClick={() => setShowSettings(false)}><X size={18} /></button>
            </div>

            <div className="tabs">
              <button className={settingsTab === "anggaran" ? "active" : ""} onClick={() => setSettingsTab("anggaran")}>Anggaran</button>
              <button className={settingsTab === "kelompok" ? "active" : ""} onClick={() => setSettingsTab("kelompok")}>Kelompok & Sub-kelompok</button>
            </div>

            {settingsTab === "anggaran" && (
              <>
                <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 14px" }}>
                  Anggaran untuk <strong>{monthLabel}</strong>. Bulan lain punya anggaran sendiri.
                </p>
                {prevBudgetKey && (
                  <button className="btn-ghost copy-budget-btn" type="button" onClick={() => setBudgetDraft({ ...budgets[prevBudgetKey] })}>
                    Salin dari {monthName(prevBudgetKey)}
                  </button>
                )}
                {categories.pengeluaran.map((c) => (
                  <div className="budget-row" key={c.key}>
                    <label><span className="dot" style={{ background: c.color }}></span>{c.key}</label>
                    <input
                      type="number"
                      min="0"
                      value={budgetDraft[c.key] ?? 0}
                      onChange={(e) => setBudgetDraft((prev) => ({ ...prev, [c.key]: Number(e.target.value) }))}
                    />
                  </div>
                ))}
                <div className="panel-actions">
                  <button className="btn-ghost" onClick={() => setShowSettings(false)}>Batal</button>
                  <button className="btn-primary" onClick={saveSettings}>Simpan Anggaran</button>
                </div>
                <button className="btn-danger-text" onClick={clearAllData}>Hapus semua data</button>
              </>
            )}

            {settingsTab === "kelompok" && (
              <>
                <div className="manage-type-toggle">
                  <button className={manageType === "pengeluaran" ? "active" : ""} onClick={() => setManageType("pengeluaran")}>Pengeluaran</button>
                  <button className={manageType === "pemasukan" ? "active" : ""} onClick={() => setManageType("pemasukan")}>Pemasukan</button>
                </div>

                {categories[manageType].map((c) => (
                  <div className="cat-block" key={c.key}>
                    <div className="cat-head">
                      <span className="dot" style={{ background: c.color }}></span>
                      <input
                        key={c.key}
                        defaultValue={c.key}
                        onBlur={(e) => renameCategory(manageType, c.key, e.target.value)}
                        aria-label="Nama kelompok"
                      />
                      <button className="icon-btn" onClick={() => deleteCategory(manageType, c.key)} aria-label={`Hapus kelompok ${c.key}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="sub-list">
                      {c.subs.map((s) => (
                        <div className="sub-chip" key={`${c.key}-${s}`}>
                          <input
                            key={`${c.key}-${s}`}
                            defaultValue={s}
                            onBlur={(e) => renameSub(manageType, c.key, s, e.target.value)}
                            style={{ width: `${Math.max(s.length, 4)}ch` }}
                            aria-label="Nama sub-kelompok"
                          />
                          <button onClick={() => deleteSub(manageType, c.key, s)} aria-label={`Hapus sub-kelompok ${s}`}>
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="add-sub-row">
                      <input
                        placeholder="Tambah sub-kelompok…"
                        value={subDrafts[c.key] || ""}
                        onChange={(e) => setSubDrafts((prev) => ({ ...prev, [c.key]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSub(manageType, c.key))}
                      />
                      <button onClick={() => addSub(manageType, c.key)} type="button">+</button>
                    </div>
                  </div>
                ))}

                <div className="add-cat-row">
                  <input
                    placeholder={`Nama kelompok ${manageType} baru…`}
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory(manageType))}
                  />
                  <button onClick={() => addCategory(manageType)} type="button"><Plus size={14} /> Tambah</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
