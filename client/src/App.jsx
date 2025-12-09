import { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import './App.css';

// Registrasi komponen Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  // --- STATE MANAGEMENT (SAMA SEPERTI SEBELUMNYA) ---
  const [transactions, setTransactions] = useState([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: 'Makanan'
  });
  const [aiInsight, setAiInsight] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  // --- FETCH DATA ---
  const fetchTransactions = async () => {
    try {
      const res = await axios.get('http://localhost:5000/transactions');
      setTransactions(res.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      // Data dummy untuk preview jika backend mati
      setTransactions([
        {id:1, description: 'Contoh Gaji', amount: 5000000, type: 'income', category: 'Gaji'},
        {id:2, description: 'Kopi', amount: 25000, type: 'expense', category: 'Makanan'},
      ]); 
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // --- HANDLE INPUT & SUBMIT ---
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/transactions', formData);
      fetchTransactions();
      setFormData({ description: '', amount: '', type: 'expense', category: 'Makanan' });
    } catch (err) {
      alert("Gagal menyimpan data (Pastikan Backend jalan)");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Coret transaksi ini?')) { // "Coret" lebih cocok dgn tema kertas
      await axios.delete(`http://localhost:5000/transactions/${id}`);
      fetchTransactions();
    }
  };

  const getAIInsight = async () => {
    setLoadingAI(true);
    try {
      const res = await axios.get('http://localhost:5000/ai-insight');
      setAiInsight(res.data.insight);
    } catch (err) {
      alert("Gagal menghubungi AI");
    }
    setLoadingAI(false);
  };

  // --- DATA CHART ---
  const incomeTotal = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const expenseTotal = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const chartData = {
    labels: ['Pemasukan', 'Pengeluaran'],
    datasets: [
      {
        data: [incomeTotal, expenseTotal],
        // Warna sedikit lebih 'pastel' agar cocok dengan kertas
        backgroundColor: ['#86c186', '#e06c6c'], 
        borderColor: '#41403e', // Border hitam chart
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Smart Finance</h1>
        <p>Managed by Gemini AI</p>
      </header>

      <div className="dashboard-grid">
        
        {/* KOLOM KIRI */}
        <div className="left-panel">
          <div className="card">
            <h3 className="card-title">Tambah Transaksi</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Deskripsi</label>
                <input 
                  type="text" 
                  name="description" 
                  placeholder="Beli Kopi..." 
                  value={formData.description} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Jumlah (Rp)</label>
                <input 
                  type="number" 
                  name="amount" 
                  placeholder="10000" 
                  value={formData.amount} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              
              {/* UPDATE: Menggunakan class col-50 agar responsif */}
              <div className="row form-group">
                <div className="col-50">
                  <label>Tipe</label>
                  <select name="type" value={formData.type} onChange={handleChange}>
                    <option value="expense">Pengeluaran</option>
                    <option value="income">Pemasukan</option>
                  </select>
                </div>
                <div className="col-50">
                  <label>Kategori</label>
                  <select name="category" value={formData.category} onChange={handleChange}>
                    <option value="Makanan">Makanan</option>
                    <option value="Transport">Transport</option>
                    <option value="Gaji">Gaji</option>
                    <option value="Hiburan">Hiburan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="paper-btn btn-primary btn-block">
                Simpan Transaksi
              </button>
            </form>
          </div>

          <div className="card">
            <h3 className="card-title">Analisis AI</h3>
            <button 
              onClick={getAIInsight} 
              disabled={loadingAI} 
              className="paper-btn btn-block btn-ai"
            >
              {loadingAI ? 'Sedang Menganalisis...' : 'Minta Saran Keuangan'}
            </button>
            {aiInsight && (
              <div className="ai-result" style={{marginTop: '15px'}}>
                <pre style={{whiteSpace: 'pre-wrap'}}>{aiInsight}</pre>
              </div>
            )}
          </div>
        </div>

        {/* KOLOM KANAN */}
        <div className="right-panel">
          <div className="card">
            <h3 className="card-title" style={{textAlign:'center'}}>Ringkasan</h3>
            
            {/* UPDATE: Wrapper chart agar responsif */}
            <div className="chart-wrapper">
              {transactions.length > 0 ? (
                 <Pie 
                   data={chartData} 
                   options={{ maintainAspectRatio: false, responsive: true }} 
                 />
              ) : <p style={{marginTop: '50px'}}>Belum ada data.</p>}
            </div>

            <div className="summary-row">
               <div>
                  <span>Masuk</span><br/>
                  <span className="text-green">Rp {incomeTotal.toLocaleString()}</span>
               </div>
               <div>
                  <span>Keluar</span><br/>
                  <span className="text-red">Rp {expenseTotal.toLocaleString()}</span>
               </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Riwayat</h3>
            <ul className="transaction-list">
              {transactions.map((t) => (
                <li key={t.id} className="transaction-item">
                  <div className="t-info">
                    <strong>{t.description}</strong><br/>
                    <small style={{opacity: 0.7}}>{t.category}</small>
                  </div>
                  <div className="t-amount">
                    <span className={t.type === 'income' ? 'text-green' : 'text-red'}>
                      {t.type === 'income' ? '+' : '-'} {Number(t.amount).toLocaleString()}
                    </span>
                    <button onClick={() => handleDelete(t.id)} className="paper-btn btn-small btn-danger btn-del">x</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;