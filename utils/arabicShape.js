/**
 * يحول الأحرف العربية المنطقية إلى أشكال العرض الموصولة (Presentation Forms)
 * حتى تظهر متصلة عند تلوين كل حرف في Text منفصل (سلوك RN يكسر الربط الأصلي).
 */

const FORMS = {
  ا: ['\uFE8D', '\uFE8E'],
  أ: ['\uFE83', '\uFE84'],
  إ: ['\uFE87', '\uFE88'],
  آ: ['\uFE81', '\uFE82'],
  ب: ['\uFE8F', '\uFE90', '\uFE91', '\uFE92'],
  ت: ['\uFE95', '\uFE96', '\uFE97', '\uFE98'],
  ث: ['\uFE99', '\uFE9A', '\uFE9B', '\uFE9C'],
  ج: ['\uFE9D', '\uFE9E', '\uFE9F', '\uFEA0'],
  ح: ['\uFEA1', '\uFEA2', '\uFEA3', '\uFEA4'],
  خ: ['\uFEA5', '\uFEA6', '\uFEA7', '\uFEA8'],
  د: ['\uFEA9', '\uFEAA'],
  ذ: ['\uFEAB', '\uFEAC'],
  ر: ['\uFEAD', '\uFEAE'],
  ز: ['\uFEAF', '\uFEB0'],
  س: ['\uFEB1', '\uFEB2', '\uFEB3', '\uFEB4'],
  ش: ['\uFEB5', '\uFEB6', '\uFEB7', '\uFEB8'],
  ص: ['\uFEB9', '\uFEBA', '\uFEBB', '\uFEBC'],
  ض: ['\uFEBD', '\uFEBE', '\uFEBF', '\uFEC0'],
  ط: ['\uFEC1', '\uFEC2', '\uFEC3', '\uFEC4'],
  ظ: ['\uFEC5', '\uFEC6', '\uFEC7', '\uFEC8'],
  ع: ['\uFEC9', '\uFECA', '\uFECB', '\uFECC'],
  غ: ['\uFECD', '\uFECE', '\uFECF', '\uFED0'],
  ف: ['\uFED1', '\uFED2', '\uFED3', '\uFED4'],
  ق: ['\uFED5', '\uFED6', '\uFED7', '\uFED8'],
  ك: ['\uFED9', '\uFEDA', '\uFEDB', '\uFEDC'],
  ل: ['\uFEDD', '\uFEDE', '\uFEDF', '\uFEE0'],
  م: ['\uFEE1', '\uFEE2', '\uFEE3', '\uFEE4'],
  ن: ['\uFEE5', '\uFEE6', '\uFEE7', '\uFEE8'],
  ه: ['\uFEE9', '\uFEEA', '\uFEEB', '\uFEEC'],
  و: ['\uFEED', '\uFEEE'],
  ي: ['\uFEF1', '\uFEF2', '\uFEF3', '\uFEF4'],
  ى: ['\uFEEF', '\uFEF0'],
  ة: ['\uFE93', '\uFE94'],
  ؤ: ['\uFE85', '\uFE86'],
  ئ: ['\uFE89', '\uFE8A', '\uFE8B', '\uFE8C'],
}

/** أحرف لا تتصل بما بعدها */
const NON_CONNECTING = new Set([
  'ا', 'أ', 'إ', 'آ', 'د', 'ذ', 'ر', 'ز', 'و', 'ة', 'ؤ', 'ى',
])

function connectsToNext(ch) {
  return Boolean(FORMS[ch] && !NON_CONNECTING.has(ch))
}

function pickForm(ch, joinPrev, joinNext) {
  const forms = FORMS[ch]
  if (!forms) return ch

  if (forms.length === 2) {
    return joinPrev ? forms[1] : forms[0]
  }

  if (joinPrev && joinNext) return forms[3]
  if (joinPrev) return forms[1]
  if (joinNext) return forms[2]
  return forms[0]
}

/**
 * @param {string[]} letters أحرف منطقية بالترتيب من أول الكلمة لآخرها
 * @returns {string[]} أشكال موصولة جاهزة للعرض
 */
export function shapeArabicLetters(letters) {
  return letters.map((ch, i) => {
    const prev = letters[i - 1]
    const next = letters[i + 1]
    const joinPrev = Boolean(prev && connectsToNext(prev) && FORMS[ch])
    const joinNext = Boolean(next && connectsToNext(ch) && FORMS[next])
    return pickForm(ch, joinPrev, joinNext)
  })
}
