/**
 * Central asset path registry for ShiKas (雫).
 *
 * Drop your custom images into `/public/assets/` and update the paths below
 * (or tell me the filenames you placed in `public/assets/`).
 */
export const SHIKAS_ASSETS = {
  /** High-resolution pink watercolor backdrops copied from SHIZUKU portfolio */
  bgWatercolorPc: "/assets/bg-watercolor-pc.jpg",
  bgWatercolorSp: "/assets/bg-watercolor-sp.jpg",
  raindropLine: "/assets/raindrop-line.png",

  /**
   * Home Diptych artwork slots:
   * Replace `heroLeft` with `/assets/hero-left.jpg` (or `.png` / `.webp`)
   * whenever you drop your custom illustration into `public/assets/`.
   */
  heroLeft: "/assets/hero-left.svg",
  heroRight: "" as string,
  avatar: "" as string,
} as const;
