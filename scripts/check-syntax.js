/**
 * فحص سريع لصياغة ملفات المشروع (JSX) عبر محلّل Babel.
 * الاستخدام: node scripts/check-syntax.js
 */
const fs = require('fs')
const path = require('path')
const parser = require('@babel/parser')

const ROOT = path.join(__dirname, '..')
const SKIP = new Set(['node_modules', '.expo', '.git', 'android', 'ios', 'docs'])

function collect(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collect(full, out)
    else if (/\.jsx?$/.test(entry.name)) out.push(full)
  }
  return out
}

let failed = 0
for (const file of collect(ROOT)) {
  try {
    parser.parse(fs.readFileSync(file, 'utf8'), {
      sourceType: 'module',
      plugins: ['jsx'],
    })
  } catch (e) {
    failed += 1
    console.error(`FAIL ${path.relative(ROOT, file)}\n  ${e.message}`)
  }
}

console.log(failed ? `\n${failed} ملف فيه خطأ صياغة` : 'كل الملفات سليمة صياغياً')
process.exit(failed ? 1 : 0)
