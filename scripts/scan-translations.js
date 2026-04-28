const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VIEWS_DIR = path.join(ROOT, 'views');
const OUT_VI = path.join(ROOT, 'locales', 'vi', 'translation.scan.json');
const OUT_EN = path.join(ROOT, 'locales', 'en', 'translation.scan.json');
const OUT_VN = path.join(ROOT, 'locales', 'vn', 'translation.scan.json');

const walk = (dir, out = []) => {
  for (const name of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, name);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, out);
    } else if (fullPath.endsWith('.pug')) {
      out.push(fullPath);
    }
  }
  return out;
};

const normalizeText = (text) => String(text || '').replace(/\s+/g, ' ').trim();

const slugify = (text) =>
  normalizeText(text)
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);

const shouldKeep = (text) => {
  if (!text) return false;
  if (text.length < 2) return false;
  if (/^(https?:|\/|#|[0-9]+)$/.test(text)) return false;
  if (/[{}<>]/.test(text)) return false;
  if (/\b(class|href|src|type|name|data-)\b/.test(text)) return false;
  return true;
};

const extractTextsFromLine = (line) => {
  const result = [];
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('//-')) return result;

  // Pug text pipe
  const pipeMatch = trimmed.match(/^\|\s+(.+)$/);
  if (pipeMatch) {
    result.push(normalizeText(pipeMatch[1]));
  }

  // Placeholder/title/alt text in attributes
  const attrRegex = /(placeholder|title|alt)\s*=\s*'([^']+)'/g;
  let attrMatch = attrRegex.exec(line);
  while (attrMatch) {
    result.push(normalizeText(attrMatch[2]));
    attrMatch = attrRegex.exec(line);
  }

  return result.filter(shouldKeep);
};

const texts = new Map();
const files = walk(VIEWS_DIR);

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const extracted = extractTextsFromLine(line);
    extracted.forEach((text) => {
      if (!texts.has(text)) {
        texts.set(text, []);
      }
      texts.get(text).push(`${path.relative(ROOT, file)}:${index + 1}`);
    });
  });
}

const viOutput = {
  scan: {},
};
const enOutput = {
  scan: {},
};
const vnOutput = {
  scan: {},
};

const usedKeys = new Set();
for (const [text, refs] of Array.from(texts.entries()).sort((a, b) => a[0].localeCompare(b[0], 'vi'))) {
  let key = slugify(text);
  if (!key) continue;

  if (usedKeys.has(key)) {
    let i = 2;
    while (usedKeys.has(`${key}_${i}`)) i += 1;
    key = `${key}_${i}`;
  }
  usedKeys.add(key);

  viOutput.scan[key] = text;
  vnOutput.scan[key] = text;
  enOutput.scan[key] = text;
}

fs.mkdirSync(path.dirname(OUT_VI), { recursive: true });
fs.mkdirSync(path.dirname(OUT_EN), { recursive: true });
fs.mkdirSync(path.dirname(OUT_VN), { recursive: true });

fs.writeFileSync(OUT_VI, JSON.stringify(viOutput, null, 2));
fs.writeFileSync(OUT_EN, JSON.stringify(enOutput, null, 2));
fs.writeFileSync(OUT_VN, JSON.stringify(vnOutput, null, 2));

console.log(`Scanned ${files.length} pug files.`);
console.log(`Extracted ${usedKeys.size} candidate translation strings.`);
console.log(`Output: ${path.relative(ROOT, OUT_VI)}`);
console.log(`Output: ${path.relative(ROOT, OUT_EN)}`);
console.log(`Output: ${path.relative(ROOT, OUT_VN)}`);
