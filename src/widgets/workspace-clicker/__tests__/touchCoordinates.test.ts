import { toLocalSurfacePoint, toSurfacePoint } from '../model/touchCoordinates';

describe('touchCoordinates engine', () => {
  it('correctly maps client screen coordinates to local surface coordinates', () => {
    const rect = { left: 100, top: 150, width: 300, height: 400 };
    const point = { clientX: 250, clientY: 300 };

    const local = toLocalSurfacePoint(point, rect);
    expect(local).toEqual({ x: 150, y: 150 });
  });

  it('clamps coordinates to the bounding box if tap occurs slightly outside edges', () => {
    const rect = { left: 100, top: 150, width: 300, height: 400 };

    expect(toLocalSurfacePoint({ clientX: 50, clientY: 100 }, rect)).toEqual({ x: 0, y: 0 });
    expect(toLocalSurfacePoint({ clientX: 500, clientY: 600 }, rect)).toEqual({ x: 300, y: 400 });
  });

  it('backward compatibility toSurfacePoint converts page point against surface rect', () => {
    expect(toSurfacePoint({ pageX: 220, pageY: 350 }, { x: 100, y: 200, width: 300, height: 400 })).toEqual({
      x: 120,
      y: 150,
    });
  });

  it('accurately maintains positions for rapid multi-point taps across surface', () => {
    const rect = { left: 40, top: 80, width: 300, height: 200 };
    const simulatedPoints = [
      { clientX: 40, clientY: 80 },
      { clientX: 190, clientY: 180 },
      { clientX: 340, clientY: 280 },
    ];

    const results = simulatedPoints.map((p) => toLocalSurfacePoint(p, rect));
    expect(results).toEqual([
      { x: 0, y: 0 },
      { x: 150, y: 100 },
      { x: 300, y: 200 },
    ]);
  });
});
