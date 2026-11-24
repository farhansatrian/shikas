# ShiKas Assets Directory (`public/assets/`)

Taruh file gambar kamu di folder ini. Path aktifnya terdaftar terpusat di `src/config/assets.ts`:

| Path File | Fungsi di Aplikasi | Status |
|---|---|---|
| `public/assets/bg-watercolor-pc.jpg` | Background watercolor resolusi tinggi (Desktop) | Disalin dari `shizuku` |
| `public/assets/bg-watercolor-sp.jpg` | Background watercolor resolusi tinggi (Mobile) | Disalin dari `shizuku` |
| `public/assets/raindrop-line.png` | Garis pembatas *raindrop* pada halaman `LEDGER` | Disalin dari `shizuku` |
| `public/assets/tumblr_ohhlp7vvyH1qegob8o3_1280.jpg` | **Gambar utama terpusat** di halaman `HOME` | Aktif dipakai di `SHIKAS_ASSETS.heroMain` |
| `public/assets/hero-left.svg` | Cadangan ilustrasi monokrom bawaan | Tersedia |

> **Cara ganti gambar nanti:** cukup taruh gambar baru di `public/assets/<nama-file>`, lalu ganti nilai `heroMain` di `src/config/assets.ts` menjadi `"/assets/<nama-file>"` (atau langsung minta saya pasangkan).
