import { Audio } from 'expo-av'

/**
 * إدارة الصوت المشتركة لألعاب بيان.
 *
 * كل لعبة تحتاج نفس الأساسيات: تهيئة وضع الصوت، تشغيل مقطع أو خلفية
 * مكرّرة، وتحرير الذاكرة عند الخروج. جُمعت هنا بدل تكرارها في كل ملف.
 *
 * فكرة الجلسة (session): اللاعب قد يخرج من المستوى قبل أن ينتهي تحميل
 * المقطع. تمرّر الألعاب دالة isStale لتقول «هذه الجلسة انتهت»، فيُحرَّر
 * المقطع فوراً بدل أن يُشغَّل بعد مغادرة الشاشة.
 */

/**
 * وضع الصوت الموحّد: يعمل مع كتم iOS ويخفض أصوات النظام على أندرويد.
 * تمرّر لعبة «من أين يأتي الصوت؟» تجاوزات لأن خفض الصوت يشوّه التوجيه.
 */
export async function configureGameAudio(overrides = {}) {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: false,
      ...overrides,
    })
  } catch (e) {
    console.log('تعذّر تهيئة وضع الصوت', e)
  }
}

/** يوقف المقطع ويحرّر ذاكرته ويصفّر المرجع — آمن للاستدعاء المتكرر */
export async function releaseSound(ref) {
  if (!ref) return
  const sound = ref.current
  ref.current = null
  if (!sound) return
  // إلغاء المراقب أولاً حتى لا يعمل على مقطع مُحرَّر
  try {
    sound.setOnPlaybackStatusUpdate(null)
  } catch (_) {}
  try {
    await sound.stopAsync()
  } catch (_) {}
  try {
    await sound.unloadAsync()
  } catch (_) {}
}

/** يحرّر عدة مقاطع معاً (خلفية + مؤثر مثلاً) */
export function releaseSounds(...refs) {
  return Promise.all(refs.map(releaseSound))
}

/** يلغي مؤقتاً ويصفّر مرجعه */
export function clearTimer(ref) {
  if (ref?.current) {
    clearTimeout(ref.current)
    ref.current = null
  }
}

/**
 * يشغّل مقطعاً ويحفظه في المرجع بعد تحرير ما قبله.
 * أي خيار إضافي (مثل androidImplementation) يمرّ كما هو إلى expo-av.
 * @returns {Promise<Audio.Sound|null>} المقطع، أو null إن انتهت الجلسة
 */
export async function playSound(ref, source, options = {}) {
  const { loop = false, volume = 1, isStale, ...rest } = options
  await releaseSound(ref)
  try {
    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: true,
      isLooping: loop,
      volume,
      ...rest,
    })
    // خرج اللاعب أثناء التحميل: نحرّر المقطع بدل تشغيله
    if (isStale?.()) {
      await sound.unloadAsync().catch(() => {})
      return null
    }
    if (ref) ref.current = sound
    return sound
  } catch (e) {
    console.log('تعذّر تشغيل المقطع', e)
    return null
  }
}

/**
 * ينتظر انتهاء المقطع. المهلة الاحتياطية تمنع التعليق إن لم يصل حدث الانتهاء.
 */
export function waitForFinish(sound, fallbackMs = 3500) {
  if (!sound) return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, fallbackMs)
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        clearTimeout(timer)
        resolve()
      }
    })
  })
}

/** يشغّل مؤثراً قصيراً ويحرّره تلقائياً عند انتهائه (نجاح / خطأ) */
export async function playEffect(source, volume = 0.9) {
  try {
    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: true,
      volume,
    })
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {})
      }
    })
  } catch (e) {
    console.log('تعذّر تشغيل المؤثر', e)
  }
}
