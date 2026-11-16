// maps severity score [0 to 1] to rgb color (cyan -> amber -> red)
export function getSeverityColor(score) {
  const s = Math.max(0, Math.min(1, score ?? 0));

  const cyan = [0, 212, 255];
  const amber = [245, 158, 11];
  const red = [239, 68, 68];

  let r, g, b;

  if (s < 0.5) {
    const t = s * 2;
    r = Math.round(cyan[0] + (amber[0] - cyan[0]) * t);
    g = Math.round(cyan[1] + (amber[1] - cyan[1]) * t);
    b = Math.round(cyan[2] + (amber[2] - cyan[2]) * t);
  } else {
    const t = (s - 0.5) * 2;
    r = Math.round(amber[0] + (red[0] - amber[0]) * t);
    g = Math.round(amber[1] + (red[1] - amber[1]) * t);
    b = Math.round(amber[2] + (red[2] - amber[2]) * t);
  }

  return `rgb(${r}, ${g}, ${b})`;
}
