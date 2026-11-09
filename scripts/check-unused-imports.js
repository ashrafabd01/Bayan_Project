/**
 * يبحث عن الاستيرادات غير المستخدمة في ملفات المشروع.
 * الاستخدام: node scripts/check-unused-imports.js
 */
const fs = require('fs')
const path = require('path')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default

const ROOT = path.join(__dirname, '..')
const SKIP = new Set(['node_modules', '.expo', '.git', 'android', 'ios', 'docs', 'scripts'])

function collect(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collect(full, out)
    else if (/\.jsx?$/.test(entry.name)) out.push(full)
  }
  return out
}

let total = 0
for (const file of collect(ROOT)) {
  const code = fs.readFileSync(file, 'utf8')
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] })

  const imported = new Map()
  traverse(ast, {
    ImportDeclaration(p) {
      for (const spec of p.node.specifiers) {
        imported.set(spec.local.name, spec.local.name)
      }
    },
  })

  const used = new Set()
  traverse(ast, {
    Identifier(p) {
      if (p.parent.type === 'ImportSpecifier') return
      if (p.parent.type === 'ImportDefaultSpecifier') return
      if (p.parent.type === 'ImportNamespaceSpecifier') return
      used.add(p.node.name)
    },
    JSXIdentifier(p) {
      used.add(p.node.name)
    },
  })

  const unused = [...imported.keys()].filter((name) => !used.has(name))
  if (unused.length) {
    total += unused.length
    console.log(`${path.relative(ROOT, file)}: ${unused.join(', ')}`)
  }
}

console.log(total ? `\nالمجموع: ${total} استيراد غير مستخدم` : 'لا استيرادات زائدة')
