import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const directory = process.argv[2] ?? 'coverage';
const { total } = JSON.parse(
  await readFile(join(directory, 'coverage-summary.json'), 'utf8'),
);
const metrics = ['lines', 'functions', 'branches', 'statements'];

for (const metric of metrics) {
  const percentage = total?.[metric]?.pct;
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new Error(`Invalid coverage percentage for ${metric}: ${percentage}`);
  }
}

function badge(label, percentage) {
  const message = `${percentage.toFixed(2)}%`;
  const labelWidth = label.length * 7 + 10;
  const valueWidth = 60;
  const width = labelWidth + valueWidth;
  let color = '#e05d44';
  if (percentage >= 90) {
    color = '#4c1';
  } else if (percentage >= 80) {
    color = '#97ca00';
  } else if (percentage >= 60) {
    color = '#dfb317';
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${label}: ${message}">
  <title>${label}: ${message}</title>
  <linearGradient id="shade" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="round"><rect width="${width}" height="20" rx="3"/></clipPath>
  <g clip-path="url(#round)">
    <path fill="#555" d="M0 0h${labelWidth}v20H0z"/>
    <path fill="${color}" d="M${labelWidth} 0h${valueWidth}v20h-${valueWidth}z"/>
    <path fill="url(#shade)" d="M0 0h${width}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${message}</text>
  </g>
</svg>
`;
}

await mkdir(join(directory, 'badges'), { recursive: true });
for (const metric of metrics.filter((metric) => metric !== 'statements')) {
  await writeFile(
    join(directory, 'badges', `${metric}.svg`),
    badge(`TypeScript ${metric}`, total[metric].pct),
  );
}

const rows = metrics.map((metric) => {
  const { pct, covered, total: count } = total[metric];
  return `| ${metric} | ${pct.toFixed(2)}% | ${covered} / ${count} |`;
});
const summary = [
  '## Test coverage',
  '',
  '| Metric | Coverage | Covered / total |',
  '| --- | --- | --- |',
  ...rows,
  '',
  'Download the `test-coverage` artifact and open `index.html` for the full report.',
  '',
].join('\n');

await writeFile(join(directory, 'summary.md'), summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
}
process.stdout.write(summary);
