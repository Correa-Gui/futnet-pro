const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'treinamento-admin-primeira-semana.md');
const outputPath = path.join(__dirname, 'treinamento-admin-primeira-semana.html');

const md = fs.readFileSync(inputPath, 'utf8').replace(/\r\n/g, '\n');
const lines = md.split('\n');
const firstHeading = lines.find(line => line.startsWith('# ')) || '# Manual do Gestor - Uso do Sistema';
const docTitle = firstHeading.replace(/^#\s*/, '').trim();

function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(text) {
  let out = esc(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  return out;
}

const html = [];
html.push(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(docTitle)}</title>
  <style>
    :root {
      --bg: #f6f4ee;
      --card: #fffdf8;
      --ink: #1f1a17;
      --muted: #6a625c;
      --line: #e6ddd2;
      --brand: #204b57;
      --accent: #d98943;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: linear-gradient(180deg, #efe8dc 0%, var(--bg) 220px);
      color: var(--ink);
      font-family: Georgia, 'Times New Roman', serif;
      line-height: 1.65;
    }
    .wrap {
      max-width: 980px;
      margin: 0 auto;
      padding: 40px 24px 80px;
    }
    .doc {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(31, 26, 23, 0.08);
      overflow: hidden;
    }
    .hero {
      padding: 40px 48px 28px;
      background: radial-gradient(circle at top right, rgba(217,137,67,0.14), transparent 28%), linear-gradient(135deg, #204b57, #2a626f);
      color: white;
    }
    .hero h1 {
      margin: 0 0 10px;
      font-size: 42px;
      line-height: 1.05;
    }
    .hero p {
      margin: 0;
      max-width: 760px;
      color: rgba(255,255,255,0.9);
      font-size: 18px;
    }
    .content {
      padding: 36px 48px 56px;
    }
    h1, h2, h3 { line-height: 1.2; }
    h1 { font-size: 38px; margin: 0 0 14px; }
    h2 {
      margin: 42px 0 16px;
      font-size: 30px;
      color: var(--brand);
      border-top: 1px solid var(--line);
      padding-top: 24px;
    }
    h3 {
      margin: 28px 0 10px;
      font-size: 22px;
      color: #2f2925;
    }
    p { margin: 10px 0; }
    ul {
      margin: 8px 0 16px 22px;
      padding: 0;
    }
    li { margin: 6px 0; }
    hr {
      border: 0;
      border-top: 1px solid var(--line);
      margin: 30px 0;
    }
    blockquote {
      margin: 18px 0;
      padding: 14px 16px;
      border-left: 4px solid var(--accent);
      background: #fbf4ea;
      color: #5b524c;
      border-radius: 0 12px 12px 0;
    }
    code {
      font-family: 'Courier New', monospace;
      background: #f4eee5;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 0.95em;
    }
    .image-block {
      margin: 18px 0 26px;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: #fff;
    }
    .image-block img {
      width: 100%;
      height: auto;
      display: block;
      border-radius: 10px;
      border: 1px solid #eadfce;
      background: #faf7f2;
    }
    .image-block .caption {
      margin-top: 10px;
      font-size: 14px;
      color: var(--muted);
    }
    .checklist {
      background: #f8f3eb;
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 14px 18px;
      margin: 16px 0 24px;
    }
    @media print {
      body { background: white; }
      .wrap { max-width: none; padding: 0; }
      .doc { box-shadow: none; border: 0; border-radius: 0; }
      .hero { border-radius: 0; }
      .image-block { break-inside: avoid; page-break-inside: avoid; }
      h2, h3 { break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <article class="doc">
      <section class="hero">
        <h1>${esc(docTitle)}</h1>
        <p>Guia visual, em linguagem simples, para quem vai usar o sistema na gestao do negocio, acompanhar a rotina e tomar decisoes com mais seguranca.</p>
      </section>
      <section class="content">`);

let inList = false;
let skippedFirstHeading = false;
for (const rawLine of lines) {
  const line = rawLine.trim();

  if (!line) {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
    continue;
  }

  if (!skippedFirstHeading && line.startsWith('# ')) {
    skippedFirstHeading = true;
    continue;
  }

  const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
  if (imgMatch) {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
    html.push(`<figure class="image-block"><img src="${esc(imgMatch[2])}" alt="${esc(imgMatch[1])}" /><figcaption class="caption">${esc(imgMatch[1])}</figcaption></figure>`);
    continue;
  }

  if (line === '---') {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
    html.push('<hr />');
    continue;
  }

  if (line.startsWith('### ')) {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
    html.push(`<h3>${inline(line.slice(4))}</h3>`);
    continue;
  }

  if (line.startsWith('## ')) {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
    html.push(`<h2>${inline(line.slice(3))}</h2>`);
    continue;
  }

  if (line.startsWith('> ')) {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
    html.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    continue;
  }

  if (line.startsWith('- ')) {
    if (!inList) {
      html.push('<ul>');
      inList = true;
    }
    html.push(`<li>${inline(line.slice(2))}</li>`);
    continue;
  }

  if (inList) {
    html.push('</ul>');
    inList = false;
  }

  const classes = /Checklist/.test(line) ? ' class="checklist"' : '';
  html.push(`<p${classes}>${inline(line)}</p>`);
}
if (inList) html.push('</ul>');

html.push(`
      </section>
    </article>
  </div>
</body>
</html>`);

fs.writeFileSync(outputPath, html.join('\n'));
console.log(`Generated ${outputPath}`);
