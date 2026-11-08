// Alamat backend API. Secara bawaan request lewat proxy Vite (/be) sehingga
// aplikasi dapat dibuka dari komputer maupun HP. Ubah lewat VITE_API_URL di .env
export const API_URL = import.meta.env.VITE_API_URL || '/be';
