/**
 * Central asset path registry for shikas (雫).
 *
 * Drop your custom images into `/public/assets/` and update the paths below.
 */
export const SHIKAS_ASSETS = {
  /** High-resolution pink watercolor backdrops copied from SHIZUKU portfolio */
  bgWatercolorPc: "/assets/bg-watercolor-pc.jpg",
  bgWatercolorSp: "/assets/bg-watercolor-sp.jpg",

  /** Vivid magenta-purple watercolor band copied from SHIZUKU footer (1024x171) */
  bgWatercolorBand: "/assets/bg-watercolor-band.jpg",

  /** Authentic SHIZUKU / TUYU horizontal raindrop divider & watercolor umbrella */
  raindropLine: "/assets/raindrop-line.png",
  umbrella: "/assets/shizuku-umbrella.png",

  /** Main centered artwork on the HOME gallery view */
  heroMain: "/assets/tumblr_m3ulw1fZ071qegob8o1_r1_500.gif",

  /** Optional extra slots */
  avatar: "" as string,
} as const;
