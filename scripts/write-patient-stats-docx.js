/**
 * يولّد مستند وورد لشرح سجل المريض وكيفية ربطه بقاعدة بيانات لاحقاً.
 * التشغيل: node scripts/write-patient-stats-docx.js
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
  p('بيان — سجل المريض وربطه بقاعدة البيانات لاحقاً', { heading: true, center: true }),
  p('هذا الملف يشرح أين تُحفظ إحصائيات الألعاب حالياً، وما شكل البيانات، وكيف تُحوَّل لاحقاً إلى داتا بيز دون إعادة تصميم الألعاب.'),

  p('1) الفكرة', { heading: true }),
  p('عند انتهاء أي لعبة وظهور شاشة الإحصائيات، يُحفظ سجل الجلسة في التخزين المحلي للجهاز (AsyncStorage). المختص يفتح تبويب «متابعة» ثم زر «سجل المريض» لرؤية النتائج. التخزين مصمَّم بنفس الحقول التي ستذهب للخادم لاحقاً (معرف مريض، معرف لعبة، مستوى، صحيح/المجموع، دقة، synced).'),

  p('2) أين تُحفظ البيانات على الجهاز', { heading: true }),
  p('المكتبة: @react-native-async-storage/async-storage'),
  p('المفتاح:'),
  code('bayan:gameSessions:v1'),
  p('القيمة JSON بالشكل:'),
  code('{ "version": 1, "sessions": [ /* جلسات */ ] }'),
  p('أحدث جلسة تُضاف في بداية المصفوفة. الحد الأقصى 400 جلسة حتى لا يمتلئ تخزين الجهاز.'),

  p('3) شكل سجل الجلسة (نفسه للرفع لاحقاً)', { heading: true }),
  code('{'),
  code('  "schemaVersion": 1,'),
  code('  "id": "ses_....",'),
  code('  "synced": false,'),
  code('  "syncedAt": null,'),
  code('  "createdAt": "2026-08-21T08:00:00.000Z",'),
  code('  "patientId": 12,'),
  code('  "patientEmail": "child@mail.com",'),
  code('  "patientName": "أحمد علي",'),
  code('  "gameId": "bubbles",'),
  code('  "gameTitle": "صيد الفقاعات",'),
  code('  "level": 2,'),
  code('  "endedReason": "hearts",'),
  code('  "correct": 7,'),
  code('  "total": 12,'),
  code('  "accuracy": 58,'),
  code('  "livesLeft": null,'),
  code('  "extra": { "mistakes": 3 }'),
  code('}'),

  p('4) معاني الحقول', { heading: true }),
  p('id: معرف محلي فريد. عند الرفع أرسله باسم clientSessionId حتى لا تُكرَّر الجلسة في السيرفر.'),
  p('synced / syncedAt: false حتى تُرفع. بعد نجاح POST تُعلَّم true. هذا يمنع رفع الجلسة مرتين.'),
  p('patientId / patientEmail / patientName: تُقرأ من userData (حساب الدخول). إن لم يوجد حساب تبقى null.'),
  p('gameId: مفتاح ثابت بالإنجليزية للربط في الداتا بيز (bubbles, cards, space, direction, focus, sameDiff, silence).'),
  p('endedReason: hearts = نفاد القلوب، attempts = انتهاء المحاولات العشر، win = إكمال الرحلة، complete = نهاية عامة.'),
  p('correct / total / accuracy: النتيجة الموحّدة التي يظهرها سجل المريض (أصاب X من Y).'),
  p('extra: تفاصيل خاصة بلعبة (ضغطات مبكرة، فقاعات أفلتت…) دون كسر الجدول الموحّد.'),

  p('5) ملفات المشروع', { heading: true }),
  p('utils/gameStatsStore.js — القراءة والكتابة، بناء السجل، ووظيفة syncUnsyncedSessions للرفع لاحقاً.'),
  p('app/(dashboard)/dashboard.jsx — زر «سجل المريض» فقط مع بقاء واجهة المتابعة كما هي.'),
  p('app/(dashboard)/patientRecord.jsx — شاشة السجل (قائمة الجلسات + فلتر حسب اللعبة).'),
  p('app/(dashboard)/_layout.jsx — تسجيل مسار patientRecord كشاشة ملء الشاشة.'),
  p('كل ملف لعبة يستدعي useRecordGameSession عند ظهور الإحصائيات. لا حاجة لتعديل منطق اللعب.'),

  p('6) متى يتم الحفظ', { heading: true }),
  p('صيد الفقاعات ورحلة الفضاء: عند نفاد القلوب (وفي الفضاء أيضاً عند إكمال الرحلة).'),
  p('مطابقة الأصوات، من أين يأتي الصوت، أين مصدر الصوت، متشابه أم مختلف، سكت الصوت: عند انتهاء المحاولات وظهور الإحصائيات.'),
  p('الحفظ مرة واحدة لكل ظهور للإحصائيات. إعادة اللعب تبدأ جلسة جديدة.'),

  p('7) كيفية الربط مع قاعدة بيانات لاحقاً — خطوات التعديل', { heading: true }),
  p('الخطوة 1: أنشئ جدولاً أو مجموعة في السيرفر. مثال SQL:'),
  code('CREATE TABLE game_sessions ('),
  code('  id               BIGINT IDENTITY PRIMARY KEY,'),
  code('  client_session_id NVARCHAR(64) UNIQUE NOT NULL,'),
  code('  created_at        DATETIME2 NOT NULL,'),
  code('  patient_id        INT NULL,'),
  code('  patient_email     NVARCHAR(200) NULL,'),
  code('  game_id           NVARCHAR(40) NOT NULL,'),
  code('  game_title        NVARCHAR(80) NOT NULL,'),
  code('  level_no          INT NOT NULL,'),
  code('  ended_reason      NVARCHAR(20) NOT NULL,'),
  code('  correct_count     INT NOT NULL,'),
  code('  total_count       INT NULL,'),
  code('  accuracy          INT NULL,'),
  code('  lives_left        INT NULL,'),
  code('  extra_json        NVARCHAR(MAX) NULL'),
  code(');'),
  p('الخطوة 2: أضف في الـ API مساراً مثل POST /API/GameSessions/Upload يقبل مصفوفة جلسات. استخدم toApiPayload من gameStatsStore لتحويل السجل المحلي إلى جسم الطلب.'),
  p('الخطوة 3: داخل utils/gameStatsStore.js عدّل syncUnsyncedSessions أو استدعها من شاشة السجل هكذا:'),
  code('import { syncUnsyncedSessions, toApiPayload } from "../utils/gameStatsStore"'),
  code(''),
  code('await syncUnsyncedSessions(async (pending) => {'),
  code('  const res = await fetch("http://bayan.runasp.net/API/GameSessions/Upload", {'),
  code('    method: "POST",'),
  code('    headers: {'),
  code('      "Content-Type": "application/json",'),
  code('      Authorization: `Bearer ${token}`,'),
  code('    },'),
  code('    body: JSON.stringify(pending.map(toApiPayload)),'),
  code('  })'),
  code('  if (!res.ok) throw new Error("upload failed")'),
  code('})'),
  p('إذا نجح الطلب تُعلَّم الجلسات synced=true تلقائياً. إذا فشل تبقى synced=false وتُعاد المحاولة لاحقاً.'),
  p('الخطوة 4 (اختياري): أضف زر «مزامنة» في شاشة سجل المريض يستدعي الدالة أعلاه. لا تغيّر الألعاب.'),
  p('الخطوة 5 (اختياري Appwrite): المشروع فيه lib/appwrite.js. يمكن إنشاء Collection باسم game_sessions بنفس الحقول واستدعاء databases.createDocument لكل جلسة غير مرفوعة، ثم markSessionsSynced.'),

  p('8) ماذا لا تغيّره', { heading: true }),
  p('لا تحفظ مباشرة من داخل منطق الفوز/الخسارة إلى الـ API. ابقَ الحفظ المحلي كما هو، والرفع من طبقة gameStatsStore فقط. هكذا تبقى الألعاب تعمل بلا إنترنت، ويُرفع السجل عند توفر الشبكة.'),

  p('9) ملاحظات للمختص وللمطوّر', { heading: true }),
  p('السجل الحالي على الجهاز مرتبط بحساب الدخول المحفوظ في userData. عند تغيير المستخدم على نفس الجهاز ستُعرض كل الجلسات المخزّنة ما لم تُفلتر حسب patientId في شاشة السجل (يمكن إضافة هذا الفلتر لاحقاً بسطر واحد في loadGameSessions).'),
  p('لا تحذف مفتاح bayan:gameSessions:v1 عند تسجيل الخروج إلا إذا أردت إفراغ سجل الجهاز. حالياً الخروج لا يمسح إحصائيات الألعاب.'),
  p('للاختبار: العب أي لعبة حتى تظهر الإحصائيات، ثم تبويب متابعة → سجل المريض.'),
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
const outFile = path.join(outDir, 'سجل-المريض-والربط-مع-قاعدة-البيانات.docx')

const buf = zipStore([
  { name: '[Content_Types].xml', data: contentTypes },
  { name: '_rels/.rels', data: rels },
  { name: 'word/document.xml', data: documentXml },
  { name: 'word/_rels/document.xml.rels', data: docRels },
])

fs.writeFileSync(outFile, buf)
console.log('تم إنشاء الملف:', outFile)
