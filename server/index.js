const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Koneksi Database
// Gunakan connectionString jika tersedia, atau parameter terpisah
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Disarankan pakai ini untuk Cloud DB
  ssl: {
    rejectUnauthorized: false // Wajib untuk sebagian besar Cloud DB (Neon/Supabase)
  }
});

// 2. Setup Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Catatan: Pastikan nama model benar. Saat ini yang umum adalah 'gemini-1.5-flash'
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

// === ROUTES ===

app.get('/', (req, res) => {
    res.send("Server Finance AI Berjalan!");
});

app.get('/transactions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json(err.message);
  }
});

app.post('/transactions', async (req, res) => {
  const { description, amount, type, category } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO transactions (description, amount, type, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [description, amount, type, category]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json(err.message);
  }
});

app.delete('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
    res.json("Transaction deleted");
  } catch (err) {
    console.error(err);
    res.status(500).json(err.message);
  }
});

app.get('/ai-insight', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions');
    const transactions = result.rows;
    const dataString = JSON.stringify(transactions);
    
    const prompt = `
      Bertindaklah sebagai penasihat keuangan pribadi. 
      Berikut adalah data transaksi saya dalam format JSON: ${dataString}.
      Tolong berikan:
      1. Total Pengeluaran vs Pemasukan.
      2. Kategori apa yang paling boros.
      3. Satu saran singkat dan lucu untuk berhemat.
      Jawab dalam Bahasa Indonesia yang santai.
    `;

    const resultAI = await model.generateContent(prompt);
    const response = await resultAI.response;
    const text = response.text();

    res.json({ insight: text });
  } catch (err) {
    console.error(err);
    res.status(500).json("Gagal mengambil analisis AI");
  }
});

// PENTING UNTUK VERCEL:
// Jangan gunakan app.listen secara langsung di root level untuk production Vercel
// Gunakan export default app
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server berjalan di port ${PORT}`);
    });
}

module.exports = app;