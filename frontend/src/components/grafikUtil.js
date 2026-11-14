// Warna seri (sudah divalidasi untuk buta warna dan kontras pada latar putih)
export const WARNA_SERI = { masuk: '#3b6ea8', selesai: '#2f8a5b' };

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const labelBulan = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return `${NAMA_BULAN[m - 1]} ${String(y).slice(2)}`;
};

