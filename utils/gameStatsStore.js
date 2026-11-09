import { useEffect, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * سجل جلسات الألعاب — تخزين محلي جاهز للنقل إلى قاعدة بيانات.
 *
 * المفتاح واحد لكل الجهاز. كل جلسة تحمل patientId / patientEmail
 * من حساب الدخول حتى تُرفع لاحقاً دون تغيير شكل السجل.
 *
 * لاحقاً: استبدل جسم syncUnsyncedSessions بطلب POST إلى الـ API
 * ثم استدع markSessionsSynced. انظر ملف الوورد في مجلد docs.
 */
export const STATS_STORAGE_KEY = 'bayan:gameSessions:v1'
export const STATS_SCHEMA_VERSION = 1
const MAX_SESSIONS = 400
//AsyncStorage.removeItem('bayan:gameSessions:v1')


export const GAME_IDS = {
  bubbles: 'bubbles',
  cards: 'cards',
  space: 'space',
  direction: 'direction',
  focus: 'focus',
  sameDiff: 'sameDiff',
  silence: 'silence',
  spaceStop: 'spaceStop',
}

export const GAME_META = {
  bubbles: { title: 'صيد الفقاعات', icon: 'water-outline' },
  cards: { title: 'مطابقة الأصوات', icon: 'locate-outline' },
  space: { title: 'رحلة الفضاء', icon: 'rocket-outline' },
  direction: { title: 'من أين يأتي الصوت؟', icon: 'headset-outline' },
  focus: { title: 'أين مصدر الصوت؟', icon: 'volume-medium-outline' },
  sameDiff: { title: 'متشابه أم مختلف؟', icon: 'copy-outline' },
  silence: { title: 'سكت الصوت!', icon: 'pause-circle-outline' },
  spaceStop: { title: 'صمت الفضاء', icon: 'stop-circle-outline' },
}

function makeId() {
  return `ses_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function clean(value) {
  if (value == null) return ''
  return String(value).trim()
}

async function readPatient() {
  try {
    const raw = await AsyncStorage.getItem('userData')
    const user = raw ? JSON.parse(raw) : null
    const first = clean(user?.firstName)
    const last = clean(user?.lastName)
    const name = [first, last].filter(Boolean).join(' ')
    return {
      id: user?.id ?? user?.userId ?? null,
      email: clean(user?.email) || null,
      name: name || null,
    }
  } catch {
    return { id: null, email: null, name: null }
  }
}

async function readStore() {
  try {
    const raw = await AsyncStorage.getItem(STATS_STORAGE_KEY)
    if (!raw) return { version: STATS_SCHEMA_VERSION, sessions: [] }
    const parsed = JSON.parse(raw)
    const sessions = Array.isArray(parsed?.sessions) ? parsed.sessions : []
    return { version: STATS_SCHEMA_VERSION, sessions }
  } catch {
    return { version: STATS_SCHEMA_VERSION, sessions: [] }
  }
}

async function writeStore(store) {
  await AsyncStorage.setItem(
    STATS_STORAGE_KEY,
    JSON.stringify({
      version: STATS_SCHEMA_VERSION,
      sessions: store.sessions.slice(0, MAX_SESSIONS),
    })
  )
}

function toInt(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toNullInt(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** يبني سجل جلسة موحّد (نفس الحقول المتوقعة في الداتا بيز لاحقاً) */
export function buildSessionRecord(input, patient) {
  const gameId = input.gameId
  const total = toNullInt(input.total)
  const correct = toInt(input.correct, 0)
  let accuracy = toNullInt(input.accuracy)
  if (accuracy == null && total != null && total > 0) {
    accuracy = Math.round((correct / total) * 100)
  }

  return {
    schemaVersion: STATS_SCHEMA_VERSION,
    id: makeId(),
    synced: false,
    syncedAt: null,
    createdAt: new Date().toISOString(),
    patientId: patient?.id ?? null,
    patientEmail: patient?.email ?? null,
    patientName: patient?.name ?? null,
    gameId,
    gameTitle: GAME_META[gameId]?.title || input.gameTitle || gameId,
    level: toInt(input.level, 1),
    endedReason: input.endedReason || 'complete',
    correct,
    total,
    accuracy,
    livesLeft: toNullInt(input.livesLeft),
    extra: input.extra && typeof input.extra === 'object' ? input.extra : {},
  }
}

/** يُستدعى عند ظهور شاشة الإحصائيات في نهاية اللعبة */
export async function saveGameSession(input) {
  if (!input?.gameId) return null
  const patient = await readPatient()
  const session = buildSessionRecord(input, patient)
  const store = await readStore()
  store.sessions = [session, ...store.sessions].slice(0, MAX_SESSIONS)
  await writeStore(store)
  return session
}

export async function loadGameSessions() {
  const store = await readStore()
  return store.sessions
}

export async function loadSessionsByGame(gameId) {
  const sessions = await loadGameSessions()
  if (!gameId) return sessions
  return sessions.filter((s) => s.gameId === gameId)
}

export async function getUnsyncedSessions() {
  const sessions = await loadGameSessions()
  return sessions.filter((s) => !s.synced)
}

export async function markSessionsSynced(ids) {
  const idSet = new Set(ids || [])
  const store = await readStore()
  const now = new Date().toISOString()
  store.sessions = store.sessions.map((s) =>
    idSet.has(s.id) ? { ...s, synced: true, syncedAt: now } : s
  )
  await writeStore(store)
}

/**
 * نقطة الربط مع الخادم لاحقاً.
 * الآن تُرجع الجلسات غير المرفوعة دون إرسالها.
 * عند توفر الـ API: أرسلها ثم استدع markSessionsSynced.
 */
export async function syncUnsyncedSessions(postFn) {
  const pending = await getUnsyncedSessions()
  if (!pending.length) return { uploaded: 0, sessions: [] }
  if (typeof postFn !== 'function') {
    return { uploaded: 0, sessions: pending, skipped: true }
  }
  await postFn(pending)
  await markSessionsSynced(pending.map((s) => s.id))
  return { uploaded: pending.length, sessions: pending }
}

export async function clearGameSessions() {
  await writeStore({ version: STATS_SCHEMA_VERSION, sessions: [] })
}

/** جسم جاهز لـ POST /game-sessions */
export function toApiPayload(session) {
  return {
    clientSessionId: session.id,
    createdAt: session.createdAt,
    patientId: session.patientId,
    patientEmail: session.patientEmail,
    gameId: session.gameId,
    gameTitle: session.gameTitle,
    level: session.level,
    endedReason: session.endedReason,
    correct: session.correct,
    total: session.total,
    accuracy: session.accuracy,
    livesLeft: session.livesLeft,
    extra: session.extra,
  }
}

/**
 * يحفظ مرة واحدة عند تحول active إلى true (ظهور الإحصائيات).
 * يُصفَّر تلقائياً عند العودة للقائمة أو إعادة اللعب.
 */
export function useRecordGameSession(active, payload) {
  const saved = useRef(false)
  const payloadRef = useRef(payload)
  payloadRef.current = payload

  useEffect(() => {
    if (!active) {
      saved.current = false
      return undefined
    }
    if (saved.current) return undefined
    saved.current = true
    saveGameSession(payloadRef.current).catch(() => {})
    return undefined
  }, [active])
}
