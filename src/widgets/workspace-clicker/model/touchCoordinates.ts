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
