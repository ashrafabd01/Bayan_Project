import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * البطاقات المتعلّمة في لعبة مطابقة الأصوات.
 *
 * يُحفظ هنا فقط ما يمكن نقله لقاعدة بيانات لاحقاً: معرف البطاقة واسمها
 * ووقت التعلّم وبيانات المريض. الصور والأصوات تبقى في CARD_DECK داخل اللعبة.
 *
 * انظر: docs/البطاقات-المتعلمة-والربط-مع-قاعدة-البيانات.md
 */
export const LEARNED_CARDS_KEY = 'bayan:learnedCards:v1'
export const LEARNED_CARDS_SCHEMA = 1
const MAX_SESSIONS = 200

function makeId() {
  return `lrn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function clean(value) {
  if (value == null) return ''
  return String(value).trim()
}

async function readPatient() {
  try {
    const raw = await AsyncStorage.getItem('userData')
    const user = raw ? JSON.parse(raw) : null
    const name = [clean(user?.firstName), clean(user?.lastName)]
      .filter(Boolean)
      .join(' ')
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
    const raw = await AsyncStorage.getItem(LEARNED_CARDS_KEY)
    if (!raw) {
      return { version: LEARNED_CARDS_SCHEMA, currentCardIds: [], sessions: [] }
    }
    const parsed = JSON.parse(raw)
    return {
      version: LEARNED_CARDS_SCHEMA,
      currentCardIds: Array.isArray(parsed?.currentCardIds)
        ? parsed.currentCardIds
        : [],
      currentSavedAt: parsed?.currentSavedAt || null,
      sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
    }
  } catch {
    return { version: LEARNED_CARDS_SCHEMA, currentCardIds: [], sessions: [] }
  }
}

async function writeStore(store) {
  await AsyncStorage.setItem(
    LEARNED_CARDS_KEY,
    JSON.stringify({
      version: LEARNED_CARDS_SCHEMA,
      currentCardIds: store.currentCardIds || [],
      currentSavedAt: store.currentSavedAt || null,
      sessions: (store.sessions || []).slice(0, MAX_SESSIONS),
    })
  )
}

/** يحوّل المعرفات المخزّنة إلى بطاقات كاملة من مجموعة اللعبة */
export function hydrateLearnedCards(cardIds, deck) {
  if (!Array.isArray(cardIds) || !Array.isArray(deck)) return []
  return cardIds
    .map((id) => deck.find((card) => card.id === id))
    .filter(Boolean)
}

export async function loadCurrentLearnedIds() {
  const store = await readStore()
  return store.currentCardIds
}

/**
 * يُستدعى عند إنهاء شاشة التعلّم («أنا جاهز للتحدي»).
 * يحفظ المجموعة الحالية + جلسة جاهزة للرفع لاحقاً.
 */
export async function saveLearnedCards(cards) {
  if (!Array.isArray(cards) || !cards.length) return null
  const patient = await readPatient()
  const cardIds = cards.map((c) => c.id).filter(Boolean)
  const session = {
    schemaVersion: LEARNED_CARDS_SCHEMA,
    id: makeId(),
    synced: false,
    syncedAt: null,
    createdAt: new Date().toISOString(),
    patientId: patient.id,
    patientEmail: patient.email,
    patientName: patient.name,
    cardIds,
    cards: cards.map((c) => ({
      cardId: c.id,
      name: c.name || c.id,
      emoji: c.emoji || null,
    })),
  }

  const store = await readStore()
  store.currentCardIds = cardIds
  store.currentSavedAt = session.createdAt
  store.sessions = [session, ...store.sessions].slice(0, MAX_SESSIONS)
  await writeStore(store)
  return session
}

export async function loadLearnedSessions() {
  const store = await readStore()
  return store.sessions
}

export async function getUnsyncedLearnedSessions() {
  const sessions = await loadLearnedSessions()
  return sessions.filter((s) => !s.synced)
}

export async function markLearnedSessionsSynced(ids) {
  const idSet = new Set(ids || [])
  const store = await readStore()
  const now = new Date().toISOString()
  store.sessions = store.sessions.map((s) =>
    idSet.has(s.id) ? { ...s, synced: true, syncedAt: now } : s
  )
  await writeStore(store)
}

/** جسم جاهز لـ POST لاحقاً — لا يُرسل الصور أو ملفات الصوت */
export function toLearnedCardsApiPayload(session) {
  return {
    clientSessionId: session.id,
    createdAt: session.createdAt,
    patientId: session.patientId,
    patientEmail: session.patientEmail,
    cardIds: session.cardIds,
    cards: session.cards,
  }
}

/**
 * نقطة الربط مع الخادم لاحقاً.
 * مرّر دالة postFn ترسل المصفوفة؛ عند النجاح تُعلَّم الجلسات synced.
 */
export async function syncUnsyncedLearnedCards(postFn) {
  const pending = await getUnsyncedLearnedSessions()
  if (!pending.length) return { uploaded: 0, sessions: [] }
  if (typeof postFn !== 'function') {
    return { uploaded: 0, sessions: pending, skipped: true }
  }
  await postFn(pending)
  await markLearnedSessionsSynced(pending.map((s) => s.id))
  return { uploaded: pending.length, sessions: pending }
}
