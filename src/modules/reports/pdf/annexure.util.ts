/**
 * Annexure SVG panels ported from the reference national-report page:
 *  - attainmentPanelSvg  → Annexure 1 (region-wise competency attainment bars)
 *  - schoolPerfPanelSvg  → Annexure 2 (per-region school-wise performance)
 * All values come from the report data object; nothing is hard-coded.
 */

function esc(s: any): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string),
  );
}

export interface AttainmentRow {
  label: string;
  value: number;
  color: string;
  bold?: boolean;
}

/** Horizontal attainment bars for one region (or "All Regions").
 *  Sized to match the target PDF: ~2 readable panels per page. */
export function attainmentPanelSvg(title: string, rows: AttainmentRow[]): string {
  // Row height adapts to the row count so the whole panel fits one page
  // (2 panels/page like the target). Bigger rows for shorter panels.
  const n = rows.length;
  const rowH = n > 60 ? 12.5 : n > 45 ? 15 : 18;
  const labelW = 132, valueW = 30, top = 24;
  const width = 340, barMax = width - labelW - valueW - 6;
  const height = top + n * rowH + 8;

  const body = rows
    .map((r, i) => {
      const y = top + i * rowH;
      const val = Number(r.value) || 0;
      const bw = Math.max(1, (val / 100) * barMax);
      return `
        <text x="${labelW - 4}" y="${(y + rowH - 4).toFixed(1)}" text-anchor="end" font-size="8" font-weight="${r.bold ? 700 : 400}" fill="#374151">${esc(r.label)}</text>
        <rect x="${labelW}" y="${(y + 2).toFixed(1)}" width="${bw.toFixed(1)}" height="${rowH - 5}" fill="${r.color}"/>
        <text x="${(labelW + bw + 3).toFixed(1)}" y="${(y + rowH - 4).toFixed(1)}" font-size="8" font-weight="${r.bold ? 700 : 400}" fill="#374151">${val.toFixed(2)}</text>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" style="height:auto;display:block" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif">
    <text x="${width / 2}" y="16" text-anchor="middle" font-size="13" font-weight="700" fill="#1f2937">${esc(title)}</text>
    ${body}
  </svg>`;
}

// Segment colours: Average (blue), then G3 green / G6 orange / G9 yellow / purple.
const SEG = ['#5b9bd5', '#82c341', '#f5a623', '#f2c40d', '#9b7fc7'];

/** Per-region school-wise performance chart (matches the target PDF): one row
 *  per school as a stacked bar of Average + per-grade averages, sorted by
 *  Average, with the ALL REGIONS and region rows boxed in black. Sized to fill
 *  a full page (one region per page). */
export function schoolPerfChart(report: any, regionName: string): string {
  const grades = report.grades;
  const mk = (name: string, overall: number, gvals: number[], hl = false) => ({ name, overall, gvals, hl });

  const schools = (report.schoolsByRegion?.[regionName] ?? []).map((s: any) =>
    mk(s.schoolName, s.overall, grades.map((g: any) => s.byGrade?.[g.gradeId] ?? 0)),
  );
  const allRow = mk('ALL REGIONS', report.overall.nationalAvgPct, grades.map((g: any) => g.nationalAvgPct), true);
  const regionRow = mk(
    regionName.toUpperCase(),
    report.overall.regions.find((x: any) => x.regionName === regionName)?.avgPct ?? 0,
    grades.map((g: any) => g.regionRanking.find((x: any) => x.regionName === regionName)?.avgPct ?? 0),
    true,
  );
  const all = [...schools, allRow, regionRow].sort((a, b) => b.overall - a.overall);
  if (!all.length) return '';

  const labelW = 285, top = 48, pad = 8, width = 720;
  // Fill the page vertically: target a near-full A4 content height so the chart
  // uses the available space instead of leaving the lower third of the page
  // blank. Row height adapts to school count but is capped so that regions with
  // few schools still get bold, readable bars rather than a thin strip.
  const targetH = 930;
  const rowH = Math.max(9, Math.min(26, (targetH - top - 10) / all.length));
  const nameF = Math.min(9, rowH - 3);
  const valF = Math.min(8, rowH - 4);
  const maxTotal = Math.max(...all.map((r) => r.overall + r.gvals.reduce((s: number, v: number) => s + (Number(v) || 0), 0)), 1);
  const barMax = width - labelW - pad - 6;
  const scale = barMax / maxTotal;
  const height = top + all.length * rowH + 10;

  let lx = labelW;
  const legend = [`Average (${grades.map((g: any) => g.gradeNumber).join(',')})`, ...grades.map((g: any) => `G${g.gradeNumber}_Average`)]
    .map((lbl, i) => {
      const item = `<rect x="${lx}" y="30" width="10" height="10" fill="${SEG[i % SEG.length]}"/><text x="${lx + 14}" y="39" font-size="9" fill="#374151">${esc(lbl)}</text>`;
      lx += 14 + lbl.length * 5.4 + 16;
      return item;
    })
    .join('');

  const rows = all
    .map((r, i) => {
      const y = top + i * rowH;
      let x = labelW;
      const box = r.hl
        ? `<rect x="2" y="${(y - 0.5).toFixed(1)}" width="${width - 4}" height="${rowH}" fill="none" stroke="#111" stroke-width="1.5"/>`
        : '';
      const segEls = [r.overall, ...r.gvals]
        .map((v: number, si: number) => {
          const w = Math.max(0, (Number(v) || 0) * scale);
          const el = `<rect x="${x.toFixed(1)}" y="${(y + 2).toFixed(1)}" width="${w.toFixed(1)}" height="${(rowH - 4).toFixed(1)}" fill="${SEG[si % SEG.length]}"/>${
            w > 16 ? `<text x="${(x + w / 2).toFixed(1)}" y="${(y + rowH - 4.5).toFixed(1)}" text-anchor="middle" font-size="${valF.toFixed(1)}" fill="#2f2f2f">${(Number(v) || 0).toFixed(2)}</text>` : ''
          }`;
          x += w;
          return el;
        })
        .join('');
      return `${box}<text x="${(labelW - 6).toFixed(1)}" y="${(y + rowH - 4.5).toFixed(1)}" text-anchor="end" font-size="${nameF.toFixed(1)}" font-weight="${r.hl ? 700 : 400}" fill="#374151">${esc(r.name)}</text>${segEls}`;
    })
    .join('');

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" style="height:auto;display:block" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif">
    <text x="${width / 2}" y="18" text-anchor="middle" font-size="13" font-weight="700" fill="#1f2937">${esc(regionName)} — School-wise Performance</text>
    ${legend}
    ${rows}
  </svg>`;
}
