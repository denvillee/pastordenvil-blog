/*
  Which image paths are stand-ins rather than photographs.

  The repository ships three abstract gradients under names that read like
  photographs: hero, feature and portrait. They were placeholders from the
  first build and they are still placeholders. Rendering them as though they
  were pictures is how a stand-in ends up live, so anything on this list is
  drawn as a labelled placeholder instead, at the exact crop the design wants.

  Delete an entry the moment a real photograph replaces that file.
*/
const STANDINS = new Set([
  '/assets/img/hero.jpg',
  '/assets/img/feature.jpg',
  '/assets/img/portrait.jpg',
  '/assets/img/clip1.jpg',
  '/assets/img/clip2.jpg',
  '/assets/img/clip3.jpg',
]);

export const isStandin = (src?: string) => !!src && STANDINS.has(src);
