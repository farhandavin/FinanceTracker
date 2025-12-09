const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Koneksi Database
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// 2. Setup Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Menggunakan model flash agar cepat
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

// === ROUTES ===

// GET: Ambil semua transaksi
app.get('/transactions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

// POST: Tambah transaksi baru
app.post('/transactions', async (req, res) => {
  const { description, amount, type, category } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO transactions (description, amount, type, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [description, amount, type, category]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

// DELETE: Hapus transaksi
app.delete('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
    res.json("Transaction deleted");
  } catch (err) {
    res.status(500).json(err.message);
  }
});

// === FITUR AI: FINANCIAL ADVISOR ===
app.get('/ai-insight', async (req, res) => {
  try {
    // 1. Ambil data transaksi dari DB
    const result = await pool.query('SELECT * FROM transactions');
    const transactions = result.rows;

    // 2. Siapkan Prompt untuk Gemini
    // Kita ubah data JSON menjadi string agar bisa dibaca AI
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

    // 3. Kirim ke Gemini
    const resultAI = await model.generateContent(prompt);
    const response = await resultAI.response;
    const text = response.text();

    res.json({ insight: text });
  } catch (err) {
    console.error(err);
    res.status(500).json("Gagal mengambil analisis AI");
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server berjalan di port ${process.env.PORT}`);
});