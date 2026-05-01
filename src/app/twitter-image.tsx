// Twitter card uses the same image as Open Graph.
// Re-importing the default would lose the per-file edge-runtime export,
// so we re-declare it here.
export { default } from './opengraph-image'
export { alt, size, contentType } from './opengraph-image'
export const runtime = 'edge'
