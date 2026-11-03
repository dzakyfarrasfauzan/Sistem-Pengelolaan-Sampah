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
 * Membatasi akses sesuai peran akun (admin, pengawas, sopir)
 */
function requireRole(role, label) {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized. Silakan login kembali.' });
        }
        if (req.session.user.role !== role) {
            return res.status(403).json({ success: false, message: `Akses ditolak. Anda bukan ${label}.` });
        }
        next();
    };
}

const requireAdmin = requireRole('admin', 'admin');
const requirePengawas = requireRole('pengawas', 'pengawas bidang');
const requireSopir = requireRole('sopir', 'sopir');

module.exports = { requireLogin, requireAdmin, requirePengawas, requireSopir };
