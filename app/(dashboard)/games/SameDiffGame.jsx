import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
  BackHandler,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors } from '../../../constants/Color';
import useGameSafeTop from '../../../hooks/useGameSafeTop';
import GameNatureBackdrop from '../../../components/GameNatureBackdrop';
import GameStatsPanel from '../../../components/GameStatsPanel';
import { GAME_IDS, useRecordGameSession } from '../../../utils/gameStatsStore';
import {
  configureGameAudio,
  playSound,
  releaseSounds,
  waitForFinish,
} from '../../../utils/gameAudio';
import {
  LOCK_LEVELS,
  MAX_LEVEL,
  UNLOCK_KEYS,
  isLevelLocked,
  loadUnlocked,
  lockAlert,
  unlockIfScore,
} from '../../../utils/levelUnlock';

const { brand } = Colors;

const BAYAN = {
  listen: require('../../../assets/img/bayan-listen.png'),
  cheer: require('../../../assets/img/bayan-cheer.png'),
  think: require('../../../assets/img/bayan-think.png'),
  cards: require('../../../assets/img/bayan-cards.png'),
};

/**
 * مصدر اللعبة: فهرس 0 = القطة، فهرس 1 = الكلب.
 * غيّر العناصر هنا فقط لتبديل الزوج لاحقاً.
 */
const IMAGES = [
  require('../../../assets/img/cards/card-cat.png'),
  require('../../../assets/img/cards/card-dog.png'),
];
const SOUNDS = [
  require('../../../assets/audio/cat-sound.mp3'),
  require('../../../assets/audio/dog-sound.mp3'),
];

const ATTEMPTS = 10;
const UNLOCK_SCORE = 8;
const UNLOCK_KEY = UNLOCK_KEYS.sameDiff;

/** أربعة مستويات مكررة مؤقتاً — عدّل الميزات لاحقاً هنا فقط */
const LEVELS = {
  1: {
    title: 'المستوى 1',
    desc: 'متشابه أم مختلف؟',
    emoji: '🌱',
    color: brand.green,
    border: brand.greenDark,
  },
  2: {
    title: 'المستوى 2',
    desc: 'متشابه أم مختلف؟',
    emoji: '🌿',
    color: brand.sky,
    border: brand.skyDark,
  },
  3: {
    title: 'المستوى 3',
    desc: 'متشابه أم مختلف؟',
    emoji: '🌳',
    color: '#ff9600',
    border: '#e08600',
  },
  4: {
    title: 'المستوى 4',
    desc: 'متشابه أم مختلف؟',
    emoji: '🏆',
    color: '#ce82ff',
    border: '#a866d9',
  },
};

function PairColumn({ title, images, onPress, disabled, highlight }) {
  return (
    <TouchableOpacity
      style={[styles.pairCol, highlight && styles.pairColOn]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={styles.pairTitle}>{title}</Text>
      {images.map((src, i) => (
        <View key={`${title}-${i}`} style={styles.card}>
          <Image source={src} style={styles.cardImg} resizeMode="cover" />
        </View>
      ))}
    </TouchableOpacity>
  );
}

export default function SameDiffGame() {
  const router = useRouter();
  const topSafe = useGameSafeTop();

  // home | play | feedback
  const [screen, setScreen] = useState('home');
  const [level, setLevel] = useState(1);
  const [trial, setTrial] = useState(null); // 'same' | 'diff'
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [unlocked, setUnlocked] = useState(1);

  const soundRef = useRef(null);
  const sessionRef = useRef(0);
  const aliveRef = useRef(true);
  const pulse = useRef(new Animated.Value(1)).current;

  const stopAll = useCallback(async () => {
    sessionRef.current += 1;
    await releaseSounds(soundRef);
  }, []);

  useEffect(() => {
    configureGameAudio();
    loadUnlocked(UNLOCK_KEY).then(setUnlocked).catch(() => {});
    return () => {
      aliveRef.current = false;
      releaseSounds(soundRef);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (screen === 'play' || screen === 'feedback' || screen === 'stats') {
          Alert.alert('إيقاف وخروج؟', 'هل تريد العودة لاختيار المستويات؟', [
            { text: 'أكمل', style: 'cancel' },
            {
              text: 'خروج',
              style: 'destructive',
              onPress: async () => {
                await stopAll();
                setScreen('home');
                setFeedback(null);
              },
            },
          ]);
          return true;
        }
        router.replace('/games');
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [screen, stopAll, router])
  );

  useEffect(() => {
    if (!isPlaying) {
      pulse.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isPlaying, pulse]);

  const playOne = async (source) => {
    const sound = await playSound(soundRef, source);
    await waitForFinish(sound);
  };

  /** نفس الصوت مرتين (same) أو صوتان مختلفان (diff) */
  const playTrial = async (kind, sessionId) => {
    const isStale = () => sessionRef.current !== sessionId || !aliveRef.current;
    setIsPlaying(true);
    try {
      if (kind === 'same') {
        await playOne(SOUNDS[0]);
        if (isStale()) return;
        await new Promise((r) => setTimeout(r, 350));
        if (isStale()) return;
        await playOne(SOUNDS[0]);
      } else {
        await playOne(SOUNDS[0]);
        if (isStale()) return;
        await new Promise((r) => setTimeout(r, 350));
        if (isStale()) return;
        await playOne(SOUNDS[1]);
      }
    } finally {
      if (sessionRef.current === sessionId) setIsPlaying(false);
    }
  };

  const beginRound = async (levelNo, { resetScore = false } = {}) => {
    await stopAll();
    if (resetScore) {
      setScore(0);
      setAttempts(0);
    }
    const kind = Math.random() < 0.5 ? 'same' : 'diff';
    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    setLevel(levelNo);
    setTrial(kind);
    setFeedback(null);
    setScreen('play');
    setTimeout(() => playTrial(kind, sessionId), 350);
  };

  const startLevel = (levelNo) => {
    if (isLevelLocked(levelNo, unlocked)) {
      lockAlert();
      return;
    }
    beginRound(levelNo, { resetScore: true });
  };

  const handlePairPress = (pair) => {
    if (screen !== 'play' || isPlaying || feedback) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    const ok = pair === trial;
    if (ok) {
      setScore((s) => {
        const n = s + 1;
        unlockIfScore(UNLOCK_KEY, level, n, UNLOCK_SCORE, setUnlocked);
        return n;
      });
      setFeedback('success');
    } else {
      setFeedback('error');
    }
    setScreen(nextAttempts >= ATTEMPTS ? 'stats' : 'feedback');
  };

  useRecordGameSession(screen === 'stats', {
    gameId: GAME_IDS.sameDiff,
    level,
    endedReason: 'attempts',
    correct: score,
    total: ATTEMPTS,
  });

  // ========== قائمة المستويات ==========
  if (screen === 'home') {
    return (
      <GameNatureBackdrop>
        <SafeAreaView style={[styles.safe, { paddingTop: topSafe }]}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.mascot}>
              <Image source={BAYAN.cards} style={styles.mascotFill} resizeMode="cover" />
            </View>
            <Text style={styles.title}>متشابه أم مختلف؟</Text>
            <Text style={styles.sub}>
              اسمع الصوتين: إن كانا متشابهين اضغط اليمين، وإن اختلفا اضغط اليسار
            </Text>

            {[1, 2, 3, 4].map((n) => {
              const cfg = LEVELS[n];
              const locked = isLevelLocked(n, unlocked);
              return (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.levelBtn,
                    { backgroundColor: cfg.color, borderColor: cfg.border },
                    locked && styles.levelBtnLocked,
                  ]}
                  onPress={() => startLevel(n)}
                  activeOpacity={0.85}
                >
                  {locked ? (
                    <Ionicons name="lock-closed" size={22} color="#fff" />
                  ) : (
                    <Text style={styles.levelEmoji}>{cfg.emoji}</Text>
                  )}
                  <View style={styles.levelCol}>
                    <Text style={styles.levelTitle}>{cfg.title}</Text>
                    <Text style={styles.levelDesc}>
                      {locked ? 'أكمل المستوى السابق للفتح' : cfg.desc}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.outline}
              onPress={async () => {
                await stopAll();
                router.replace('/games');
              }}
            >
              <Text style={styles.outlineTxt}>العودة</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </GameNatureBackdrop>
    );
  }

  // ========== نتيجة الجولة ==========
  if (screen === 'feedback') {
    const ok = feedback === 'success';
    return (
      <GameNatureBackdrop>
        <SafeAreaView style={[styles.safe, { paddingTop: topSafe }]}>
          <View style={styles.feedbackWrap}>
            <View style={styles.mascotLg}>
              <Image
                source={ok ? BAYAN.cheer : BAYAN.think}
                style={styles.mascotFill}
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.fbTitle, ok ? styles.ok : styles.err]}>
              {ok ? 'أحسنت يا بطل!' : 'حاول مرة أخرى'}
            </Text>
            <Text style={styles.sub}>
              {ok
                ? trial === 'same'
                  ? 'الصوتان متشابهان — اخترت اليمين صح ⭐'
                  : 'الصوتان مختلفان — اخترت اليسار صح ⭐'
                : 'اسمع من جديد وركّز: متشابه أم مختلف؟'}
            </Text>
            {ok && (
              <View style={styles.scorePill}>
                <Text style={styles.scorePillTxt}>النقاط: {score}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, ok ? styles.btnGreen : styles.btnSky]}
              onPress={() => beginRound(level)}
            >
              <Text style={styles.btnTxt}>الجولة التالية ({attempts}/{ATTEMPTS})</Text>
            </TouchableOpacity>

            {ok &&
              level < MAX_LEVEL &&
              (!LOCK_LEVELS || unlocked >= level + 1) && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnSky]}
                  onPress={() => startLevel(level + 1)}
                >
                  <Text style={styles.btnTxt}>المستوى التالي</Text>
                </TouchableOpacity>
              )}

            <TouchableOpacity
              style={styles.outline}
              onPress={async () => {
                await stopAll();
                setScreen('home');
              }}
            >
              <Text style={styles.outlineTxt}>اختيار مستوى آخر</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GameNatureBackdrop>
    );
  }

  // ========== إحصائيات نهاية المستوى ==========
  if (screen === 'stats') {
    return (
      <GameNatureBackdrop>
        <SafeAreaView style={[styles.safe, { paddingTop: topSafe }]}>
          <View style={styles.feedbackWrap}>
            <View style={styles.mascotLg}>
              <Image source={BAYAN.cheer} style={styles.mascotFill} resizeMode="cover" />
            </View>
            <Text style={[styles.fbTitle, styles.ok]}>انتهت المحاولات</Text>
            <GameStatsPanel
              headline={`أصبتَ ${score} من ${ATTEMPTS}`}
              rows={[
                { icon: '✅', label: 'إجابات صحيحة', value: score, highlight: true },
                { icon: '❌', label: 'إجابات خاطئة', value: ATTEMPTS - score },
                { icon: '🎯', label: 'كل المحاولات', value: ATTEMPTS },
              ]}
            />
            {level < MAX_LEVEL && (!LOCK_LEVELS || unlocked >= level + 1) && (
              <TouchableOpacity
                style={[styles.btn, styles.btnGreen]}
                onPress={() => startLevel(level + 1)}
              >
                <Text style={styles.btnTxt}>المستوى التالي</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btn, styles.btnSky]}
              onPress={() => startLevel(level)}
            >
              <Text style={styles.btnTxt}>أعد هذا المستوى</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.outline}
              onPress={async () => {
                await stopAll();
                setScreen('home');
              }}
            >
              <Text style={styles.outlineTxt}>اختيار مستوى آخر</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GameNatureBackdrop>
    );
  }

  // ========== اللعب ==========
  const cfg = LEVELS[level] || LEVELS[1];

  return (
    <GameNatureBackdrop>
      <SafeAreaView style={[styles.safe, { paddingTop: topSafe }]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.exit}
            onPress={async () => {
              await stopAll();
              setScreen('home');
            }}
          >
            <Text style={styles.exitTxt}>خروج</Text>
          </TouchableOpacity>
          <View style={styles.hud}>
            <Text style={styles.hudTxt}>⭐ {score}</Text>
            <Text style={styles.hudLvl}>
              {cfg.title} · جولة {Math.min(attempts + 1, ATTEMPTS)}/{ATTEMPTS}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.playScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.mascotSm}>
            <Image source={BAYAN.listen} style={styles.mascotFill} resizeMode="cover" />
          </View>
          <Text style={styles.ask}>ماذا تسمع؟</Text>
          {/* <Text style={styles.hint}>متشابه → اليمين · مختلف → اليسار</Text> */}

          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <TouchableOpacity
              style={[styles.speaker, isPlaying && styles.speakerOn]}
              onPress={() =>
                !isPlaying && trial && playTrial(trial, sessionRef.current)
              }
              disabled={isPlaying}
            >
              <Ionicons
                name={isPlaying ? 'musical-notes' : 'volume-high'}
                size={44}
                color="#fff"
              />
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.replay}>
            {isPlaying ? 'استمع جيداً…' : 'اضغط لإعادة الاستماع'}
          </Text>

          <View style={styles.board}>
            <PairColumn
              title="مختلف"
              images={[IMAGES[0], IMAGES[1]]}
              onPress={() => handlePairPress('diff')}
              disabled={isPlaying}
            />
            <PairColumn
              title="متشابه"
              images={[IMAGES[0], IMAGES[0]]}
              onPress={() => handlePairPress('same')}
              disabled={isPlaying}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </GameNatureBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  playScroll: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 36 },
  mascot: { width: 150, height: 150, borderRadius: 28, overflow: 'hidden', marginBottom: 6 },
  mascotLg: { width: 180, height: 180, borderRadius: 28, overflow: 'hidden', marginBottom: 8 },
  mascotSm: { width: 110, height: 110, borderRadius: 24, overflow: 'hidden' },
  mascotFill: { width: '100%', height: '100%' },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#102818',
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  sub: {
    fontSize: 15,
    color: '#1a3324',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
    paddingHorizontal: 8,
    textShadowColor: 'rgba(255,255,255,0.92)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  levelBtn: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderBottomWidth: 5,
  },
  levelBtnLocked: { opacity: 0.55 },
  levelEmoji: { fontSize: 26, marginLeft: 10 },
  levelCol: { flex: 1, alignItems: 'flex-end' },
  levelTitle: { color: '#fff', fontWeight: '800', fontSize: 18 },
  levelDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  outline: {
    width: '100%',
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#d5e8ee',
    borderBottomWidth: 4,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  outlineTxt: { color: brand.muted, fontWeight: '700', fontSize: 16 },
  topBar: {
    width: '100%',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  exit: {
    backgroundColor: brand.coral,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderBottomWidth: 3,
    borderColor: '#e06548',
  },
  exitTxt: { color: '#fff', fontWeight: '800' },
  hud: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderColor: '#e8f0ec',
  },
  hudTxt: { fontWeight: '900', color: brand.ink, fontSize: 16 },
  hudLvl: { fontSize: 12, color: brand.muted, fontWeight: '700' },
  ask: {
    fontSize: 24,
    fontWeight: '900',
    color: '#102818',
    marginBottom: 4,
    textShadowColor: 'rgba(255,255,255,0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  hint: {
    fontSize: 14,
    fontWeight: '800',
    color: brand.skyDark,
    marginBottom: 12,
  },
  speaker: {
    backgroundColor: brand.sky,
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6,
    borderColor: brand.skyDark,
    marginBottom: 8,
  },
  speakerOn: { backgroundColor: brand.green, borderColor: brand.greenDark },
  replay: { color: brand.muted, fontWeight: '700', marginBottom: 14, fontSize: 13 },
  board: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  pairCol: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    borderBottomWidth: 5,
    padding: 10,
    alignItems: 'center',
  },
  pairColOn: { borderColor: brand.green, backgroundColor: '#e8f7d4' },
  pairTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: brand.ink,
    marginBottom: 8,
  },
  card: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#f5faf7',
  },
  cardImg: { width: '100%', height: '100%' },
  feedbackWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  fbTitle: { fontSize: 28, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  ok: { color: brand.green },
  err: { color: '#e08600' },
  scorePill: {
    backgroundColor: brand.greenSoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 16,
  },
  scorePillTxt: { color: brand.ink, fontWeight: '900', fontSize: 16 },
  btn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 5,
  },
  btnGreen: { backgroundColor: brand.green, borderColor: brand.greenDark },
  btnSky: { backgroundColor: brand.sky, borderColor: brand.skyDark },
  btnTxt: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
