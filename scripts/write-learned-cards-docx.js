/**
 * يولّد وورد لشرح البطاقات المتعلّمة وربطها بقاعدة البيانات لاحقاً.
 * التشغيل: node scripts/write-learned-cards-docx.js
 */
const fs = require('fs')
const path = require('path')

function crc32(buf) {
  let crc = ~0
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

function dosTime(date = new Date()) {
  const t =
    ((date.getHours() & 31) << 11) |
    ((date.getMinutes() & 63) << 5) |
    (Math.floor(date.getSeconds() / 2) & 31)
  const d =
    (((date.getFullYear() - 1980) & 127) << 9) |
    ((date.getMonth() + 1) << 5) |
    (date.getDate() & 31)
  return { t, d }
}

function zipStore(files) {
  const { t, d } = dosTime()
  const locals = []
  const centrals = []
  let offset = 0

  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, 'utf8')
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt16LE(t, 10)
    local.writeUInt16LE(d, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    const localFull = Buffer.concat([local, name, data])
    locals.push(localFull)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt16LE(t, 12)
    central.writeUInt16LE(d, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    centrals.push(Buffer.concat([central, name]))
    offset += localFull.length
  }

  const centralDir = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralDir.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)
  return Buffer.concat([...locals, centralDir, end])
}

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function p(text, { heading = false, size = 22, bold = false, center = false } = {}) {
  const sz = heading ? 36 : size
  const b = heading || bold ? '<w:b/><w:bCs/>' : ''
  const jc = center ? 'center' : 'right'
  const color = heading ? '6FA32E' : '234038'
  return `<w:p>
    <w:pPr>
      <w:bidi w:val="1"/>
      <w:jc w:val="${jc}"/>
      <w:spacing w:after="160"/>
      <w:rPr><w:rtl/><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>${b}<w:color w:val="${color}"/></w:rPr>
    </w:pPr>
    <w:r>
      <w:rPr><w:rtl/><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>${b}<w:color w:val="${color}"/></w:rPr>
      <w:t xml:space="preserve">${esc(text)}</w:t>
    </w:r>
  </w:p>`
}

function code(text) {
  return `<w:p>
    <w:pPr>
      <w:bidi w:val="0"/>
      <w:jc w:val="left"/>
      <w:shd w:val="clear" w:fill="F3F8F1"/>
      <w:spacing w:after="80"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="1A3324"/></w:rPr>
      <w:t xml:space="preserve">${esc(text)}</w:t>
    </w:r>
  </w:p>`
}

const body = [
  p('بيان — البطاقات المتعلّمة وربطها بقاعدة البيانات لاحقاً', { heading: true, center: true }),
  p('هذا الملف للتعديل لاحقاً عند ربط لعبة مطابقة الأصوات بالخادم. لا حاجة لتغيير شاشات اللعب إذا بقي شكل السجل كما هو.'),

  p('1) ماذا يُحفظ الآن؟', { heading: true }),
  p('على الجهاز (AsyncStorage) بالمفتاح:'),
  code('bayan:learnedCards:v1'),
  p('عند ضغط الطفل «أنا جاهز للتحدي!» بعد شاشة التعلّم يُحفظ:'),
  p('currentCardIds: البطاقات الحالية المستخدمة في التحدي (مثل cat, horse).'),
  p('sessions: سجل كل جلسة تعلّم، جاهز للرفع إلى الخادم.'),
  p('الصور وملفات الصوت لا تُحفظ في الذاكرة ولا تُرسل للداتا بيز. تبقى في CARD_DECK داخل ملف اللعبة LevelThree.jsx. عند القراءة تُسترجع البطاقة الكاملة بالمعرّف عبر hydrateLearnedCards.'),

  p('2) شكل جلسة التعلّم', { heading: true }),
  code('{'),
  code('  "schemaVersion": 1,'),
  code('  "id": "lrn_....",'),
  code('  "synced": false,'),
  code('  "syncedAt": null,'),
  code('  "createdAt": "2026-08-21T09:30:00.000Z",'),
  code('  "patientId": 59,'),
  code('  "patientEmail": "child@mail.com",'),
  code('  "patientName": "أحمد علي",'),
  code('  "cardIds": ["cat", "horse", "bell", "bird"],'),
  code('  "cards": ['),
  code('    { "cardId": "cat", "name": "قطة", "emoji": "🐱" }'),
  code('  ]'),
  code('}'),

  p('3) الملفات المعنية', { heading: true }),
  p('utils/learnedCardsStore.js — القراءة والكتابة ودالة syncUnsyncedLearnedCards للرفع لاحقاً.'),
  p('app/(dashboard)/games/LevelThree.jsx — يستدعي الحفظ بعد التعلّم ويسترجع المجموعة عند فتح اللعبة.'),

  p('4) خطوات الربط مع الداتا بيز لاحقاً', { heading: true }),
  p('الخطوة 1: أنشئ الجدولين التاليين في السيرفر:'),
  code('CREATE TABLE learned_card_sessions ('),
  code('  id                BIGINT IDENTITY PRIMARY KEY,'),
  code('  client_session_id NVARCHAR(64) UNIQUE NOT NULL,'),
  code('  created_at        DATETIME2 NOT NULL,'),
  code('  patient_id        INT NULL,'),
  code('  patient_email     NVARCHAR(200) NULL'),
  code(');'),
  code(''),
  code('CREATE TABLE learned_card_items ('),
  code('  id          BIGINT IDENTITY PRIMARY KEY,'),
  code('  session_id  BIGINT NOT NULL REFERENCES learned_card_sessions(id),'),
  code('  card_id     NVARCHAR(40) NOT NULL,'),
  code('  card_name   NVARCHAR(80) NULL'),
  code(');'),
  p('الحقل card_id يطابق id في CARD_DECK (cat / horse / bell …). لا تخزّن مسار الصورة في السيرفر إلا إذا أصبح عندك أصل بعيد.'),

  p('الخطوة 2: أضف مسار API مثل POST /API/LearnedCards/Upload يقبل مصفوفة من toLearnedCardsApiPayload. استخدم client_session_id لمنع تكرار نفس الجلسة.'),

  p('الخطوة 3: تعديل واحد في المتجر — بدون تغيير اللعبة:'),
  code('import {'),
  code('  syncUnsyncedLearnedCards,'),
  code('  toLearnedCardsApiPayload,'),
  code('} from "../utils/learnedCardsStore"'),
  code(''),
  code('await syncUnsyncedLearnedCards(async (pending) => {'),
  code('  const res = await fetch("http://bayan.runasp.net/API/LearnedCards/Upload", {'),
  code('    method: "POST",'),
  code('    headers: {'),
  code('      "Content-Type": "application/json",'),
  code('      Authorization: `Bearer ${token}`,'),
  code('    },'),
  code('    body: JSON.stringify(pending.map(toLearnedCardsApiPayload)),'),
  code('  })'),
  code('  if (!res.ok) throw new Error("upload failed")'),
  code('})'),
  p('إذا نجح الطلب تُعلَّم الجلسات synced=true. إذا فشل تبقى محلياً وتُعاد المحاولة.'),

  p('5) ماذا لا تغيّره', { heading: true }),
  p('لا ترسل require(...) ولا ملفات mp3 أو png.'),
  p('لا تحفظ من داخل منطق الضغط على البطاقة في التحدي؛ الحفظ من طبقة learnedCardsStore فقط.'),
  p('أضف بطاقة جديدة في CARD_DECK بنفس id الثابت حتى تبقى السجلات القديمة صالحة.'),

  p('6) اختبار سريع', { heading: true }),
  p('1. افتح مطابقة الأصوات ثم استكشف وتعلّم ثم أنا جاهز للتحدي.'),
  p('2. أغلق التطبيق وافتحه مجدداً: تظهر أسماء البطاقات في الرئيسية (جاهز للتحدي).'),
  p('3. بعد توفر الـ API استدعِ syncUnsyncedLearnedCards كما في الخطوة 3.'),
].join('')

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/>
      <w:bidi/>
    </w:sectPr>
  </w:body>
</w:document>`

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`

const outDir = path.join(__dirname, '..', 'docs')
fs.mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, 'البطاقات-المتعلمة-والربط-مع-قاعدة-البيانات.docx')

const buf = zipStore([
  { name: '[Content_Types].xml', data: contentTypes },
  { name: '_rels/.rels', data: rels },
  { name: 'word/document.xml', data: documentXml },
  { name: 'word/_rels/document.xml.rels', data: docRels },
])

fs.writeFileSync(outFile, buf)
console.log('تم إنشاء الملف:', outFile)
