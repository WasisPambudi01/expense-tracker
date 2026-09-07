import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Trash2, Settings2, X, Plus, LogOut, Mail } from "lucide-react";
import { supabase } from "./supabaseClient";

const DEFAULT_EXPENSE = [
  { key: "Tagihan", color: "#3B5D50", subs: ["Listrik", "Air", "Internet/WiFi", "Pulsa & Paket Data", "Sewa/Kos", "Asuransi", "Lainnya"] },
  { key: "Makan & Minum", color: "#C4632B", subs: ["Sarapan", "Makan Siang", "Makan Malam", "Kopi & Snack", "Lainnya"] },
  { key: "Belanja", color: "#7C5A8B", subs: ["Kebutuhan Rumah", "Pakaian", "Elektronik", "Perawatan Diri", "Lainnya"] },
  { key: "Transportasi", color: "#35617A", subs: ["Bensin", "Ojek Online", "Transportasi Umum", "Parkir & Tol", "Servis Kendaraan", "Lainnya"] },
  { key: "Lainnya", color: "#8A7B5E", subs: ["Hiburan", "Kesehatan", "Pendidikan", "Sosial & Hadiah", "Lainnya"] },
  { key: "Tabungan", color: "#C99A44", subs: ["Tabungan Umum", "Dana Darurat", "Investasi", "Tujuan Khusus"] },
];

const DEFAULT_INCOME = [
  { key: "Gaji", color: "#2E6F6B", subs: ["Gaji Pokok", "Tunjangan", "Lembur"] },
  { key: "Bonus & Hadiah", color: "#B98A2E", subs: ["Bonus", "THR", "Hadiah", "Lainnya"] },
  { key: "Usaha & Investasi", color: "#4A6FA5", subs: ["Usaha Sampingan", "Freelance", "Hasil Investasi", "Lainnya"] },
  { key: "Pemasukan Lainnya", color: "#7A7A6E", subs: ["Lainnya"] },
];

const PALETTE = ["#3B5D50", "#C4632B", "#7C5A8B", "#35617A", "#8A7B5E", "#C99A44", "#2E6F6B", "#B98A2E", "#4A6FA5", "#7A7A6E", "#9C4F4F", "#5C7A99"];
const nextColor = (list) => PALETTE[list.length % PALETTE.length];

const rupiah = (n) => "Rp" + Math.round(n || 0).toLocaleString("id-ID");
const monthKey = (d) => d.toISOString().slice(0, 7);
const todayStr = () => new Date().toISOString().slice(0, 10);
const getDefaultBudgets = (expenseList) => Object.fromEntries(expenseList.map((c) => [c.key, 0]));

export default function ExpenseTracker() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authStatus, setAuthStatus] = useState("idle"); // idle | sending | sent | error
  const [authError, setAuthError] = useState("");

  const [loaded, setLoaded] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState(getDefaultBudgets(DEFAULT_EXPENSE));
  const [categories, setCategories] = useState({ pemasukan: DEFAULT_INCOME, pengeluaran: DEFAULT_EXPENSE });
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const listFor = (type) => categories[type];
  const catInfo = (type, name) => categories[type].find((c) => c.key === name) || categories[type][0];

  const [fType, setFType] = useState("pengeluaran");
  const [fDate, setFDate] = useState(todayStr());
  const [fCategory, setFCategory] = useState(DEFAULT_EXPENSE[0].key);
  const [fSub, setFSub] = useState(DEFAULT_EXPENSE[0].subs[0]);
  const [fAmount, setFAmount] = useState("");
  const [fNote, setFNote] = useState("");

  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("anggaran");
  const [budgetDraft, setBudgetDraft] = useState(budgets);
  const [manageType, setManageType] = useState("pengeluaran");
  const [newCatName, setNewCatName] = useState("");
  const [subDrafts, setSubDrafts] = useState({});

  const [filterCat, setFilterCat] = useState("Semua");
  const [groupBy, setGroupBy] = useState("tanggal");

  // ---- Autentikasi (magic link email, lewat Supabase Auth) ----
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

  async function sendMagicLink(e) {
    e.preventDefault();
    if (!authEmail.trim()) return;
    setAuthStatus("sending");
    setAuthError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setAuthStatus("error");
      setAuthError(error.message);
    } else {
      setAuthStatus("sent");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setLoaded(false);
    setTransactions([]);
    setBudgets(getDefaultBudgets(DEFAULT_EXPENSE));
    setCategories({ pemasukan: DEFAULT_INCOME, pengeluaran: DEFAULT_EXPENSE });
  }

  // ---- Muat data dari Supabase saat sudah login ----
  useEffect(() => {
    if (!session) return;
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
          const loadedCats = parsed.categories || { pemasukan: DEFAULT_INCOME, pengeluaran: DEFAULT_EXPENSE };
          const normalized = (parsed.transactions || []).map((t) => ({
            ...t,
            type: t.type || (loadedCats.pemasukan.some((c) => c.key === t.category) ? "pemasukan" : "pengeluaran"),
          }));
          setCategories(loadedCats);
          setTransactions(normalized);
          setBudgets({ ...getDefaultBudgets(loadedCats.pengeluaran), ...(parsed.budgets || {}) });
          if (loadedCats.pengeluaran[0]) {
            setFCategory(loadedCats.pengeluaran[0].key);
            setFSub(loadedCats.pengeluaran[0].subs[0]);
          }
        }
      } catch (e) {
        console.error("Gagal memuat data dari Supabase", e);
      }
      setLoaded(true);
    })();
  }, [session]);

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

  const monthLabel = cursor.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const mKey = monthKey(cursor);
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
  const totalBudgetPengeluaran = categories.pengeluaran.filter((c) => c.key !== "Tabungan").reduce((s, c) => s + (budgets[c.key] || 0), 0);
  const sisaBudget = totalBudgetPengeluaran - totalPengeluaran;
  const saldo = totalPemasukan - totalPengeluaran - totalTabungan;

  function changeMonth(delta) {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + delta);
    setCursor(d);
  }

  function switchType(type) {
    setFType(type);
    const first = listFor(type)[0];
    setFCategory(first.key);
    setFSub(first.subs[0]);
  }

  function submitTransaction(e) {
    e.preventDefault();
    const amt = Number(fAmount);
    if (!amt || amt <= 0 || !fSub) return;
    const tx = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      type: fType,
      date: fDate,
      category: fCategory,
      subcategory: fSub,
      amount: amt,
      note: fNote.trim(),
    };
    setTransactions((prev) => [tx, ...prev]);
    setFAmount("");
    setFNote("");
  }

  function deleteTx(id) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  function openSettings(tab) {
    setBudgetDraft(budgets);
    setSettingsTab(tab || "anggaran");
    setShowSettings(true);
  }

  function saveSettings() {
    setBudgets(budgetDraft);
    setShowSettings(false);
  }

  function clearAllData() {
    if (window.confirm("Hapus semua transaksi dan anggaran? Tindakan ini tidak bisa dibatalkan.")) {
      setTransactions([]);
      setBudgets(getDefaultBudgets(categories.pengeluaran));
      setShowSettings(false);
    }
  }

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
      setBudgets((prev) => {
        const { [oldKey]: val, ...rest } = prev;
        return { ...rest, [newKey]: val ?? 0 };
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
    if (type === "pengeluaran") setBudgets((prev) => ({ ...prev, [name]: 0 }));
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
      setBudgets((prev) => {
        const { [key]: _, ...rest } = prev;
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

  const loginStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=Inter:wght@400;500;600&display=swap');
    .login-wrap { min-height: 100vh; background: #F6F3EC; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: 'Inter', sans-serif; }
    .login-card { background: #fff; border: 1px solid #E1DCCC; border-radius: 16px; padding: 32px; width: 100%; max-width: 380px; text-align: center; }
    .login-card h1 { font-family: 'Lora', serif; color: #1E3932; font-size: 24px; margin: 0 0 6px; }
    .login-card p { color: #6B675E; font-size: 13.5px; margin: 0 0 22px; line-height: 1.5; }
    .login-card input { width: 100%; border: 1px solid #E1DCCC; border-radius: 8px; padding: 11px 12px; font-size: 14px; margin-bottom: 12px; box-sizing: border-box; }
    .login-card button { width: 100%; background: #1E3932; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; }
    .login-card button:disabled { opacity: 0.6; cursor: default; }
    .login-msg { font-size: 13px; margin-top: 14px; }
    .login-msg.ok { color: #2E6F6B; }
    .login-msg.err { color: #B4483C; }
  `;

  if (checkingSession) {
    return <div style={{ padding: 40, fontFamily: "Inter, sans-serif", color: "#6B675E" }}>Memuat…</div>;
  }

  if (!session) {
    return (
      <div className="login-wrap">
        <style>{loginStyles}</style>
        <div className="login-card">
          <h1>Buku Kas</h1>
          <p>Masuk dengan email untuk menyimpan dan menyinkronkan catatan keuanganmu di semua perangkat.</p>
          <form onSubmit={sendMagicLink}>
            <input
              type="email"
              required
              placeholder="emailmu@contoh.com"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
            />
            <button type="submit" disabled={authStatus === "sending"}>
              <Mail size={15} /> {authStatus === "sending" ? "Mengirim…" : "Kirim Link Masuk"}
            </button>
          </form>
          {authStatus === "sent" && (
            <div className="login-msg ok">Link masuk sudah dikirim ke {authEmail}. Buka email itu dan klik link-nya untuk masuk.</div>
          )}
          {authStatus === "error" && <div className="login-msg err">Gagal mengirim: {authError}</div>}
        </div>
      </div>
    );
  }

  if (!loaded) {
    return <div style={{ padding: 40, fontFamily: "Inter, sans-serif", color: "#6B675E" }}>Memuat data…</div>;
  }

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

        .app {
          --bg: #F6F3EC;
          --surface: #FFFFFF;
          --ink: #21201C;
          --ink-soft: #6B675E;
          --line: #E1DCCC;
          --primary: #1E3932;
          --accent: #C99A44;
          --income: #2E6F6B;
          --danger: #B4483C;
          background: var(--bg);
          color: var(--ink);
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          padding: clamp(14px, 4vw, 28px);
          box-sizing: border-box;
        }
        .app * { box-sizing: border-box; }
        .wrap { max-width: 880px; margin: 0 auto; }

        .month-nav { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
        .month-nav button { background: none; border: 1px solid var(--line); border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--ink); flex-shrink: 0; }
        .month-nav button:hover { background: var(--surface); }
        .month-label { font-family: 'IBM Plex Mono', monospace; font-size: 13px; letter-spacing: 0.02em; color: var(--ink-soft); }

        .title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
        h1 { font-family: 'Lora', serif; font-weight: 600; font-size: clamp(22px, 4vw, 30px); margin: 0; color: var(--primary); }
        .settings-btn { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: var(--ink); min-height: 40px; }
        .settings-btn:hover { border-color: var(--primary); }

        .hero { background: var(--primary); border-radius: 16px; padding: clamp(18px, 3vw, 26px); display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .hero-item .lbl { color: #C9D6CC; font-size: 12px; margin-bottom: 6px; }
        .hero-item .val { font-family: 'IBM Plex Mono', monospace; font-size: clamp(18px, 3vw, 24px); font-weight: 600; color: #fff; word-break: break-word; }
        .hero-item .sub { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; margin-top: 4px; }
        .sub.pos { color: #9FD9B4; }
        .sub.neg { color: #F0A99C; }

        .card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: clamp(14px, 3vw, 20px); margin-bottom: 20px; }
        .card h2 { font-family: 'Lora', serif; font-size: 17px; font-weight: 600; margin: 0 0 16px; color: var(--ink); }

        .type-toggle { display: flex; gap: 8px; margin-bottom: 16px; }
        .type-toggle button { flex: 1; border: 1px solid var(--line); border-radius: 8px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; background: var(--bg); color: var(--ink-soft); min-height: 42px; }
        .type-toggle button.active.income { background: var(--income); color: #fff; border-color: var(--income); }
        .type-toggle button.active.expense { background: var(--primary); color: #fff; border-color: var(--primary); }

        form.tx-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; align-items: end; }
        .field { display: flex; flex-direction: column; gap: 5px; }
        .field.note, .submit-btn { grid-column: 1 / -1; }
        .field label { font-size: 12px; color: var(--ink-soft); }
        .field input, .field select { border: 1px solid var(--line); border-radius: 8px; padding: 10px; font-size: 14px; font-family: 'Inter', sans-serif; background: var(--bg); color: var(--ink); min-height: 42px; width: 100%; }
        .field input:focus, .field select:focus { outline: 2px solid var(--primary); outline-offset: 1px; }
        .submit-btn { background: var(--primary); color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; }
        .submit-btn:hover { opacity: 0.92; }

        .budget-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
        .budget-card { border: 1px solid var(--line); border-radius: 12px; padding: 14px; }
        .budget-card .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .budget-card .name { font-weight: 600; font-size: 14px; display: flex; align-items: center; }
        .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; margin-right: 7px; flex-shrink: 0; }
        .budget-card .amounts { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--ink-soft); margin-bottom: 8px; word-break: break-word; }
        .track { background: var(--bg); border-radius: 6px; height: 8px; overflow: hidden; }
        .fill { height: 100%; border-radius: 6px; transition: width 0.3s ease; }
        .status-line { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; margin-top: 8px; }

        .history-controls { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
        .history-controls select { border: 1px solid var(--line); border-radius: 8px; padding: 9px 10px; font-size: 13px; background: var(--bg); color: var(--ink); min-height: 40px; flex: 1 1 160px; }
        .toggle-group { display: flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; flex: 1 1 260px; }
        .toggle-group button { border: none; background: var(--bg); padding: 9px 10px; font-size: 12.5px; cursor: pointer; color: var(--ink-soft); flex: 1; min-height: 40px; }
        .toggle-group button.active { background: var(--primary); color: #fff; }

        .group-block { margin-bottom: 18px; }
        .group-title { font-size: 13px; font-weight: 600; color: var(--ink-soft); margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .tx-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line); gap: 10px; }
        .tx-row:last-child { border-bottom: none; }
        .tx-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .tx-cat { font-size: 13px; font-weight: 600; overflow-wrap: break-word; }
        .tx-note { font-size: 12px; color: var(--ink-soft); overflow-wrap: break-word; }
        .tx-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .tx-amount { font-family: 'IBM Plex Mono', monospace; font-size: 13.5px; font-weight: 600; white-space: nowrap; }
        .tx-amount.income { color: var(--income); }
        .tx-amount.savings { color: var(--accent); }
        .del-btn { background: none; border: none; color: var(--ink-soft); cursor: pointer; padding: 6px; display: flex; }
        .del-btn:hover { color: var(--danger); }
        .empty { color: var(--ink-soft); font-size: 13px; padding: 20px 0; text-align: center; }

        .overlay { position: fixed; inset: 0; background: rgba(33,32,28,0.45); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
        .panel { background: var(--surface); border-radius: 14px; padding: 24px; width: 100%; max-width: 480px; max-height: 85vh; overflow-y: auto; }
        .panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .panel-head h2 { font-family: 'Lora', serif; font-size: 19px; margin: 0; }
        .panel-head button { background: none; border: none; cursor: pointer; color: var(--ink-soft); }

        .tabs { display: flex; border-bottom: 1px solid var(--line); margin-bottom: 18px; gap: 4px; }
        .tabs button { background: none; border: none; padding: 9px 4px; margin-right: 14px; font-size: 13px; font-weight: 600; color: var(--ink-soft); cursor: pointer; border-bottom: 2px solid transparent; }
        .tabs button.active { color: var(--primary); border-bottom-color: var(--primary); }

        .budget-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 10px; }
        .budget-row label { font-size: 13px; display: flex; align-items: center; }
        .budget-row input { width: 130px; border: 1px solid var(--line); border-radius: 8px; padding: 8px 9px; font-family: 'IBM Plex Mono', monospace; font-size: 13px; text-align: right; }
        .panel-actions { display: flex; gap: 10px; margin-top: 18px; }
        .panel-actions button { flex: 1; border-radius: 8px; padding: 11px; font-size: 13px; cursor: pointer; min-height: 42px; }
        .btn-primary { background: var(--primary); color: #fff; border: none; }
        .btn-ghost { background: none; border: 1px solid var(--line); color: var(--ink); }
        .btn-danger-text { background: none; border: none; color: var(--danger); font-size: 12px; cursor: pointer; margin-top: 14px; text-decoration: underline; padding: 4px 0; }

        .manage-type-toggle { display: flex; gap: 8px; margin-bottom: 16px; }
        .manage-type-toggle button { flex: 1; border: 1px solid var(--line); border-radius: 8px; padding: 8px; font-size: 12.5px; font-weight: 600; cursor: pointer; background: var(--bg); color: var(--ink-soft); }
        .manage-type-toggle button.active { background: var(--primary); color: #fff; border-color: var(--primary); }

        .cat-block { border: 1px solid var(--line); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
        .cat-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .cat-head input { flex: 1; border: 1px solid transparent; background: transparent; font-size: 14px; font-weight: 600; padding: 5px 6px; border-radius: 6px; color: var(--ink); min-width: 0; }
        .cat-head input:focus { border-color: var(--line); background: var(--bg); outline: none; }
        .icon-btn { background: none; border: none; color: var(--ink-soft); cursor: pointer; padding: 5px; display: flex; flex-shrink: 0; }
        .icon-btn:hover { color: var(--danger); }
        .sub-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
        .sub-chip { display: flex; align-items: center; gap: 5px; background: var(--bg); border-radius: 999px; padding: 3px 4px 3px 10px; }
        .sub-chip input { border: none; background: transparent; font-size: 12.5px; width: auto; min-width: 40px; padding: 2px; color: var(--ink); }
        .sub-chip input:focus { outline: none; }
        .sub-chip button { background: none; border: none; color: var(--ink-soft); cursor: pointer; display: flex; padding: 2px; }
        .sub-chip button:hover { color: var(--danger); }
        .add-sub-row { display: flex; gap: 6px; }
        .add-sub-row input { flex: 1; border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font-size: 12.5px; }
        .add-sub-row button { border: 1px solid var(--line); background: var(--bg); border-radius: 6px; padding: 0 10px; cursor: pointer; color: var(--ink); }
        .add-cat-row { display: flex; gap: 8px; margin-top: 6px; }
        .add-cat-row input { flex: 1; border: 1px solid var(--line); border-radius: 8px; padding: 9px 10px; font-size: 13px; }
        .add-cat-row button { background: var(--primary); color: #fff; border: none; border-radius: 8px; padding: 0 14px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; }

        @media (max-width: 480px) {
          .title-row { align-items: flex-start; }
          .settings-btn { width: 100%; justify-content: center; }
        }
      `}</style>

      <div className="wrap">
        <div className="month-nav">
          <button onClick={() => changeMonth(-1)} aria-label="Bulan sebelumnya"><ChevronLeft size={16} /></button>
          <span className="month-label">{monthLabel.toUpperCase()}</span>
          <button onClick={() => changeMonth(1)} aria-label="Bulan berikutnya"><ChevronRight size={16} /></button>
        </div>

        <div className="title-row">
          <h1>Buku Kas</h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="settings-btn" onClick={() => openSettings("anggaran")}><Settings2 size={15} /> Pengaturan</button>
            <button className="settings-btn" onClick={signOut}><LogOut size={15} /> Keluar</button>
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
            <div className="val" style={{ color: "#F2DBA0" }}>{rupiah(totalTabungan)}</div>
          </div>
          <div className="hero-item">
            <div className="lbl">Saldo Bersih</div>
            <div className="val" style={{ color: saldo >= 0 ? "#9FD9B4" : "#F0A99C" }}>{rupiah(saldo)}</div>
          </div>
        </div>

        {/* 2. ANGGARAN DAN SISA BUDGET */}
        <div className="card">
          <h2>Anggaran & Sisa Budget — {monthLabel}</h2>
          <div className="budget-grid">
            {categories.pengeluaran.map((c) => {
              const spent = spentByCategory[c.key] || 0;
              const budget = budgets[c.key] || 0;
              const isSavings = c.key === "Tabungan";
              const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : spent > 0 ? 100 : 0;
              let fillColor = c.color;
              if (!isSavings && budget > 0) {
                if (spent > budget) fillColor = "#B4483C";
                else if (spent >= budget * 0.8) fillColor = "#C99A44";
                else fillColor = "#1E3932";
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
                    <div className="status-line" style={{ color: isSavings ? "#C99A44" : spent > budget ? "#B4483C" : "#6B675E" }}>
                      {isSavings
                        ? `Terkumpul ${Math.round(pct)}% dari target`
                        : spent > budget
                        ? `Lebih ${rupiah(spent - budget)} dari anggaran`
                        : `Sisa ${rupiah(budget - spent)}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. TAMBAH TRANSAKSI */}
        <div className="card">
          <h2>Tambah Transaksi</h2>
          <div className="type-toggle">
            <button className={fType === "pemasukan" ? "active income" : ""} onClick={() => switchType("pemasukan")} type="button">Pemasukan</button>
            <button className={fType === "pengeluaran" ? "active expense" : ""} onClick={() => switchType("pengeluaran")} type="button">Pengeluaran</button>
          </div>
          <form className="tx-form" onSubmit={submitTransaction}>
            <div className="field">
              <label>Tanggal</label>
              <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} required />
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
              <label>Jumlah (Rp)</label>
              <input type="number" min="1" placeholder="0" value={fAmount} onChange={(e) => setFAmount(e.target.value)} required />
            </div>
            <div className="field note">
              <label>Catatan (opsional)</label>
              <input type="text" placeholder="mis. makan siang di kantor" value={fNote} onChange={(e) => setFNote(e.target.value)} />
            </div>
            <button className="submit-btn" type="submit"><Plus size={15} /> Simpan Transaksi</button>
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
                {g.items.map((t) => (
                  <div className="tx-row" key={t.id}>
                    <div className="tx-main">
                      <span className="tx-cat">{t.category} — {t.subcategory}</span>
                      {t.note && <span className="tx-note">{t.note}</span>}
                    </div>
                    <div className="tx-right">
                      <span className={`tx-amount ${t.type === "pemasukan" ? "income" : t.category === "Tabungan" ? "savings" : ""}`}>
                        {t.type === "pemasukan" ? "+" : "-"}{rupiah(t.amount)}
                      </span>
                      <button className="del-btn" onClick={() => deleteTx(t.id)} aria-label="Hapus transaksi"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {groupBy === "kategori" &&
            groupedByCategory.map((g) => (
              <div className="group-block" key={g.label}>
                <div className="group-title">
                  <span className="dot" style={{ background: g.color }}></span>
                  {g.label} · {rupiah(g.items.reduce((s, t) => s + t.amount, 0))}
                </div>
                {g.items.map((t) => (
                  <div className="tx-row" key={t.id}>
                    <div className="tx-main">
                      <span className="tx-cat">{t.subcategory}</span>
                      <span className="tx-note">
                        {new Date(t.date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        {t.note ? ` · ${t.note}` : ""}
                      </span>
                    </div>
                    <div className="tx-right">
                      <span className={`tx-amount ${t.type === "pemasukan" ? "income" : t.category === "Tabungan" ? "savings" : ""}`}>
                        {t.type === "pemasukan" ? "+" : "-"}{rupiah(t.amount)}
                      </span>
                      <button className="del-btn" onClick={() => deleteTx(t.id)} aria-label="Hapus transaksi"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
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
