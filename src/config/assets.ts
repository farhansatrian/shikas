/**
 * Central asset path registry for ShiKas (雫).
 *
 * Drop your custom images into `/public/assets/` and update the paths below.
 */
export const SHIKAS_ASSETS = {
  /** High-resolution pink watercolor backdrops copied from SHIZUKU portfolio */
  bgWatercolorPc: "/assets/bg-watercolor-pc.jpg",
  bgWatercolorSp: "/assets/bg-watercolor-sp.jpg",
  raindropLine: "/assets/raindrop-line.png",

  /** Main centered artwork on the HOME gallery view */
  heroMain: "/assets/tumblr_ohhlp7vvyH1qegob8o3_1280.jpg",

  /** Optional extra slots */
  avatar: "" as string,
} as const;
