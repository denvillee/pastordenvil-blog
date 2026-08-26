import TwoAges from '../components/diagrams/TwoAges.astro';

/* Diagrams are Astro components, not .svg files, so they inherit currentColor and
   the palette tokens and keep adapting to light and dark. A flat exported SVG would
   not. Register a new drawing here once and any piece in any room can name it in
   its `diagram:` field. */
export const DIAGRAMS: Record<string, any> = { TwoAges };

export const diagramNames = Object.keys(DIAGRAMS);

export function getDiagram(name?: string) {
  return name ? DIAGRAMS[name] ?? null : null;
}
