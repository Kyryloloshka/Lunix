import { toZonePoint, zoneCenter } from '../model/touchCoordinates';

// T-012: the tap zone is the whole Console tab (between HUD and dock); the editor is only its visual centre.
// Touches arrive relative to the zone, and floaters are drawn on a layer covering the whole zone.
describe('tap zone coordinates (T-012)', () => {
  // A phone-sized zone; the editor card sits roughly at x 16..359, y 70..450
  const zone = { width: 375, height: 620 };

  it('keeps taps outside the editor at their touch point instead of snapping them to the editor', () => {
    // Below the editor, in the formerly "dead" area
    expect(toZonePoint({ x: 40, y: 560 }, zone)).toEqual({ x: 40, y: 560 });
    // In the side gutter next to the editor
    expect(toZonePoint({ x: 6, y: 300 }, zone)).toEqual({ x: 6, y: 300 });
    // Above the editor, over the rank kicker
    expect(toZonePoint({ x: 187, y: 12 }, zone)).toEqual({ x: 187, y: 12 });
  });

  it('maps three simultaneous fingers anywhere in the zone to independent points', () => {
    const fingers = [
      { id: 1, x: 20, y: 600 },
      { id: 2, x: 187, y: 250 },
      { id: 3, x: 360, y: 30 },
    ];
    const points = fingers.map((finger) => toZonePoint(finger, zone));
    expect(new Set(fingers.map((finger) => finger.id)).size).toBe(3);
    expect(points).toEqual([
      { x: 20, y: 600 },
      { x: 187, y: 250 },
      { x: 360, y: 30 },
    ]);
  });

  it('clamps touches on the zone edge into the zone so floaters never spawn under HUD or dock', () => {
    expect(toZonePoint({ x: -4, y: -10 }, zone)).toEqual({ x: 0, y: 0 });
    expect(toZonePoint({ x: 400, y: 700 }, zone)).toEqual({ x: 375, y: 620 });
  });

  it('passes points through (non-negative) before the zone has been measured', () => {
    expect(toZonePoint({ x: 120, y: 900 }, null)).toEqual({ x: 120, y: 900 });
    expect(toZonePoint({ x: -5, y: 10 }, { width: 0, height: 0 })).toEqual({ x: 0, y: 10 });
  });

  it('falls back to a finite point for broken native events', () => {
    expect(toZonePoint({ x: Number.NaN, y: Number.POSITIVE_INFINITY }, zone)).toEqual({ x: 0, y: 0 });
  });

  it('puts the screen-reader "activate" tap in the middle of the zone', () => {
    expect(zoneCenter(zone)).toEqual({ x: 187.5, y: 310 });
    expect(zoneCenter(null)).toEqual({ x: 0, y: 0 });
  });
});
