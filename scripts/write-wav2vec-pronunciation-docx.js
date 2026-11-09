/**
 * يولّد وورد لشرح ربط لعبة تمرين الحرف بنموذج wav2vec.
 * التشغيل: node scripts/write-wav2vec-pronunciation-docx.js
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
  p('بيان — ربط تمرين الحرف بنموذج wav2vec', { heading: true, center: true }),
  p('هذا الملف للتعديل عند وصل كود الذكاء الاصطناعي. لا تغيّر اختبار النطق الحالي (SpeechTest). اللعبة الجديدة مستقلة في قسم الصوتيات.'),

  p('1) الملفات', { heading: true }),
  p('شاشة اللعبة: app/(dashboard)/bayan/LetterRetry.jsx — المسار /bayan/LetterRetry'),
  p('التسجيل WAV: utils/wavSpeechRecorder.js'),
  p('استدعاء النموذج: utils/pronunciationAi.js — المفتاح USE_MOCK_WAV2VEC'),

  p('2) ماذا تفعل اللعبة الآن؟', { heading: true }),
  p('الطفل يرى الكلمة بأحرف خضراء دون تلوين أحمر على اللوحة.'),
  p('يضغط الميكروفون فيُسجَّل الصوت WAV بتردد 16 ألف هرتز، قناة واحدة، 16 بت (ما يتوقعه wav2vec2).'),
  p('بعد أربع ثوانٍ أو عند الضغط مرة ثانية يتوقف التسجيل وتُستدعى analyzePronunciation.'),
  p('إن وُجد حرف خاطئ تنبثق شاشة من خلفية اللعبة تعرض الحرف وزر أعد المحاولة. إن طابق النطق تظهر شاشة نجاح.'),
  p('حالياً التحليل محاكاة: المحاولة الأولى تُظهر حرفاً خاطئاً، والثانية تُعدّ صحيحة حتى تُختبر الواجهتان.'),

  p('3) لماذا WAV؟', { heading: true }),
  p('wav2vec2 يُدرَّب على PCM WAV: امتداد wav، 16000 هرتز، أحادي، 16-bit little-endian، رأس RIFF/WAVE. لا ترسل mp3 أو m4a إلى النموذج إلا بعد تحويلها.'),
  p('iOS: LINEARPCM يعطي WAV حقيقي. الويب: AudioContext ثم بناء رأس RIFF. أندرويد: نطلب wav؛ إن لم يكن الملف RIFF يُرسل needsServerConvert=true ويجب التحويل في بايثون بـ librosa قبل النموذج.'),

  p('4) تفعيل الذكاء — تعديل واحد', { heading: true }),
  p('في utils/pronunciationAi.js فقط، بدون لمس شاشة اللعب:'),
  code('export const USE_MOCK_WAV2VEC = false'),
  code('export const PRONUNCIATION_API_URL ='),
  code("  'http://bayan.runasp.net/API/Pronunciation/Analyze'"),
  p('غيّر العنوان إن كان خادم النموذج مختلفاً. مرّر Bearer token لاحقاً إن كان المسار محمياً.'),

  p('5) عقد الطلب', { heading: true }),
  p('POST /API/Pronunciation/Analyze  —  multipart/form-data'),
  p('audio: ملف utterance.wav'),
  p('targetWord: الكلمة المطلوبة مثل مدرسة'),
  p('targetLetters: JSON لمصفوفة الأحرف'),
  p('sampleRate: 16000  —  channels: 1  —  needsServerConvert: true/false'),

  p('6) عقد الاستجابة', { heading: true }),
  p('النموذج يفرّغ الكلام ثم يقارن مع الكلمة الصحيحة ويعيد الحرف الخاطئ:'),
  code('{'),
  code('  "correct": false,'),
  code('  "transcript": "مدرثة",'),
  code('  "errorLetters": ['),
  code('    { "index": 3, "expected": "س", "heard": "ث" }'),
  code('  ]'),
  code('}'),
  p('index من بداية الكلمة (صفر = أول حرف). إن أُرجع transcript فقط، التطبيق يقارن عبر findErrorLetters.'),
  p('نجاح كامل: correct=true و errorLetters مصفوفة فارغة.'),

  p('7) مثال سيرفر بايثون', { heading: true }),
  p('المكتبات: fastapi uvicorn python-multipart transformers torch torchaudio librosa soundfile'),
  p('نموذج عربي للبداية (يُستبدل بنموذجكم): jonatasgrosman/wav2vec2-large-xlsr-53-arabic'),
  code('import librosa, soundfile as sf'),
  code('from fastapi import FastAPI, File, Form, UploadFile'),
  code('from transformers import pipeline'),
  code('asr = pipeline("automatic-speech-recognition", model="...")'),
  code('y, _ = librosa.load(src, sr=16000, mono=True)'),
  code('sf.write(wav_path, y, 16000, subtype="PCM_16")'),
  code('result = asr(wav_path)'),
  p('بعد التفريغ: طبّع النص العربي (حذف تشكيل وتوحيد الألف) ثم قارن حرفاً بحرف مع targetLetters وأرجع errorLetters.'),
  p('التفاصيل الكاملة مع الدوال في الملف: docs/ربط-نموذج-النطق-wav2vec.md'),

  p('8) ماذا يفعل النموذج؟', { heading: true }),
  p('يقرأ WAV 16kHz. wav2vec2 يحوّل الموجة إلى حروف (CTC). يُطبَّق تطبيع عربي. كل موضع مختلف عن الكلمة المطلوبة يُعرض في الشاشة المنبثقة.'),
  p('اللعبة تعرض الحرف الأول من errorLetters بشكل بارز مع طلب الإعادة. محاذاة حرف-بحرف كافية للكلمات القصيرة.'),

  p('9) اختبار الربط', { heading: true }),
  p('شغّل الـ API وضع USE_MOCK_WAV2VEC = false. افتح تبويب بيان ثم تمرين الحرف. اسمح بالميكروفون وانطق الكلمة. يجب أن يصل utterance.wav للسيرفر.'),
  p('انطق حرفاً خطأ عمداً: تنبثق الشاشة بالحرف وزر أعد المحاولة. أعد التسجيل صحيحاً: شاشة أحسنت.'),

  p('10) ماذا لا تغيّره', { heading: true }),
  p('لا تعدّل SpeechTest.jsx. لا تلوّن أحرف اللوحة الرئيسية بالأحمر في هذه اللعبة؛ الخطأ فقط في الشاشة المنبثقة.'),
  p('لا ترسل صوراً. أبقِ التسجيل في wavSpeechRecorder حتى يبقى WAV 16kHz في مكان واحد.'),
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
const outFile = path.join(outDir, 'ربط-نموذج-النطق-wav2vec.docx')

const buf = zipStore([
  { name: '[Content_Types].xml', data: contentTypes },
  { name: '_rels/.rels', data: rels },
  { name: 'word/document.xml', data: documentXml },
  { name: 'word/_rels/document.xml.rels', data: docRels },
])

fs.writeFileSync(outFile, buf)
console.log('تم إنشاء الملف:', outFile)
