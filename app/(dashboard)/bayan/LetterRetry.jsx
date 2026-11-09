import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  BackHandler,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import ThemedView from '../../../components/ThemedView'
import { Colors } from '../../../constants/Color'
import { shapeArabicLetters } from '../../../utils/arabicShape'
import {
  startWavRecording,
  stopWavRecording,
  discardWavRecording,
} from '../../../utils/wavSpeechRecorder'
import { analyzePronunciation } from '../../../utils/pronunciationAi'

const { brand } = Colors

const BIBI = require('../../../assets/img/bayan-listen.png')
const BIBI_FALLBACK = require('../../../assets/img/bayan-side.png')

const TARGET = {
  letters: ['مدرسة'],
}

const AUTO_STOP_MS = 4000

function WordLetters({ letters }) {
  const shaped = shapeArabicLetters(letters)
  return (
    <View style={styles.lettersRow}>
      {shaped.map((ch, i) => (
        <Text key={`s-${i}`} style={styles.letter}>
          {ch}
        </Text>
      ))}
    </View>
  )
}

export default function LetterRetry() {
  const router = useRouter()
  const [phase, setPhase] = useState('idle') // idle | recording | analyzing
  const [feedback, setFeedback] = useState(null)
  const [attempt, setAttempt] = useState(1)
  const pulse = useRef(new Animated.Value(1)).current
  const micGlow = useRef(new Animated.Value(0.4)).current
  const sheetY = useRef(new Animated.Value(90)).current
  const dim = useRef(new Animated.Value(0)).current
  const autoStopRef = useRef(null)
  const busyRef = useRef(false)

  const listening = phase === 'recording'
  const targetWord = TARGET.letters.join('')

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        router.replace('/bayan')
        return true
      }
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack)
      return () => {
        sub.remove()
        if (autoStopRef.current) clearTimeout(autoStopRef.current)
        discardWavRecording()
      }
    }, [router])
  )

  useEffect(() => {
    if (!listening) {
      pulse.setValue(1)
      return undefined
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [listening, pulse])

  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(micGlow, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(micGlow, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    )
    glow.start()
    return () => glow.stop()
  }, [micGlow])

  useEffect(() => {
    if (!feedback) {
      sheetY.setValue(90)
      dim.setValue(0)
      return undefined
    }
    sheetY.setValue(90)
    dim.setValue(0)
    Animated.parallel([
      Animated.timing(dim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(sheetY, {
        toValue: 0,
        friction: 8,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start()
    return undefined
  }, [feedback, dim, sheetY])

  const finishRecording = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current)
      autoStopRef.current = null
    }

    setPhase('analyzing')
    try {
      const clip = await stopWavRecording()
      if (!clip?.uri) {
        setPhase('idle')
        Alert.alert('التسجيل', 'لم يُحفظ مقطع الصوت. حاول مرة أخرى.')
        return
      }

      const result = await analyzePronunciation({
        clip,
        targetWord,
        targetLetters: TARGET.letters,
        attempt,
      })

      setFeedback(result)
    } catch (e) {
      if (e?.message === 'NO_MIC') {
        Alert.alert(
          'الميكروفون',
          'اسمح لبيان باستخدام الميكروفون لتسجيل نطقك بصيغة WAV.'
        )
      } else {
        Alert.alert('المقارنة', 'تعذّر تحليل النطق. حاول مرة أخرى.')
      }
    } finally {
      setPhase('idle')
      busyRef.current = false
    }
  }, [attempt, targetWord])

  const startRecording = useCallback(async () => {
    if (busyRef.current || feedback) return
    busyRef.current = true
    try {
      await startWavRecording()
      setPhase('recording')
      autoStopRef.current = setTimeout(() => {
        finishRecording()
      }, AUTO_STOP_MS)
    } catch (e) {
      setPhase('idle')
      if (e?.message === 'NO_MIC') {
        Alert.alert(
          'الميكروفون',
          'اسمح لبيان باستخدام الميكروفون لتسجيل نطقك بصيغة '
        )
      } else {
        Alert.alert('التسجيل', 'تعذّر بدء التسجيل. حاول مرة أخرى.')
      }
    } finally {
      busyRef.current = false
    }
  }, [feedback, finishRecording])

  const onMicPress = () => {
    if (phase === 'analyzing' || feedback) return
    if (phase === 'recording') {
      finishRecording()
      return
    }
    startRecording()
  }

  const onReplay = () => {
    // لاحقاً: تشغيل نطق الكلمة النموذجي
  }

  const retry = () => {
    setFeedback(null)
    setAttempt((n) => n + 1)
  }

  const micLabel =
    phase === 'analyzing'
      ? 'جاري المقارنة…'
      : phase === 'recording'
        ? 'جاري التسجيل… اضغط للإنهاء'
        : 'اضغط وتحدث'

  const errorLetter = feedback?.errorLetters?.[0]

  return (
    <ThemedView safe edges={['top', 'left', 'right']} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!feedback}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace('/bayan')}
            hitSlop={10}
          >
            <Ionicons name="home" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.titleCard}>
          <View style={styles.titleIconWrap}>
           <Ionicons name="mic-outline" size={24} color={brand.greenDark} />
          </View>
          <View style={styles.titleTextCol}>
                      <Text style={styles.titleKicker}>اختبار النطق</Text>
                      <Text style={styles.title}>صحّح نطقك مع بيان</Text>
                    </View>
        </View>

        <View style={styles.heroRow}>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>
              إنني أستمع.. اقرأ الكلمة بشكل واضح
            </Text>
          </View>
          <View style={styles.bibiFrame}>
            <Image
              source={BIBI}
              defaultSource={BIBI_FALLBACK}
              style={styles.bibi}
              resizeMode="cover"
            />
          </View>
        </View>

        <View style={styles.wordCard}>
          <TouchableOpacity style={styles.speakerBtn} onPress={onReplay}>
            <Ionicons name="volume-high" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.wordBoard}>
            <WordLetters letters={TARGET.letters} />
          </View>
        </View>

        <View style={styles.controls}>
          <View style={styles.micCol}>
            <Animated.View
              style={[
                styles.micGlow,
                { opacity: micGlow, transform: [{ scale: pulse }] },
              ]}
            />
            <TouchableOpacity
              style={[
                styles.micBtn,
                listening && styles.micBtnActive,
                phase === 'analyzing' && styles.micBtnBusy,
              ]}
              onPress={onMicPress}
              activeOpacity={0.85}
              disabled={phase === 'analyzing'}
            >
              {phase === 'analyzing' ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <Ionicons
                  name={listening ? 'mic' : 'mic-outline'}
                  size={42}
                  color="#fff"
                />
              )}
            </TouchableOpacity>
            <Text style={styles.micLabel}>{micLabel}</Text>
          </View>
        </View>
      </ScrollView>

      {feedback ? (
        <View style={styles.overlayWrap} pointerEvents="auto">
          <Animated.View style={[styles.dimmer, { opacity: dim }]} />
          <Animated.View
            style={[
              styles.sheet,
              feedback.correct ? styles.sheetOk : styles.sheetErr,
              { transform: [{ translateY: sheetY }] },
            ]}
          >
            {feedback.correct ? (
              <>
                <View style={styles.okBadge}>
                  <Ionicons name="star" size={36} color="#fff" />
                </View>
                <Text style={styles.sheetKicker}>أحسنت</Text>
                <Text style={styles.sheetTitle}>نطقك مطابق للكلمة</Text>
                <Text style={styles.sheetHint}>يمكنك إعادة التمرين متى شئت</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={retry}>
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.retryBtnText}>إعادة التمرين</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.sheetKicker}>الحرف الذي يحتاج إعادة</Text>
                <View style={styles.letterBadge}>
                  <Text style={styles.letterBadgeText}>
                    {errorLetter?.expected || '؟'}
                  </Text>
                </View>
                {errorLetter?.heard ? (
                  <Text style={styles.heardLine}>
                    سمعتُ قريباً من «{errorLetter.heard}» — المطلوب «
                    {errorLetter.expected}»
                  </Text>
                ) : null}
                <Text style={styles.sheetTitle}>أعد نطق هذا الحرف ثم الكلمة</Text>
                <Text style={styles.sheetHint}>
                  الكلمة تبقى كما هي على اللوحة. صحّح الحرف الظاهر ثم اضغط الميكروفون مجدداً.
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={retry}>
                  <Ionicons name="mic" size={20} color="#fff" />
                  <Text style={styles.retryBtnText}>أعد المحاولة</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </View>
      ) : null}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 40,
    paddingTop: 6,
    alignItems: 'center',
  },

  header: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  homeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: brand.green,
    borderBottomWidth: 4,
    borderColor: brand.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCard: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#c5ddcc',
    borderBottomWidth: 4,
    shadowColor: '#234038',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 16,
  },
  titleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: brand.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  titleKicker: {
    fontSize: 12,
    fontWeight: '800',
    color: brand.greenDark,
    textAlign: 'right',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#102818',
    textAlign: 'right',
    lineHeight: 28,
  },

  heroRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  bibiFrame: {
    width: 150,
    height: 150,
    borderRadius: 28,
    overflow: 'hidden',
  },
  bibi: {
    width: '100%',
    height: '100%',
  },
  bubble: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomWidth: 4,
    borderColor: '#e5eef2',
    maxWidth: 140,
  },
  bubbleText: {
    color: brand.ink,
    fontWeight: '800',
    fontSize: 15,
    textAlign: 'center',
  },

  wordCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 6,
    borderColor: '#d8efc4',
    marginTop: 6,
    marginBottom: 28,
  },
  wordBoard: {
    backgroundColor: '#d8efc4',
    paddingHorizontal: 20,
    margin: 10,
    borderRadius: 20,
  },
  speakerBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: brand.green,
    borderBottomWidth: 4,
    borderColor: brand.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lettersRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    marginTop: 8,
    marginBottom: 18,
  },
  letter: {
    fontSize: 48,
    fontWeight: '900',
    color: '#1f6b3a',
    letterSpacing: 0,
    includeFontPadding: false,
  },

  controls: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 28,
    marginBottom: 16,
  },
  micCol: {
    alignItems: 'center',
  },
  micGlow: {
    position: 'absolute',
    top: -8,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 200, 80, 0.45)',
  },
  micBtn: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#ff5a4a',
    borderBottomWidth: 6,
    borderColor: '#d64538',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  micBtnActive: {
    backgroundColor: '#ff3344',
  },
  micBtnBusy: {
    backgroundColor: '#c97870',
  },
  micLabel: {
    marginTop: 10,
    fontWeight: '800',
    color: brand.ink,
    fontSize: 15,
    textAlign: 'center',
  },

  overlayWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    zIndex: 30,
  },
  dimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 40, 28, 0.58)',
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderBottomWidth: 7,
    zIndex: 2,
  },
  sheetErr: {
    backgroundColor: '#fff8f6',
    borderColor: '#f0b4a8',
  },
  sheetOk: {
    backgroundColor: '#f4fbea',
    borderColor: '#c5ddcc',
  },
  sheetKicker: {
    fontSize: 14,
    fontWeight: '800',
    color: brand.muted,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#102818',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  sheetHint: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a3324',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
  letterBadge: {
    width: 108,
    height: 108,
    borderRadius: 32,
    backgroundColor: '#ff4b4b',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6,
    borderColor: '#c62828',
    marginVertical: 8,
  },
  letterBadgeText: {
    fontSize: 56,
    fontWeight: '900',
    color: '#fff',
    includeFontPadding: false,
  },
  heardLine: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b33a3a',
    textAlign: 'center',
    marginTop: 4,
  },
  okBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 5,
    borderColor: brand.greenDark,
    marginBottom: 8,
  },
  retryBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: brand.green,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomWidth: 4,
    borderColor: brand.greenDark,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
})
