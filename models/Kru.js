// ============================================
// Kelas Kru (turunan User)
// Kru ikut bertugas pada jadwal bersama sopir, tetapi tidak memiliki akun login.
// ============================================
const User = require('./User');

class Kru extends User {
    bisaLogin() { return false; }
}

module.exports = Kru;
