import { readFileSync, existsSync } from 'node:fs';

const required = [
  'docs/ANIMATION_SPEC.md',
  'src/components/GridVisualizer.tsx',
  'src/index.css',
  'tests/e2e/visualization.spec.ts',
];
const missing = required.filter(path => !existsSync(path));
if (missing.length) {
  console.error(`Missing animation acceptance files: ${missing.join(', ')}`);
  process.exit(1);
}

const visualizer = readFileSync('src/components/GridVisualizer.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const styles = readFileSync('src/index.css', 'utf8');
const spec = readFileSync('docs/ANIMATION_SPEC.md', 'utf8');
const checks = [
  ['keyed cell join', /\.data\(cellData,\s*d\s*=>\s*d\.id\)/.test(visualizer)],
  ['stable cell IDs', /id:\s*`\$\{r\}-\$\{c\}`/.test(visualizer)],
  ['transition interruption', /\.interrupt\('cell-enter'\)/.test(visualizer)],
  ['reduced motion in JS and CSS', /prefers-reduced-motion:\s*reduce/.test(visualizer) && /prefers-reduced-motion:\s*reduce/.test(styles)],
  ['teaching legend and narration', /aria-live="polite"/.test(app) && /aria-label="网格图例"/.test(app) && /step-narration/.test(app)],
  ['animation spec evidence', /## Evidence and limits/.test(spec)],
  ['no forbidden purple palette', !/#a78bfa|#c586c0|#8b5cf6|\bpurple\b|\bviolet\b/i.test(`${visualizer}\n${styles}\n${readFileSync('src/algorithm/rottingOranges.ts', 'utf8')}`)],
];
const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
for (const [name, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) process.exit(1);
