// Kesalahan yang sengaja dilempar model ketika data tidak valid.
// Controller mengubahnya menjadi jawaban HTTP dengan kode status yang sesuai.
class Galat extends Error {
    constructor(status, message, tambahan = {}) {
        super(message);
        this.status = status;
        this.tambahan = tambahan;
    }
}

// Jalankan isi handler; Galat dijawab sesuai statusnya, kesalahan lain dijawab 500
// (dengan pesanGagal bila diberikan, atau pesan kesalahannya)
const tangani = (fn, pesanGagal = null) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (err) {
        if (err instanceof Galat) return res.status(err.status).json({ success: false, ...err.tambahan, message: err.message });
        if (pesanGagal) console.error(`${pesanGagal}:`, err.message);
        res.status(500).json({ success: false, message: pesanGagal || err.message });
    }
};

module.exports = { Galat, tangani };
