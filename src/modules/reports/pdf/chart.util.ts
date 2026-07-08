/**
 * Inline-SVG chart helpers ported from the reference KvsCharts.tsx so the
 * server-rendered PDF matches the official KVS look exactly:
 *  - ColumnChart: single-series region columns, light steel-blue, with the
 *    national-average column highlighted navy and inserted at its rank.
 *  - CategoryBarChart: one coloured column per category (subjects/competencies).
 * No chart library — the SVG string is embedded straight into the print HTML.
 */

const NAT_FILL = '#1f4e79';
const BAR_FILL = '#a6c4e6';
const AXIS = '#cbd5e1';
const GRID = '#eef2f7';
const TEXT = '#374151';
const CAT_PALETTE = ['#26b3a6', '#f39c12', '#9aa0a6', '#f2c40d', '#82c341', '#5b9bd5', '#e67e22', '#c0504d', '#6f42c1', '#20a4a0'];

function esc(s: any): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string),
  );
}
const numLabel = (v: number) => String(Math.round(v * 100) / 100);

const HI = '#2f9e44';
const LO = '#e03131';

export interface ColumnRow {
  regionName: string;
  avgPct: number;
  students?: number;
  hi?: number; // highest individual student score in the region
  lo?: number; // lowest individual student score in the region
}

/** Single-series vertical column chart with an inserted navy national bar.
 *  When showMarkers is set, each column also gets a green "Highest Score" and
 *  red "Lowest Score" tick, plus a legend (matches the target's overall charts). */
export function columnChartSvg(
  title: string,
  data: ColumnRow[],
  opts: { nationalAvg?: number; nationalStudents?: number; nationalLabel?: string; insertNationalBar?: boolean; sort?: boolean; showMarkers?: boolean; highlightRegion?: string } = {},
): string {
  if (!data.length) return '';
  const { nationalAvg, nationalStudents, nationalLabel = 'All Regions', insertNationalBar = true, sort = true, showMarkers = false, highlightRegion } = opts;

  type Kind = 'reg' | 'nat';
  const base: Array<ColumnRow & { kind: Kind }> = (sort ? [...data].sort((a, b) => b.avgPct - a.avgPct) : [...data]).map(
    (d) => ({ ...d, kind: (highlightRegion && d.regionName === highlightRegion ? 'nat' : 'reg') as Kind }),
  );
  let rows = base;
  if (nationalAvg != null && insertNationalBar) {
    let idx = base.findIndex((d) => d.avgPct <= nationalAvg);
    if (idx === -1) idx = base.length;
    const natHi = showMarkers && base.length ? Math.max(...base.map((d) => d.hi ?? 0)) : undefined;
    const natLo = showMarkers && base.length ? Math.min(...base.map((d) => d.lo ?? 0)) : undefined;
    rows = [
      ...base.slice(0, idx),
      { regionName: nationalLabel, avgPct: nationalAvg, students: nationalStudents, hi: natHi, lo: natLo, kind: 'nat' },
      ...base.slice(idx),
    ];
  }

  const nn = rows.length;
  const slot = nn <= 6 ? Math.min(120, Math.max(72, 660 / nn)) : 32;
  const barW = Math.min(slot * 0.6, 46);
  const mLeft = 34, mRight = 14, mTop = 58, plotH = 220, labelH = 128;
  const legendH = showMarkers ? 22 : 0;
  const width = mLeft + nn * slot + mRight;
  const height = mTop + plotH + labelH + legendH;
  const baseY = mTop + plotH;
  const maxV = showMarkers ? 100 : Math.max(10, Math.ceil(Math.max(...rows.map((r) => r.avgPct)) / 10) * 10);
  const y = (v: number) => baseY - (v / maxV) * plotH;
  const fillFor = (k: Kind) => (k === 'nat' ? NAT_FILL : BAR_FILL);

  const grid = Array.from({ length: 5 }, (_, i) => {
    const v = (maxV / 4) * i;
    const gy = y(v);
    return `<line x1="${mLeft}" y1="${gy.toFixed(1)}" x2="${width - mRight}" y2="${gy.toFixed(1)}" stroke="${GRID}" stroke-width="1"/>
      <text x="${mLeft - 4}" y="${(gy + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="#9ca3af">${Math.round(v)}</text>`;
  }).join('');

  const bars = rows
    .map((r, i) => {
      const cx = mLeft + i * slot + slot / 2;
      const top = y(r.avgPct);
      const bx = cx - barW / 2;
      const emph = r.kind !== 'reg';
      const col = fillFor(r.kind);
      const label = r.students != null ? `${r.regionName} (${r.students.toLocaleString('en-IN')})` : r.regionName;
      // Ticks plus their numeric labels (highest above its tick, rotated like
      // the average label; lowest just above its tick, white on the bar) —
      // matches the target report's grade charts.
      const marks =
        showMarkers && r.hi != null && r.lo != null
          ? `<line x1="${bx.toFixed(1)}" y1="${y(r.hi).toFixed(1)}" x2="${(bx + barW).toFixed(1)}" y2="${y(r.hi).toFixed(1)}" stroke="${HI}" stroke-width="2.5"/>
             <text x="${cx.toFixed(1)}" y="${(y(r.hi) - 4).toFixed(1)}" transform="rotate(-90 ${cx.toFixed(1)} ${(y(r.hi) - 4).toFixed(1)})" text-anchor="start" font-size="7.5" fill="#374151">${numLabel(r.hi)}</text>
             <line x1="${bx.toFixed(1)}" y1="${y(r.lo).toFixed(1)}" x2="${(bx + barW).toFixed(1)}" y2="${y(r.lo).toFixed(1)}" stroke="${LO}" stroke-width="2.5"/>
             <text x="${cx.toFixed(1)}" y="${(y(r.lo) - 3).toFixed(1)}" text-anchor="middle" font-size="7" font-weight="700" fill="#fff">${numLabel(r.lo)}</text>`
          : '';
      return `
        <rect x="${bx.toFixed(1)}" y="${top.toFixed(1)}" width="${barW.toFixed(1)}" height="${(baseY - top).toFixed(1)}" fill="${col}"/>
        ${marks}
        <text x="${cx.toFixed(1)}" y="${(top - 3).toFixed(1)}" transform="rotate(-90 ${cx.toFixed(1)} ${(top - 3).toFixed(1)})"
              text-anchor="start" font-size="8" font-weight="${emph ? 700 : 400}" fill="${emph ? col : '#374151'}">${numLabel(r.avgPct)}</text>
        <text x="${cx.toFixed(1)}" y="${(baseY + 6).toFixed(1)}" transform="rotate(-90 ${cx.toFixed(1)} ${(baseY + 6).toFixed(1)})"
              text-anchor="end" font-size="7.5" font-weight="${emph ? 700 : 400}" fill="${emph ? col : '#4b5563'}">${esc(label)}</text>`;
    })
    .join('');

  const ly = height - 7;
  const legend = showMarkers
    ? `<rect x="${mLeft}" y="${ly - 8}" width="11" height="8" fill="${BAR_FILL}"/>
       <text x="${mLeft + 15}" y="${ly - 1}" font-size="9" fill="${TEXT}">Overall Average</text>
       <line x1="${mLeft + 112}" y1="${ly - 4}" x2="${mLeft + 128}" y2="${ly - 4}" stroke="${HI}" stroke-width="2.5"/>
       <text x="${mLeft + 132}" y="${ly - 1}" font-size="9" fill="${TEXT}">Highest Score</text>
       <line x1="${mLeft + 218}" y1="${ly - 4}" x2="${mLeft + 234}" y2="${ly - 4}" stroke="${LO}" stroke-width="2.5"/>
       <text x="${mLeft + 238}" y="${ly - 1}" font-size="9" fill="${TEXT}">Lowest Score</text>`
    : '';

  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" style="max-width:100%;height:auto;display:block;margin:0 auto" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif">
    <text x="${width / 2}" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#1f2937">${esc(title)}</text>
    ${grid}
    <line x1="${mLeft}" y1="${baseY}" x2="${width - mRight}" y2="${baseY}" stroke="${AXIS}" stroke-width="1"/>
    ${bars}
    ${legend}
  </svg>`;
}

export interface CategoryRow {
  label: string;
  value: number;
}

/** Categorical coloured bar chart (subjects / competencies overall). */
export function categoryBarChartSvg(title: string, data: CategoryRow[], opts: { sortDesc?: boolean; palette?: string[] } = {}): string {
  if (!data.length) return '';
  const { sortDesc = true, palette = CAT_PALETTE } = opts;
  const rows = sortDesc ? [...data].sort((a, b) => b.value - a.value) : [...data];
  const nn = rows.length;
  const slot = Math.min(160, Math.max(78, 760 / nn));
  const barW = Math.min(slot * 0.5, 74);
  const mLeft = 26, mRight = 16, mTop = 44, plotH = 185, labelH = 40;
  const width = mLeft + nn * slot + mRight;
  const height = mTop + plotH + labelH;
  const baseY = mTop + plotH;
  const maxV = Math.max(10, Math.ceil(Math.max(...rows.map((r) => r.value)) / 10) * 10);
  const y = (v: number) => baseY - (v / maxV) * plotH;

  const bars = rows
    .map((r, i) => {
      const cx = mLeft + i * slot + slot / 2;
      const bx = cx - barW / 2;
      const top = y(r.value);
      return `
        <rect x="${bx.toFixed(1)}" y="${top.toFixed(1)}" width="${barW.toFixed(1)}" height="${(baseY - top).toFixed(1)}" fill="${palette[i % palette.length]}"/>
        <text x="${cx.toFixed(1)}" y="${(top - 5).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="600" fill="#374151">${numLabel(r.value)}</text>
        <text x="${cx.toFixed(1)}" y="${(baseY + 15).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="#4b5563">${esc(r.label)}</text>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" style="max-width:100%;height:auto;display:block;margin:0 auto" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif">
    <text x="${width / 2}" y="20" text-anchor="middle" font-size="13" font-weight="700" fill="#1f2937">${esc(title)}</text>
    <line x1="${mLeft}" y1="${baseY}" x2="${width - mRight}" y2="${baseY}" stroke="${AXIS}" stroke-width="1"/>
    ${bars}
  </svg>`;
}
