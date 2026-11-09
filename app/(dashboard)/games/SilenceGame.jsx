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
  playEffect,
  releaseSounds,
  clearTimer,
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
  gamer: require('../../../assets/img/bayan-gamer.png'),
};

const SND = {
  forest: require('../../../assets/audio/forrest-sound.mp3'),
  street: require('../../../assets/audio/street-sound.mp3'),
  water: require('../../../assets/audio/water-sound.mp3'),
  success: require('../../../assets/audio/spawn_sound.mp3'),
  error: require('../../../assets/audio/error_sound.mp3'),
};

const MAX_LIVES = 3;
const MAX_ROUNDS = 10;
const UNLOCK_SCORE = 8;
const UNLOCK_KEY = UNLOCK_KEYS.silence;
const RESULT_MS = 1400;
/** مهلة الرد بعد سكوت الصوت — موحّدة لكل المستويات */
const REACT_MS = 3000;

/**
 * لعبة يقظة سمعية مستقلة: الصوت يعمل، وعند توقفه يضغط الطفل «سكت!».
 * المستويات تختلف في مدة الانتظار ومهلة الرد ووضوح الصوت والدعم البصري.
 */
const LEVELS = {
  1: {
    title: 'المستوى 1',
    desc: 'صوت واضح + إشارة بصرية عند السكون',
    emoji: '🌱',
    color: brand.green,
    border: brand.greenDark,
    sound: SND.forest,
    volume: 1,
    minWait: 2500,
    maxWait: 5500,
    reactMs: REACT_MS,
    visualCue: true,
  },
  2: {
    title: 'المستوى 2',
    desc: 'بدون إشارة بصرية — الأذن فقط',
    emoji: '🌿',
    color: brand.sky,
    border: brand.skyDark,
    sound: SND.water,
    volume: 0.95,
    minWait: 2200,
    maxWait: 7000,
    reactMs: REACT_MS,
    visualCue: false,
  },
  3: {
    title: 'المستوى 3',
    desc: 'صوت أخفت — مهلة 3 ثوانٍ',
    emoji: '🌳',
    color: '#ff9600',
    border: '#e08600',
    sound: SND.street,
    volume: 0.42,
    minWait: 2500,
    maxWait: 8000,
    reactMs: REACT_MS,
    visualCue: false,
  },
  4: {
    title: 'المستوى 4',
    desc: 'انتظار أطول — اضغط خلال 3 ثوانٍ',
    emoji: '🏆',
    color: '#ce82ff',
    border: '#a866d9',
    sound: SND.forest,
    volume: 0.85,
    minWait: 2000,
    maxWait: 6500,
    reactMs: REACT_MS,
    visualCue: false,
  },
};

export default function SilenceGame() {
  const router = useRouter();
  const topSafe = useGameSafeTop();

  // home | play | stats
  const [screen, setScreen] = useState('home');
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState('listening'); // listening | silent | result
  const [result, setResult] = useState(null); // success | early | miss
  const [lives, setLives] = useState(MAX_LIVES);
  const [hits, setHits] = useState(0);
  const [early, setEarly] = useState(0);
  const [missed, setMissed] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [unlocked, setUnlocked] = useState(1);

  const soundRef = useRef(null);
  const sessionRef = useRef(0);
  const aliveRef = useRef(true);
  const phaseRef = useRef('listening');
  const levelRef = useRef(1);
  const statsRef = useRef({
    hits: 0,
    early: 0,
    missed: 0,
    lives: MAX_LIVES,
    rounds: 0,
  });
  const stopTimer = useRef(null);
  const missTimer = useRef(null);
  const nextTimer = useRef(null);
  const pulse = useRef(new Animated.Value(1)).current;

  const cfg = LEVELS[level] || LEVELS[1];

  const clearAllTimers = () => {
    clearTimer(stopTimer);
    clearTimer(missTimer);
    clearTimer(nextTimer);
  };

  const stopAll = useCallback(async () => {
    sessionRef.current += 1;
    clearAllTimers();
    await releaseSounds(soundRef);
  }, []);

  useEffect(() => {
    configureGameAudio();
    loadUnlocked(UNLOCK_KEY).then(setUnlocked).catch(() => {});
    return () => {
      aliveRef.current = false;
      clearAllTimers();
      releaseSounds(soundRef);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (screen === 'play' || screen === 'stats') {
          Alert.alert('إيقاف وخروج؟', 'هل تريد العودة لاختيار المستويات؟', [
            { text: 'أكمل', style: 'cancel' },
            {
              text: 'خروج',
              style: 'destructive',
              onPress: async () => {
                await stopAll();
                setScreen('home');
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

  const showMotion = phase === 'listening' || (phase === 'silent' && !cfg.visualCue);

  useEffect(() => {
    if (screen !== 'play' || !showMotion) {
      pulse.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 480, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 480, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [screen, showMotion, pulse]);

  const isStale = (sessionId) =>
    sessionRef.current !== sessionId || !aliveRef.current;

  const pauseLoop = async () => {
    const sound = soundRef.current;
    if (!sound) return;
    try {
      await sound.pauseAsync();
    } catch (_) {}
  };

  const finishRound = (sessionId, kind) => {
    if (isStale(sessionId) || phaseRef.current === 'result') return;
    clearAllTimers();
    pauseLoop();

    phaseRef.current = 'result';
    setPhase('result');
    setResult(kind);

    const s = statsRef.current;
    if (kind === 'success') {
      s.hits += 1;
      setHits(s.hits);
      unlockIfScore(UNLOCK_KEY, levelRef.current, s.hits, UNLOCK_SCORE, setUnlocked);
      playEffect(SND.success);
    } else {
      s.lives -= 1;
      setLives(s.lives);
      if (kind === 'early') {
        s.early += 1;
        setEarly(s.early);
      } else {
        s.missed += 1;
        setMissed(s.missed);
      }
      playEffect(SND.error);
    }
    s.rounds += 1;
    setRounds(s.rounds);

    const ended = s.lives <= 0 || s.rounds >= MAX_ROUNDS;

    nextTimer.current = setTimeout(() => {
      if (isStale(sessionId)) return;
      if (ended) {
        releaseSounds(soundRef);
        setScreen('stats');
        return;
      }
      startRound(sessionId, levelRef.current);
    }, RESULT_MS);
  };

  const cutToSilence = async (sessionId, levelNo) => {
    if (isStale(sessionId) || phaseRef.current !== 'listening') return;
    await pauseLoop();
    if (isStale(sessionId) || phaseRef.current !== 'listening') return;

    phaseRef.current = 'silent';
    setPhase('silent');

    const reactMs = (LEVELS[levelNo] || LEVELS[1]).reactMs;
    missTimer.current = setTimeout(() => {
      finishRound(sessionId, 'miss');
    }, reactMs);
  };

  const startRound = async (sessionId, levelNo) => {
    if (isStale(sessionId)) return;
    const nextCfg = LEVELS[levelNo] || LEVELS[1];
    clearAllTimers();
    phaseRef.current = 'waiting';
    setPhase('waiting');
    setResult(null);

    await playSound(soundRef, nextCfg.sound, {
      loop: true,
      volume: nextCfg.volume,
      isStale: () => isStale(sessionId),
    });
    if (isStale(sessionId)) return;

    phaseRef.current = 'listening';
    setPhase('listening');

    const wait =
      nextCfg.minWait + Math.random() * (nextCfg.maxWait - nextCfg.minWait);
    stopTimer.current = setTimeout(() => {
      cutToSilence(sessionId, levelNo);
    }, wait);
  };

  const startLevel = async (levelNo) => {
    if (isLevelLocked(levelNo, unlocked)) {
      lockAlert();
      return;
    }
    await stopAll();
    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    setLevel(levelNo);
    levelRef.current = levelNo;
    setLives(MAX_LIVES);
    setHits(0);
    setEarly(0);
    setMissed(0);
    setRounds(0);
    statsRef.current = {
      hits: 0,
      early: 0,
      missed: 0,
      lives: MAX_LIVES,
      rounds: 0,
    };
    setResult(null);
    setScreen('play');
    startRound(sessionId, levelNo);
  };

  const handleTap = () => {
    if (screen !== 'play') return;
    const p = phaseRef.current;
    if (p === 'result' || p === 'waiting') return;
    const sessionId = sessionRef.current;
    if (p === 'listening') {
      finishRound(sessionId, 'early');
      return;
    }
    if (p === 'silent') {
      finishRound(sessionId, 'success');
    }
  };

  const resultCopy = {
    success: { title: 'أحسنت يا بطل!', body: 'سمعتَ أن الصوت سكت ⭐', face: BAYAN.cheer },
    early: { title: 'مبكر جداً', body: 'الصوت ما زال يعمل — انتظر السكون', face: BAYAN.think },
    miss: { title: 'فاتك السكون', body: 'الصوت توقف ولم تضغط في الوقت', face: BAYAN.think },
  };

  useRecordGameSession(screen === 'stats', {
    gameId: GAME_IDS.silence,
    level,
    endedReason: lives <= 0 ? 'hearts' : 'attempts',
    correct: hits,
    total: Math.max(rounds, hits + early + missed),
    livesLeft: lives,
    extra: { early, missed },
  });

  // ========== قائمة المستويات ==========
  if (screen === 'home') {
    return (
      <GameNatureBackdrop>
        <SafeAreaView style={[styles.safe, { paddingTop: topSafe }]}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.mascot}>
              <Image source={BAYAN.gamer} style={styles.mascotFill} resizeMode="cover" />
            </View>
            <Text style={styles.title}>سكت الصوت!</Text>
            <Text style={styles.sub}>
              اسمع الصوت جيداً… عندما يسكت اضغط الزر. لا تضغط وهو ما زال يعمل.
            </Text>

            {[1, 2, 3, 4].map((n) => {
              const item = LEVELS[n];
              const locked = isLevelLocked(n, unlocked);
              return (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.levelBtn,
                    { backgroundColor: item.color, borderColor: item.border },
                    locked && styles.levelBtnLocked,
                  ]}
                  onPress={() => startLevel(n)}
                  activeOpacity={0.85}
                >
                  {locked ? (
                    <Ionicons name="lock-closed" size={22} color="#fff" />
                  ) : (
                    <Text style={styles.levelEmoji}>{item.emoji}</Text>
                  )}
                  <View style={styles.levelCol}>
                    <Text style={styles.levelTitle}>{item.title}</Text>
                    <Text style={styles.levelDesc}>
                      {locked ? 'أكمل المستوى السابق للفتح' : item.desc}
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

  // ========== الإحصائيات ==========
  if (screen === 'stats') {
    const played = Math.max(rounds, hits + early + missed);
    return (
      <GameNatureBackdrop>
        <SafeAreaView style={[styles.safe, { paddingTop: topSafe }]}>
          <View style={styles.feedbackWrap}>
            <View style={styles.mascotLg}>
              <Image source={BAYAN.cheer} style={styles.mascotFill} resizeMode="cover" />
            </View>
            <Text style={[styles.fbTitle, styles.ok]}>انتهت الجولة</Text>
            <GameStatsPanel
              headline={`أصبتَ ${hits} من ${played}`}
              rows={[
                { icon: '✅', label: 'ضغطات في الوقت', value: hits, highlight: true },
                { icon: '⏳', label: 'ضغطات مبكرة', value: early },
                { icon: '💨', label: 'سكون فاتك', value: missed },
                { icon: '❤️', label: 'قلوب متبقية', value: Math.max(lives, 0) },
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
  const copy = result ? resultCopy[result] : null;
  const notesVisible = phase === 'listening' || (phase === 'silent' && !cfg.visualCue);

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
          <View style={styles.livesRow}>
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <Text key={i} style={[styles.heart, i >= lives && styles.heartLost]}>
                {i < lives ? '❤️' : '🤍'}
              </Text>
            ))}
          </View>
          <View style={styles.hud}>
            <Text style={styles.hudTxt}>⭐ {hits}</Text>
            <Text style={styles.hudLvl}>
              {cfg.title} · جولة {Math.min(rounds + (phase === 'result' ? 0 : 1), MAX_ROUNDS)}/
              {MAX_ROUNDS}
            </Text>
          </View>
        </View>

        <View style={styles.playBody}>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <View style={styles.mascotLg}>
              <Image
                source={phase === 'result' && copy ? copy.face : BAYAN.listen}
                style={styles.mascotFill}
                resizeMode="cover"
              />
            </View>
          </Animated.View>

          <Text style={[styles.notes, !notesVisible && styles.notesOff]}>
            {notesVisible ? '🎵  🎶  🎵' : '      '}
          </Text>

          <Text style={styles.ask}>
            {phase === 'result' && copy
              ? copy.title
              : phase === 'silent' && cfg.visualCue
              ? 'سكت… اضغط!'
              : 'اسمع… وانتظر السكون'}
          </Text>
          <Text style={styles.hint}>
            {phase === 'result' && copy
              ? copy.body
              : 'عندما يتوقف الصوت اضغط الزر'}
          </Text>

          <TouchableOpacity
            style={[
              styles.bigBtn,
              phase === 'silent' && cfg.visualCue && styles.bigBtnGo,
              phase === 'result' && result === 'success' && styles.bigBtnOk,
              phase === 'result' && result !== 'success' && styles.bigBtnBad,
            ]}
            onPress={handleTap}
            activeOpacity={0.85}
            disabled={phase === 'result'}
          >
            <Text style={styles.bigBtnTxt}>سكت!</Text>
          </TouchableOpacity>
        </View>
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
  mascot: {
    width: 150,
    height: 150,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 6,
  },
  mascotLg: {
    width: 170,
    height: 170,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 6,
  },
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
  livesRow: { flexDirection: 'row', gap: 2 },
  heart: { fontSize: 20 },
  heartLost: { opacity: 0.45 },
  hud: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderColor: '#e8f0ec',
  },
  hudTxt: { fontWeight: '900', color: brand.ink, fontSize: 15 },
  hudLvl: { fontSize: 11, color: brand.muted, fontWeight: '700' },
  playBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  notes: {
    fontSize: 22,
    marginBottom: 8,
    letterSpacing: 6,
    textAlign: 'center',
  },
  notesOff: { opacity: 0 },
  ask: {
    fontSize: 24,
    fontWeight: '900',
    color: '#102818',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(255,255,255,0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  hint: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a3324',
    textAlign: 'center',
    marginBottom: 22,
  },
  bigBtn: {
    width: '86%',
    paddingVertical: 22,
    borderRadius: 28,
    alignItems: 'center',
    backgroundColor: brand.coral,
    borderBottomWidth: 7,
    borderColor: '#e06548',
  },
  bigBtnGo: { backgroundColor: brand.green, borderColor: brand.greenDark },
  bigBtnOk: { backgroundColor: brand.green, borderColor: brand.greenDark },
  bigBtnBad: { backgroundColor: '#e08600', borderColor: '#c56f00' },
  bigBtnTxt: { color: '#fff', fontSize: 32, fontWeight: '900' },
  feedbackWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  fbTitle: { fontSize: 28, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  ok: { color: brand.green },
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
