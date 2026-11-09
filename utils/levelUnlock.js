import { Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * مفتاح قفل المستويات لكل الألعاب (true / false).
 * true  = لا يُفتح المستوى التالي إلا بعد تحقيق شرط المستوى السابق
 * false = كل المستويات مفتوحة
 */
export const LOCK_LEVELS = false
export const MAX_LEVEL = 4

export const UNLOCK_KEYS = {
  space: 'bayan:space:unlockedLevel',
  bubbles: 'bayan:bubbles:unlockedLevel',
  cards: 'bayan:cards:unlockedLevel',
  direction: 'bayan:direction:unlockedLevel',
  focus: 'bayan:focus:unlockedLevel',
  sameDiff: 'bayan:samediff:unlockedLevel',
  silence: 'bayan:silence:unlockedLevel',
  spaceStop: 'bayan:spacestop:unlockedLevel',
}

export function isLevelLocked(levelNo, unlocked) {
  return LOCK_LEVELS && levelNo > unlocked
}

export function lockAlert() {
  Alert.alert('بيان يقول', 'أكمل المستوى السابق أولاً لفتح هذا المستوى')
}

export async function loadUnlocked(storageKey) {
  if (!LOCK_LEVELS) return 1
  try {
    const n = Number(await AsyncStorage.getItem(storageKey))
    if (n >= 1 && n <= MAX_LEVEL) return n
  } catch (_) {}
  return 1
}

/** إكمال المستوى N يفتح N+1 ويحفظ التقدم على الجهاز */
export function unlockNext(storageKey, completedLevel, setUnlocked) {
  if (!LOCK_LEVELS) return
  const next = Math.min(completedLevel + 1, MAX_LEVEL)
  setUnlocked((prev) => {
    const value = Math.max(prev, next)
    AsyncStorage.setItem(storageKey, String(value)).catch(() => {})
    return value
  })
}

export function unlockIfScore(storageKey, completedLevel, score, needed, setUnlocked) {
  if (score >= needed) unlockNext(storageKey, completedLevel, setUnlocked)
}
