// ============================================
// Authentication & Authorization Middleware
// ============================================

/**
 * Require user to be logged in
 */
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Silakan login kembali.' });
    }
    next();
}

/**
 * Require user to be an admin
 */
function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Silakan login kembali.' });
    }
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Akses ditolak. Anda bukan admin.' });
    }
    next();
}

/**
 * Require user to be a petugas
 */
function requirePetugas(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Silakan login kembali.' });
    }
    if (req.session.user.role !== 'petugas') {
        return res.status(403).json({ success: false, message: 'Akses ditolak. Anda bukan petugas.' });
    }
    next();
}

/**
 * Require user to be a sopir
 */
function requireSopir(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Silakan login kembali.' });
    }
    if (req.session.user.role !== 'sopir') {
        return res.status(403).json({ success: false, message: 'Akses ditolak. Anda bukan sopir.' });
    }
    next();
}

module.exports = { requireLogin, requireAdmin, requirePetugas, requireSopir };
