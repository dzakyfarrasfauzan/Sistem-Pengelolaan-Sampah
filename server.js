// ============================================
// Server Entry Point
// Sistem Pengelolaan Sampah - DLH Sukabumi
// ============================================

const express = require('express');
const path = require('path');
const session = require('express-session');

// Initialize database (triggers schema + seed)
require('./database/db');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Enable CORS for React frontend
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));

// ============================================
// Middleware
// ============================================

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files (foto laporan masyarakat)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Session configuration
app.use(session({
    secret: 'sampah-dlh-sukabumi-secret-2024',
    resave: false,
    saveUninitialized: false
}));

// ============================================
// Routes
// ============================================

// Public routes
app.use('/api/public', require('./routes/public'));

// Authentication routes
app.use('/', require('./routes/auth'));

// Admin routes
app.use('/admin', require('./routes/admin'));

// Petugas routes
app.use('/petugas', require('./routes/petugas'));

// Sopir routes
app.use('/sopir', require('./routes/sopir'));

// API routes
app.use('/api', require('./routes/api'));

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

// General error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
    console.log('============================================');
    console.log('  Sistem Pengelolaan Sampah');
    console.log('  Dinas Lingkungan Hidup Kabupaten Sukabumi');
    console.log(`  Server berjalan di http://localhost:${PORT}`);
    console.log('============================================');
});
