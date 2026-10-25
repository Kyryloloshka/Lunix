export interface PagePoint {
  pageX: number;
  pageY: number;
}

export interface ClientPoint {
  clientX: number;
  clientY: number;
}

export interface BoundingBox {
  left: number;
  top: number;
  width?: number;
  height?: number;
}

/**
 * Converts screen/client coordinates directly into local coordinates
 * relative to the targeted container bounding box.
 */
export function toLocalSurfacePoint(
  point: { clientX: number; clientY: number },
  rect: { left: number; top: number; width?: number; height?: number },
): { x: number; y: number } {
  const rawX = point.clientX - rect.left;
  const rawY = point.clientY - rect.top;

  const x = typeof rect.width === 'number' && rect.width > 0
    ? Math.max(0, Math.min(rect.width, rawX))
    : rawX;
  const y = typeof rect.height === 'number' && rect.height > 0
    ? Math.max(0, Math.min(rect.height, rawY))
    : rawY;

  return { x, y };
}

/** Backward-compatible helper for page coordinates */
export function toSurfacePoint(
  point: PagePoint,
  surface: { x: number; y: number; width?: number; height?: number },
) {
  return toLocalSurfacePoint(
    { clientX: point.pageX, clientY: point.pageY },
    { left: surface.x, top: surface.y, width: surface.width, height: surface.height },
  );
}

export interface ZonePoint {
  x: number;
  y: number;
}

export interface ZoneSize {
  width: number;
  height: number;
}

/**
 * Maps a touch reported by the gesture handler (already relative to the tap zone's top-left corner)
 * to the floaters layer that covers the whole zone (T-012). The layer and the zone share one origin,
 * so the point is kept as is and only clamped into the zone, so a floater never spawns off-screen.
 * Before the first layout the size is unknown and the point is passed through unclamped.
 * Non-finite input (a broken native event) falls back to the zone's top-left corner.
 */
export function toZonePoint(touch: ZonePoint, zone: ZoneSize | null): ZonePoint {
  const x = Number.isFinite(touch.x) ? touch.x : 0;
  const y = Number.isFinite(touch.y) ? touch.y : 0;
  if (!zone || !(zone.width > 0) || !(zone.height > 0)) {
    return { x: Math.max(0, x), y: Math.max(0, y) };
  }
  return {
    x: Math.max(0, Math.min(zone.width, x)),
    y: Math.max(0, Math.min(zone.height, y)),
  };
}

/** Point used for taps without coordinates (screen-reader "activate"): the middle of the zone. */
export function zoneCenter(zone: ZoneSize | null): ZonePoint {
  if (!zone || !(zone.width > 0) || !(zone.height > 0)) return { x: 0, y: 0 };
  return { x: zone.width / 2, y: zone.height / 2 };
}
