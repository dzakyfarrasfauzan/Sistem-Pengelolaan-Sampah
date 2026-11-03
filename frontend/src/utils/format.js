// Lama waktu dalam jam menjadi teks, misalnya "2 hari 3 jam"
export const formatUmur = (jam) => {
  if (jam == null) return '-';
  if (jam < 24) return `${Math.round(jam)} jam`;
  return `${Math.floor(jam / 24)} hari ${Math.round(jam % 24)} jam`;
};
