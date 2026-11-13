/**
 * Top-down singles court in a 600 x 320 viewBox, lying sideways: the upper (far)
 * player's half on the left, the net at x = 300. Court rect: x 20..580, y 20..300.
 */

/**
 * Top-down singles court in a 600 x 320 viewBox, lying sideways: the upper (far)
 * player's half on the left, the net at x = 300. Court rect: x 20..580, y 20..300.
 */
export const COURT_VIEWBOX = { width: 600, height: 320 };

export const COURT_RECT = { x: 20, y: 20, width: 560, height: 280 };

/** Normalised court point [across, along] (0..1, along = 0 at the far baseline) to SVG. */
export const toCourtSvg = (point: [number, number]): [number, number] => [
  COURT_RECT.x + point[1] * COURT_RECT.width,
  COURT_RECT.y + point[0] * COURT_RECT.height,
];
