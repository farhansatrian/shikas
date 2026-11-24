# ShiKas Assets Directory (`public/assets/`)

Taruh file gambar kamu di folder ini. Aplikasi **ShiKas** akan otomatis mendeteksi dan memakainya sesuai nama file berikut (mendukung `.jpg`, `.png`, atau `.webp`):

| Path File | Fungsi di Aplikasi | Status |
|---|---|---|
| `public/assets/bg-watercolor-pc.jpg` | Latar watercolor resolusi tinggi (Desktop) | Sudah disalin dari `shizuku` |
| `public/assets/bg-watercolor-sp.jpg` | Latar watercolor resolusi tinggi (Mobile) | Sudah disalin dari `shizuku` |
| `public/assets/raindrop-line.png` | Garis pembatas *raindrop* khas `shizuku` | Sudah disalin dari `shizuku` |
| `public/assets/hero-left.jpg` *(atau `.png`/`.webp`)* | **Ilustrasi sisi kiri** pada frame *Diptych* halaman `HOME` (sisi terang) | Opsional — otomatis menggantikan ilustrasi bawaan |
| `public/assets/hero-right.jpg` *(atau `.png`/`.webp`)* | **Ilustrasi latar halus sisi kanan** pada *Diptych* halaman `HOME` (opsional, tampil lembut di belakang ringkasan saldo gelap) | Opsional |
| `public/assets/avatar.jpg` *(atau `.png`/`.webp`)* | Avatar/ikon profil opsional di halaman `DATA` | Opsional |

> **Catatan Path di Kode React/Vite:** Semua file di dalam `public/assets/<nama-file>` diakses langsung melalui path `/assets/<nama-file>`.
