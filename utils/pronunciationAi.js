/**
 * طبقة تصحيح النطق — اللعبة تستدعي هذه الدوال فقط.
 * عند جاهزية نموذج wav2vec: غيّر USE_MOCK_WAV2VEC إلى false.
 * التفاصيل في: docs/ربط-نموذج-النطق-wav2vec.md
 */

import { wavToFormData } from './wavSpeechRecorder'

/** true = محاكاة حتى يُربط السيرفر. false = طلب حقيقي */
export const USE_MOCK_WAV2VEC = true

export const PRONUNCIATION_API_URL =
  'http://bayan.runasp.net/API/Pronunciation/Analyze'

const TASHKEEL = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g
const TATWEEL = /\u0640/g

export function normalizeArabic(text) {
  return String(text || '')
    .replace(TASHKEEL, '')
    .replace(TATWEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, '')
    .trim()
}

/**
 * إن أعاد النموذج نصاً فقط (transcript) نقارن حرفاً بحرف مع الكلمة المطلوبة.
 */
export function findErrorLetters(targetLetters, transcript) {
  const expected = targetLetters.map((ch) => normalizeArabic(ch))
  const heard = Array.from(normalizeArabic(transcript))
  const errors = []

  expected.forEach((ch, index) => {
    if (heard[index] !== ch) {
      errors.push({
        index,
        expected: targetLetters[index],
        heard: heard[index] || '',
      })
    }
  })

  return errors
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * محاكاة حتى يعمل الـ API:
 * المحاولة الأولى تُظهر حرفاً خاطئاً حتى تُختبر الشاشة المنبثقة،
 * والمحاولة التالية تُعدّ صحيحة.
 */
async function mockAnalyze({ targetLetters, attempt }) {
  await delay(700)
  if (attempt > 1) {
    return {
      correct: true,
      transcript: targetLetters.join(''),
      errorLetters: [],
      source: 'mock',
    }
  }

  const errorIndex = targetLetters.findIndex((ch) => ch === 'س')
  const index = errorIndex >= 0 ? errorIndex : Math.max(0, targetLetters.length - 2)
  return {
    correct: false,
    transcript: targetLetters.map((ch, i) => (i === index ? 'ث' : ch)).join(''),
    errorLetters: [
      {
        index,
        expected: targetLetters[index],
        heard: 'ث',
      },
    ],
    source: 'mock',
  }
}

async function requestAnalyze({ clip, targetWord, targetLetters, token }) {
  const form = wavToFormData(clip, {
    targetWord,
    targetLetters,
  })

  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(PRONUNCIATION_API_URL, {
    method: 'POST',
    headers,
    body: form,
  })

  if (!res.ok) {
    throw new Error(`PRONUNCIATION_HTTP_${res.status}`)
  }

  const data = await res.json()
  const transcript = data.transcript || data.text || ''
  let errorLetters = Array.isArray(data.errorLetters) ? data.errorLetters : null

  if (!errorLetters) {
    errorLetters = findErrorLetters(targetLetters, transcript)
  }

  const correct =
    typeof data.correct === 'boolean' ? data.correct : errorLetters.length === 0

  return {
    correct,
    transcript,
    errorLetters,
    source: 'api',
  }
}

/**
 * @param {{ clip: object, targetWord: string, targetLetters: string[], attempt?: number, token?: string }} input
 */
export async function analyzePronunciation(input) {
  const { clip, targetWord, targetLetters, attempt = 1, token } = input
  if (USE_MOCK_WAV2VEC) {
    return mockAnalyze({ targetLetters, attempt })
  }
  return requestAnalyze({ clip, targetWord, targetLetters, token })
}
