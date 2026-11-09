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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import ThemedView from '../../../components/ThemedView'
import { Colors } from '../../../constants/Color'
import { shapeArabicLetters } from '../../../utils/arabicShape'

const { brand } = Colors

const BIBI = require('../../../assets/img/bayan-listen.png')
const BIBI_FALLBACK = require('../../../assets/img/bayan-side.png')

/**
 * كلمة العرض — لاحقاً تُربط بخوارزمية التصحيح
 * errorIndexes: أحرف أخطأ الطفل بنطقها (تُلوَّن أحمر)
 * skippedIndexes: أحرف سهى عنها (لا تُلوَّن)
 */
const DEMO_WORD = {
  letters: ['م', 'د', 'ر', 'س', 'ة'],
  errorIndexes: [], // السين 
  skippedIndexes: [],
}

/**
 * RN يكسر ربط العربية عند تلوين أحرف منفصلة، لذلك نعرض أشكال Presentation Forms
 * الموصولة مسبقاً داخل صف row-reverse.
 */
function WordLetters({ letters, errorIndexes, skippedIndexes }) {
  const shaped = shapeArabicLetters(letters)

  return (
    <View style={styles.lettersRow}>
      {shaped.map((ch, i) => {
        const isError = errorIndexes.includes(i)
        const isSkipped = skippedIndexes.includes(i)
        return (
          <Text
            key={`s-${i}`}
            style={[
              styles.letter,
              isError && styles.letterError,
              isSkipped && styles.letterSkipped,
            ]}
          >
            {ch}
          </Text>
        )
      })}
    </View>
  )
}

export default function SpeechTest() {
  const router = useRouter()
  const [listening, setListening] = useState(false)
  const [stars] = useState(125)
  const [progress] = useState({ current: 4, total: 8 })
  const pulse = useRef(new Animated.Value(1)).current
  const micGlow = useRef(new Animated.Value(0.4)).current

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        router.replace('/bayan')
        return true
      }
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack)
      return () => sub.remove()
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

  const onMicPress = () => {
    // لاحقاً: تسجيل صوت + تصحيح بالذكاء الاصطناعي
    setListening(true)
    setTimeout(() => setListening(false), 2200)
  }

  const onReplay = () => {
    // لاحقاً: تشغيل نطق الكلمة النموذجي
  }

  const pct = Math.round((progress.current / progress.total) * 100)

  return (
    <ThemedView safe edges={['top', 'left', 'right']} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* شريط علوي */}
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

        {/* شريط تقدم */}
        {/* <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {progress.current}/{progress.total}
          </Text>
        </View> */}

        {/* بيان + فقاعة */}
        <View style={styles.heroRow}>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}> إنني استمع .. اقرأ الكلمة بشكل واضح</Text>
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

        {/* بطاقة الكلمة */}
        <View style={styles.wordCard}>
          <TouchableOpacity style={styles.speakerBtn} onPress={onReplay}>
            <Ionicons name="volume-high" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.wordBoard}>
            <WordLetters
              letters={DEMO_WORD.letters}
              errorIndexes={DEMO_WORD.errorIndexes}
              skippedIndexes={DEMO_WORD.skippedIndexes}
            />
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendChip}>
              <View style={[styles.legendDot, styles.legendDotRed]} />
              <Text style={styles.legendText}>أحرف تحتاج تمرين</Text>
            </View>
            <View style={[styles.legendChip, styles.legendChipGray]}>
              <View style={[styles.legendDot, styles.legendDotGray]} />
              <Text style={[styles.legendText, styles.legendTextGray]}>
                حروف سهوتَ عنها
              </Text>
            </View>
          </View>
        </View>

        {/* أزرار التحكم */}
        <View style={styles.controls}>
          <View style={styles.micCol}>
            <Animated.View
              style={[
                styles.micGlow,
                { opacity: micGlow, transform: [{ scale: pulse }] },
              ]}
            />
            <TouchableOpacity
              style={[styles.micBtn, listening && styles.micBtnActive]}
              onPress={onMicPress}
              activeOpacity={0.85}
            >
              <Ionicons
                name={listening ? 'mic' : 'mic-outline'}
                size={42}
                color="#fff"
              />
            </TouchableOpacity>
            <Text style={styles.micLabel}>
              {listening ? 'جاري الاستماع…' : 'اضغط وتحدث'}
            </Text>
          </View>

          {/* <TouchableOpacity style={styles.replayBtn} onPress={onReplay}>
            <Ionicons name="refresh" size={22} color="#fff" />
            <Ionicons
              name="volume-medium"
              size={18}
              color="#fff"
              style={{ marginTop: -4 }}
            />
            <Text style={styles.replayLabel}>إعادة الاستماع</Text>
          </TouchableOpacity> */}
        </View>

        {/* ملاحظة تقنية للمرحلة القادمة */}
        {/* <Text style={styles.devNote}>
          الواجهة جاهزة — ربط التسجيل والتصحيح بالذكاء الاصطناعي لاحقاً
        </Text> */}
      </ScrollView>
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
  starsPill: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomWidth: 3,
    borderColor: '#f0e0a8',
  },
  starsText: {
    fontWeight: '800',
    color: brand.ink,
    fontSize: 14,
  },

  progressWrap: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  progressTrack: {
    flex: 1,
    height: 14,
    backgroundColor: '#d7efe3',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: brand.green,
    borderRadius: 10,
  },
  progressLabel: {
    fontWeight: '800',
    color: brand.muted,
    fontSize: 13,
    minWidth: 36,
    textAlign: 'center',
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
  letterError: {
    color: '#ff4b4b',
  },
  letterSkipped: {
    color: '#1f6b3a',
    opacity: 1,
  },
  legendRow: {
    width: '100%',
    gap: 8,
    alignItems: 'flex-end',
  },
  legendChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffe8e8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  legendChipGray: {
    backgroundColor: '#f0f2f4',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendDotRed: { backgroundColor: '#ff4b4b' },
  legendDotGray: { backgroundColor: '#9aa3ab' },
  legendText: {
    color: '#b33a3a',
    fontWeight: '700',
    fontSize: 12,
  },
  legendTextGray: {
    color: '#6a737a',
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
  micLabel: {
    marginTop: 10,
    fontWeight: '800',
    color: brand.ink,
    fontSize: 15,
  },
  replayBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: brand.green,
    borderBottomWidth: 5,
    borderColor: brand.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  replayLabel: {
    position: 'absolute',
    bottom: -22,
    width: 100,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: brand.muted,
  },

  devNote: {
    marginTop: 18,
    fontSize: 11,
    color: '#8aa8b0',
    textAlign: 'center',
  },
})
