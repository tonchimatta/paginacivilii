// Viewport math. Zoom is interpolated geometrically and the screen centre moves linearly in
// world space, which reads as one continuous camera move instead of a zoom plus a pan.

export function viewportForBounds(bounds, width, height, { padding = 0.18, minZoom = 0.15, maxZoom = 1.1 } = {}) {
  const bw = Math.max(bounds.x2 - bounds.x1, 1);
  const bh = Math.max(bounds.y2 - bounds.y1, 1);
  const zoom = clamp(Math.min(width / bw, height / bh) / (1 + padding * 2), minZoom, maxZoom);
  const cx = (bounds.x1 + bounds.x2) / 2;
  const cy = (bounds.y1 + bounds.y2) / 2;
  return { x: width / 2 - cx * zoom, y: height / 2 - cy * zoom, zoom };
}

export function interpolateViewport(from, to, width, height) {
  const c0 = { x: (width / 2 - from.x) / from.zoom, y: (height / 2 - from.y) / from.zoom };
  const c1 = { x: (width / 2 - to.x) / to.zoom, y: (height / 2 - to.y) / to.zoom };
  return (p) => {
    const zoom = from.zoom * Math.pow(to.zoom / from.zoom, p);
    const cx = c0.x + (c1.x - c0.x) * p;
    const cy = c0.y + (c1.y - c0.y) * p;
    return { x: width / 2 - cx * zoom, y: height / 2 - cy * zoom, zoom };
  };
}

export function boundsOf(rects) {
  return rects.reduce(
    (b, r) => ({
      x1: Math.min(b.x1, r.x),
      y1: Math.min(b.y1, r.y),
      x2: Math.max(b.x2, r.x + r.w),
      y2: Math.max(b.y2, r.y + r.h),
    }),
    { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity },
  );
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
