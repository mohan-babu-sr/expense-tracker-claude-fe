/**
 * Chart.js draws on a <canvas>, which cannot use CSS variables (and our M3 theme values are
 * `light-dark(…)` expressions). Let the browser resolve a theme token to a plain rgb() string
 * by applying it to a hidden element and reading the computed color.
 */
export function resolveThemeColor(token: string, fallback = 'rgb(0, 92, 187)'): string {
  if (typeof document === 'undefined') return fallback;
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color || fallback;
}

/** Same rgb color with transparency, e.g. rgb(1, 2, 3) → rgba(1, 2, 3, 0.35). */
export function withAlpha(rgb: string, alpha: number): string {
  const m = rgb.match(/\d+(\.\d+)?/g);
  return m && m.length >= 3 ? `rgba(${m[0]}, ${m[1]}, ${m[2]}, ${alpha})` : rgb;
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** ₹1,23,457 — compact rupees for axis ticks and tooltips. */
export const formatInr = (value: number) => inr.format(value);
