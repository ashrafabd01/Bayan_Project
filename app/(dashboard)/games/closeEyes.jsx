import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
  Image,
  BackHandler,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Color';
import useGameSafeTop from '../../../hooks/useGameSafeTop';
import GameNatureBackdrop from '../../../components/GameNatureBackdrop';
import GameStatsPanel from '../../../components/GameStatsPanel';
import { GAME_IDS, useRecordGameSession } from '../../../utils/gameStatsStore';
import {
  configureGameAudio,
  playEffect,
  playSound,
  releaseSound,
  releaseSounds,
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

const BIBI = {
  main: require('../../../assets/img/bayan-side.png'),
  listen: require('../../../assets/img/bayan-listen.png'),
  cheer: require('../../../assets/img/bayan-cheer.png'),
  think: require('../../../assets/img/bayan-think.png'),
};

/**
 * أصوات اللعبة — يجب أن تكون ملفات Stereo (قناتين) ليعمل توجيه الاتجاه بوضوح.
 * SND_DRUM / SND_SPEECH بدائل مؤقتة: ضع drum-sound.mp3 و speech-sound.mp3
 * في assets/audio ثم بدّل المسار هنا فقط.
 */
const SND_DRUM = require('../../../assets/audio/drum-sound.mp3');
const SND_WATER = require('../../../assets/audio/water-sound.mp3');
const SND_SPEECH = require('../../../assets/audio/bird-sound.mp3');
const SND_NOISE = require('../../../assets/audio/forrest-sound.mp3');
const SND_SUCCESS = require('../../../assets/audio/spawn_sound.mp3');
const SND_ERROR = require('../../../assets/audio/error_sound.mp3');

const ROUNDS_PER_LEVEL = 10;
const UNLOCK_SCORE = 8; // 8 من 10 لفتح المستوى التالي
const UNLOCK_KEY = UNLOCK_KEYS.direction;
const COUNTDOWN_FROM = 3;
const EYES_CLOSE_MS = 550;
const EYES_OPEN_MS = 450;
const MAX_SOUND_MS = 3200;

const LEVELS = {
  1: {
    title: 'المستوى 1',
    desc: 'صوت طبلة واضح — بدون ضجيج',
    emoji: '🥁',
    source: SND_DRUM,
    noiseVolume: 0,
    color: brand.green,
    border: brand.greenDark,
  },
  2: {
    title: 'المستوى 2',
    desc: 'صوت مياه — بدون ضجيج',
    emoji: '💧',
    source: SND_WATER,
    noiseVolume: 0,
    color: brand.sky,
    border: brand.skyDark,
  },
  3: {
    title: 'المستوى 3',
    desc: 'صوت مياه + ضجيج خفيف',
    emoji: '🌊',
    source: SND_WATER,
    noiseVolume: 0.18,
    color: '#ff9600',
    border: '#e08600',
  },
  4: {
    title: 'المستوى 4',
    desc: 'صوت من المحيط / كلام + ضجيج',
    emoji: '🗣️',
    source: SND_SPEECH,
    noiseVolume: 0.32,
    color: '#ce82ff',
    border: '#a866d9',
  },
};

const DIRECTIONS = ['left', 'right', 'both'];

const DIRECTION_LABEL = {
  left: 'من اليسار',
  right: 'من اليمين',
  both: 'من الجهتين',
};

function randomDirection() {
  return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
}

/** وجه طفولي متحرك: يغمض عينيه، يبتسم، ويحرّك رأسه بلطف */
function KidFace({ eyesClosed, mood }) {
  const bob = useRef(new Animated.Value(0)).current;
  const eye = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  useEffect(() => {
    Animated.timing(eye, {
      toValue: eyesClosed ? 0 : 1,
      duration: eyesClosed ? EYES_CLOSE_MS : EYES_OPEN_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    if (eyesClosed) return undefined;

    Animated.sequence([
      Animated.timing(pop, {
        toValue: 1.1,
        duration: 220,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      Animated.timing(pop, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // رفّة عين لطيفة كل فترة أثناء فتح العينين
    const blink = setInterval(() => {
      Animated.sequence([
        Animated.timing(eye, { toValue: 0.12, duration: 90, useNativeDriver: true }),
        Animated.timing(eye, { toValue: 1, duration: 130, useNativeDriver: true }),
      ]).start();
    }, 3400);
    return () => clearInterval(blink);
  }, [eyesClosed, eye, pop]);

  useEffect(() => {
    if (mood !== 'listening') {
      ring.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    ring.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [mood, ring]);

  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const ringStyle = {
    opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
    transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.7] }) }],
  };

  const mouth =
    mood === 'happy' ? (
      <View style={styles.mouthHappy} />
    ) : mood === 'sad' ? (
      <View style={styles.mouthSad} />
    ) : mood === 'listening' ? (
      <View style={styles.mouthO} />
    ) : (
      <View style={styles.mouthSmile} />
    );

  return (
    <View style={styles.faceWrap}>
      {mood === 'listening' && (
        <>
          <Animated.View style={[styles.ring, styles.ringLeft, ringStyle]} pointerEvents="none" />
          <Animated.View style={[styles.ring, styles.ringRight, ringStyle]} pointerEvents="none" />
        </>
      )}

      <Animated.View
        style={[styles.face, { transform: [{ translateY: bobY }, { scale: pop }] }]}
      >
        {/* الشعر: قبعة شعر  + سالفان جانبيان */}
        <View style={styles.hairCap} />
        <View style={[styles.sideTuft, styles.sideTuftLeft]} />
        <View style={[styles.sideTuft, styles.sideTuftRight]} />

        <View style={[styles.ear, styles.earLeft]} />
        <View style={[styles.ear, styles.earRight]} />

        <View style={styles.browsRow}>
          <View style={styles.brow} />
          <View style={styles.brow} />
        </View>

        <View style={styles.eyesRow}>
          {[0, 1].map((i) => (
            <View key={i} style={styles.eyeSlot}>
              <View style={styles.lid} />
              <Animated.View style={[styles.eye, { transform: [{ scaleY: eye }] }]}>
                <View style={styles.pupil} />
                <View style={styles.sparkle} />
              </Animated.View>
            </View>
          ))}
        </View>

        <View style={styles.cheeksRow}>
          <View style={styles.cheek} />
          <View style={styles.cheek} />
        </View>

        <View style={styles.mouthWrap}>{mouth}</View>

        {/* السماعات: قوس نصف دائري فوق الشعر + وسادة علوية + كأسان على الأذنين */}
        <View style={styles.band} pointerEvents="none" />
        <View style={styles.bandPad} pointerEvents="none" />
        <View style={[styles.cup, styles.cupLeft]} pointerEvents="none" />
        <View style={[styles.cup, styles.cupRight]} pointerEvents="none" />
        <View style={[styles.cupPad, styles.cupPadLeft]} pointerEvents="none" />
        <View style={[styles.cupPad, styles.cupPadRight]} pointerEvents="none" />
      </Animated.View>

      {eyesClosed && <Text style={styles.zzz}>💤</Text>}
    </View>
  );
}

function BibiBubble({ mood = 'listen', text }) {
  return (
    <View style={styles.bibiRow}>
      <Image source={BIBI[mood]} style={styles.bibiImg} resizeMode="contain" />
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{text}</Text>
      </View>
    </View>
  );
}

export default function CloseEyesGame() {
  const router = useRouter();
  const topSafe = useGameSafeTop();

  // intro | levels | round | levelDone
  const [screen, setScreen] = useState('intro');
  // ready | countdown | listening | answer | result
  const [phase, setPhase] = useState('ready');
  const [level, setLevel] = useState(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [unlocked, setUnlocked] = useState(1);
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const [target, setTarget] = useState(null);
  const [picked, setPicked] = useState(null);
  const [replaysLeft, setReplaysLeft] = useState(1);

  const soundRef = useRef(null);
  const noiseRef = useRef(null);
  const fxRef = useRef(null);
  const sessionRef = useRef(0);
  const timersRef = useRef([]);
  const aliveRef = useRef(true);

  const addTimer = (id) => {
    timersRef.current.push(id);
    return id;
  };

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const stopAllAudio = useCallback(async () => {
    sessionRef.current += 1;
    clearTimers();
    await releaseSounds(soundRef, noiseRef);
  }, []);

  useEffect(() => {
    // خفض أصوات النظام يشوّه توجيه الصوت يمين/يسار، لذا نعطّله هنا
    configureGameAudio({ shouldDuckAndroid: false });
    loadUnlocked(UNLOCK_KEY).then(setUnlocked).catch(() => {});

    return () => {
      aliveRef.current = false;
      clearTimers();
      releaseSounds(soundRef, noiseRef, fxRef);
    };
  }, []);

  const exitToGames = useCallback(async () => {
    await stopAllAudio();
    router.replace('/games');
  }, [router, stopAllAudio]);

  const backToLevels = useCallback(async () => {
    await stopAllAudio();
    setScreen('levels');
    setPhase('ready');
    setLevel(null);
    setTarget(null);
    setPicked(null);
  }, [stopAllAudio]);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (screen === 'round' || screen === 'levelDone') {
          Alert.alert('إيقاف وخروج؟', 'هل تريد العودة لاختيار المستويات؟', [
            { text: 'أكمل اللعب', style: 'cancel' },
            { text: 'خروج', style: 'destructive', onPress: backToLevels },
          ]);
          return true;
        }
        if (screen === 'levels') {
          setScreen('intro');
          return true;
        }
        exitToGames();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [screen, backToLevels, exitToGames])
  );

  const playFx = (source) => playEffect(source);

  /** ضجيج خلفية متكرر في المنتصف (بدون اتجاه) */
  const startNoise = async (volume, sessionId) => {
    if (!volume) {
      await releaseSound(noiseRef);
      return;
    }
    await playSound(noiseRef, SND_NOISE, {
      loop: true,
      volume,
      androidImplementation: 'MediaPlayer',
      isStale: () => sessionRef.current !== sessionId,
    });
  };

  const PAN_BY_DIRECTION = { left: -1, right: 1 };

  /**
   * تشغيل الصوت موجَّهاً لجهة محددة، والانتظار حتى ينتهي.
   * audioPan يعمل على أندرويد فقط ومع androidImplementation: 'MediaPlayer'،
   * لذا نحمّل المقطع متوقفاً ثم نضبط الاتجاه والتشغيل معاً.
   */
  const playDirectional = async (source, direction, sessionId) => {
    const sound = await playSound(soundRef, source, {
      shouldPlay: false,
      androidImplementation: 'MediaPlayer',
      isStale: () => sessionRef.current !== sessionId,
    });
    if (!sound) return;

    try {
      await sound.setStatusAsync({
        audioPan: PAN_BY_DIRECTION[direction] ?? 0,
        volume: 1,
        shouldPlay: true,
      });
    } catch (_) {
      await sound.playAsync().catch(() => {});
    }

    // ننتظر انتهاء المقطع، مع سقف زمني يمنع التعليق
    await new Promise((resolve) => {
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && st.didJustFinish) resolve();
      });
      addTimer(setTimeout(resolve, MAX_SOUND_MS));
    });
  };

  /** الغمض ← الصوت ← فتح العينين ← سؤال الاتجاه */
  const runListenSequence = async (direction, levelNumber) => {
    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    const cfg = LEVELS[levelNumber];

    setPhase('listening');
    await new Promise((r) => addTimer(setTimeout(r, EYES_CLOSE_MS)));
    if (sessionRef.current !== sessionId || !aliveRef.current) return;

    await startNoise(cfg.noiseVolume, sessionId);
    if (sessionRef.current !== sessionId) return;

    await playDirectional(cfg.source, direction, sessionId);
    if (sessionRef.current !== sessionId || !aliveRef.current) return;

    await releaseSounds(soundRef, noiseRef);

    setPhase('answer');
  };

  const startCountdown = (direction, levelNumber) => {
    setPhase('countdown');
    setCount(COUNTDOWN_FROM);

    for (let i = 1; i < COUNTDOWN_FROM; i += 1) {
      addTimer(setTimeout(() => setCount(COUNTDOWN_FROM - i), i * 1000));
    }
    addTimer(setTimeout(() => runListenSequence(direction, levelNumber), COUNTDOWN_FROM * 1000));
  };

  const beginRound = async (levelNumber, roundNumber, { resetScore = false } = {}) => {
    await stopAllAudio();
    if (resetScore) setScore(0);
    const direction = randomDirection();
    setLevel(levelNumber);
    setRound(roundNumber);
    setTarget(direction);
    setPicked(null);
    setReplaysLeft(1);
    setScreen('round');
    setPhase('ready');
  };

  const startLevel = (levelNumber) => {
    if (isLevelLocked(levelNumber, unlocked)) {
      lockAlert();
      return;
    }
    beginRound(levelNumber, 1, { resetScore: true });
  };

  const handleReady = () => startCountdown(target, level);

  const handleReplay = () => {
    if (replaysLeft < 1) return;
    setReplaysLeft((n) => n - 1);
    runListenSequence(target, level);
  };

  const handleAnswer = async (direction) => {
    if (phase !== 'answer') return;
    setPicked(direction);
    const correct = direction === target;
    if (correct) setScore((s) => s + 1);
    setPhase('result');
    await playFx(correct ? SND_SUCCESS : SND_ERROR);
  };

  const handleNext = async () => {
    if (round >= ROUNDS_PER_LEVEL) {
      await stopAllAudio();
      unlockIfScore(UNLOCK_KEY, level, score, UNLOCK_SCORE, setUnlocked);
      setScreen('levelDone');
      return;
    }
    await beginRound(level, round + 1);
  };

  useRecordGameSession(screen === 'levelDone', {
    gameId: GAME_IDS.direction,
    level,
    endedReason: 'attempts',
    correct: score,
    total: ROUNDS_PER_LEVEL,
  });

  // ========== المقدمة ==========
  if (screen === 'intro') {
    return (
      <GameNatureBackdrop>
        <SafeAreaView style={[styles.safeClear, { paddingTop: topSafe }]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.bibiHero}>
            <Image source={BIBI.main} style={styles.mascotFill} resizeMode="cover" />
          </View>
          <Text style={styles.titleBig}>أين الصوت؟ 🎧</Text>
          <Text style={styles.subtitle}>
            أنا بيان! سنغمض عيوننا معاً… ثم تخبرني من أي جهة جاء الصوت 🦜
          </Text>

          <View style={styles.faceIntro}>
            <KidFace eyesClosed={false} mood="idle" />
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>قبل أن نبدأ</Text>
            <Text style={styles.tipText}>١. ارتدِ سماعات الرأس 🎧</Text>
            <Text style={styles.tipText}>٢. اجلس في مكان هادئ</Text>
            <Text style={styles.tipText}>٣. أغمض عينيك مع صديقنا</Text>
          </View>

          <TouchableOpacity
            style={[styles.btn, styles.btnGreen]}
            onPress={() => setScreen('levels')}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>هيا نبدأ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineBtn} onPress={exitToGames}>
            <Text style={styles.outlineText}>العودة للقائمة</Text>
          </TouchableOpacity>
        </ScrollView>
        </SafeAreaView>
      </GameNatureBackdrop>
    );
  }

  // ========== اختيار المستوى ==========
  if (screen === 'levels') {
    return (
      <GameNatureBackdrop>
        <SafeAreaView style={[styles.safeClear, { paddingTop: topSafe }]}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.bibiGuide}>
              <Image source={BIBI.think} style={styles.mascotFill} resizeMode="cover" />
            </View>
            <Text style={styles.headerTitleOnBg}>اختر مستوى التحدي</Text>
            <Text style={styles.subtitleOnBg}>كل مستوى فيه {ROUNDS_PER_LEVEL} جولات</Text>

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
                  <View style={styles.levelTextCol}>
                    <Text style={styles.levelTitle}>{cfg.title}</Text>
                    <Text style={styles.levelDesc}>
                      {locked ? 'أكمل المستوى السابق للفتح' : cfg.desc}
                    </Text>
                  </View>
                  <Text style={styles.levelArrow}>◀</Text>
                </TouchableOpacity>
              );
            })}

            {Platform.OS !== 'android' && (
              <Text style={styles.platformNote}>
                توجيه الصوت لجهة واحدة مدعوم على أندرويد — على هذا الجهاز سيُسمع من الجهتين
              </Text>
            )}

            <TouchableOpacity style={styles.outlineBtn} onPress={() => setScreen('intro')}>
              <Text style={styles.outlineText}>العودة</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </GameNatureBackdrop>
    );
  }

  // ========== نهاية المستوى ==========
  if (screen === 'levelDone') {
    const perfect = score === ROUNDS_PER_LEVEL;
    return (
      <GameNatureBackdrop>
        <SafeAreaView style={[styles.safeClear, { paddingTop: topSafe }]}>
        <View style={styles.centerWrap}>
          <View style={styles.bibiFeedback}>
            <Image source={BIBI.cheer} style={styles.mascotFill} resizeMode="cover" />
          </View>
          <Text style={styles.titleBig}>{perfect ? 'رائع جداً! 🏆' : 'انتهت المحاولات'}</Text>
          <GameStatsPanel
            headline={`أصبتَ ${score} من ${ROUNDS_PER_LEVEL}`}
            rows={[
              { icon: '✅', label: 'إجابات صحيحة', value: score, highlight: true },
              { icon: '❌', label: 'إجابات خاطئة', value: ROUNDS_PER_LEVEL - score },
              { icon: '🎧', label: 'كل المحاولات', value: ROUNDS_PER_LEVEL },
            ]}
          />

          {level < MAX_LEVEL && (!LOCK_LEVELS || unlocked >= level + 1) && (
            <TouchableOpacity
              style={[styles.btn, styles.btnGreen]}
              onPress={() => startLevel(level + 1)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>المستوى التالي</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.btn, styles.btnSky]}
            onPress={() => startLevel(level)}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>أعد هذا المستوى</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineBtn} onPress={backToLevels}>
            <Text style={styles.outlineText}>اختيار مستوى آخر</Text>
          </TouchableOpacity>
        </View>
        </SafeAreaView>
      </GameNatureBackdrop>
    );
  }

  // ========== الجولة ==========
  const cfg = LEVELS[level] || LEVELS[1];
  const night = phase === 'countdown' || phase === 'listening';
  const correct = picked === target;

  const faceMood =
    phase === 'listening'
      ? 'listening'
      : phase === 'result'
      ? correct
        ? 'happy'
        : 'sad'
      : 'idle';

  const bubbleText =
    phase === 'ready'
      ? 'ارتدِ السماعات وأغمض عينيك… سأعدّ إلى ثلاثة!'
      : phase === 'countdown'
      ? 'أغمض عينيك الآن…'
      : phase === 'listening'
      ? 'شششش… استمع بتركيز'
      : phase === 'answer'
      ? 'افتح عينيك! من أي جهة جاء الصوت؟'
      : correct
      ? 'أحسنت! سمعتَ الاتجاه بدقة'
      : `كان الصوت ${DIRECTION_LABEL[target]} — لا بأس، حاول مجدداً`;

  const playUi = (
    <SafeAreaView style={[night ? styles.safeNight : styles.safeClear, { paddingTop: topSafe, flex: 1 }]}>
      <View style={styles.playHeader}>
        <TouchableOpacity style={styles.exitChip} onPress={backToLevels}>
          <Text style={styles.exitChipText}>خروج</Text>
        </TouchableOpacity>
        <View style={styles.hud}>
          <Text style={[styles.hudText, night && styles.textLight]}>⭐ {score}</Text>
          <Text style={[styles.hudLevel, night && styles.textLightSoft]}>
            {cfg.title} · جولة {round}/{ROUNDS_PER_LEVEL}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.playScroll} showsVerticalScrollIndicator={false}>
        <BibiBubble
          mood={phase === 'result' ? (correct ? 'cheer' : 'think') : 'listen'}
          text={bubbleText}
        />

        {/* الوجه يبقى مفتوح العينين خلال العدّ ثم يغمضهما مع بداية الاستماع */}
        <KidFace eyesClosed={phase === 'listening'} mood={faceMood} />

        {phase === 'countdown' && <Text style={styles.countText}>{count}</Text>}

        {phase === 'listening' && (
          <Text style={styles.listeningText}>الصوت يعمل الآن… أين هو؟</Text>
        )}

        {phase === 'ready' && (
          <TouchableOpacity
            style={[styles.btn, styles.btnGreen]}
            onPress={handleReady}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>أنا جاهز — أغمض عينيّ</Text>
          </TouchableOpacity>
        )}

        {phase === 'answer' && (
          <>
            <Text style={styles.askTitle}>من أي جهة جاء الصوت؟</Text>
            <View style={styles.answersRow}>
              <TouchableOpacity
                style={[styles.answerCard, styles.cardRight]}
                onPress={() => handleAnswer('right')}
                activeOpacity={0.85}
              >
                <Text style={styles.cardEmoji}>👉</Text>
                <Text style={styles.cardText}>من اليمين</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.answerCard, styles.cardBoth]}
                onPress={() => handleAnswer('both')}
                activeOpacity={0.85}
              >
                <Text style={styles.cardEmoji}>🙌</Text>
                <Text style={styles.cardText}>من الجهتين</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.answerCard, styles.cardLeft]}
                onPress={() => handleAnswer('left')}
                activeOpacity={0.85}
              >
                <Text style={styles.cardEmoji}>👈</Text>
                <Text style={styles.cardText}>من اليسار</Text>
              </TouchableOpacity>
            </View>

            {replaysLeft > 0 && (
              <TouchableOpacity style={styles.outlineBtn} onPress={handleReplay}>
                <Text style={styles.outlineText}>أعد الصوت مرة واحدة</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {phase === 'result' && (
          <>
            <View style={[styles.resultPill, correct ? styles.pillOk : styles.pillErr]}>
              <Text style={styles.resultPillText}>
                {correct ? 'إجابة صحيحة ✔' : `الصحيح: ${DIRECTION_LABEL[target]}`}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.btn, correct ? styles.btnGreen : styles.btnSky]}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>
                {round >= ROUNDS_PER_LEVEL ? 'شاهد نتيجتي' : 'الجولة التالية'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  return night ? playUi : (
    <GameNatureBackdrop>{playUi}</GameNatureBackdrop>
  );
}

const SKIN = '#ffd7a8';
const SKIN_DARK = '#f0bd86';
const INK_FACE = '#5b3a29';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.mint },
  safeClear: { flex: 1, backgroundColor: 'transparent' },
  bgFill: { flex: 1, width: '100%', height: '100%' },
  safeNight: { backgroundColor: '#152a4a' },
  scroll: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  playScroll: { paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center' },

  titleBig: {
    fontSize: 28,
    fontWeight: '900',
    color: '#102818',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(255,255,255,0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#102818',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(255,255,255,0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#1a3324',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 16,
    paddingHorizontal: 8,
    textShadowColor: 'rgba(255,255,255,0.92)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  headerTitleOnBg: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e4d28',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  subtitleOnBg: {
    fontSize: 15,
    color: '#2f5a3a',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 16,
    paddingHorizontal: 8,
    fontWeight: '700',
    textShadowColor: 'rgba(255,255,255,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  textLight: { color: '#fff' },
  textLightSoft: { color: 'rgba(255,255,255,0.8)' },

  bibiHero: {
    width: 170,
    height: 170,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 6,
  },
  bibiGuide: {
    width: 140,
    height: 140,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 6,
  },
  bibiFeedback: {
    width: 160,
    height: 160,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 8,
  },
  mascotFill: {
    width: '100%',
    height: '100%',
  },
  bibiImg: { width: 62, height: 62, marginLeft: 8, borderRadius: 16, overflow: 'hidden' },

  bibiRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 10,
  },
  bubble: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: brand.greenSoft,
  },
  bubbleText: {
    fontSize: 15,
    fontWeight: '700',
    color: brand.ink,
    textAlign: 'right',
    lineHeight: 22,
  },

  faceIntro: { marginVertical: 6 },
  faceWrap: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  face: {
    width: 176,
    height: 186,
    borderRadius: 92,
    backgroundColor: SKIN,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: SKIN_DARK,
  },
  hairCap: {
    position: 'absolute',
    top: -3,
    left: 1,
    width: 171,
    height: 50,
    borderTopLeftRadius: 82,
    borderTopRightRadius: 82,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    backgroundColor: INK_FACE,
  },
  sideTuft: {
    position: 'absolute',
    top: 28,
    width: 22,
    height: 44,
    borderRadius: 10,
    backgroundColor: INK_FACE,
  },
  sideTuftLeft: { left: 1},
  sideTuftRight: { right: -2 },
  ear: {
    position: 'absolute',
    top: 84,
    width: 26,
    height: 34,
    borderRadius: 14,
    backgroundColor: SKIN,
    borderWidth: 3,
    borderColor: SKIN_DARK,
  },
  earLeft: { left: -14 },
  earRight: { right: -14 },

  browsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 108,
    marginTop: 56,
  },
  brow: {
    width: 34,
    height: 7,
    borderRadius: 4,
    backgroundColor: INK_FACE,
  },

  eyesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 108,
    marginTop: 10,
  },
  eyeSlot: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  lid: {
    position: 'absolute',
    width: 32,
    height: 5,
    borderRadius: 3,
    backgroundColor: INK_FACE,
  },
  eye: {
    width: 32,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: INK_FACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: { width: 15, height: 15, borderRadius: 8, backgroundColor: '#2a2118' },
  sparkle: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },

  cheeksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 138,
    marginTop: 6,
  },
  cheek: {
    width: 26,
    height: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,120,110,0.38)',
  },

  mouthWrap: { marginTop: 4, alignItems: 'center', justifyContent: 'center', height: 34 },
  mouthSmile: {
    width: 46,
    height: 22,
    borderBottomWidth: 5,
    borderBottomColor: INK_FACE,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  mouthHappy: {
    width: 52,
    height: 26,
    backgroundColor: '#8a4a3c',
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  mouthSad: {
    width: 40,
    height: 20,
    borderTopWidth: 5,
    borderTopColor: INK_FACE,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  mouthO: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 4,
    borderColor: INK_FACE,
  },
  band: {
    position: 'absolute',
    top: -28,
    left: -14,
    width: 204,
    height: 104,
    borderTopLeftRadius: 102,
    borderTopRightRadius: 102,
    borderWidth: 11,
    borderBottomWidth: 0,
    borderColor: '#3a4a63',
  },
  bandPad: {
    position: 'absolute',
    top: -34,
    left: 57,
    width: 62,
    height: 16,
    borderRadius: 9,
    backgroundColor: '#2b3850',
  },
  cup: {
    position: 'absolute',
    top: 68,
    width: 36,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#3a4a63',
    borderWidth: 3,
    borderColor: '#2b3850',
  },
  cupLeft: { left: -24 },
  cupRight: { right: -24 },
  cupPad: {
    position: 'absolute',
    top: 78,
    width: 12,
    height: 32,
    borderRadius: 7,
    backgroundColor: '#5a6d8c',
  },
  cupPadLeft: { left: -8 },
  cupPadRight: { right: -8 },

  ring: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 5,
    borderColor: brand.sky,
  },
  ringLeft: { left: 0 },
  ringRight: { right: 0 },
  zzz: { position: 'absolute', top: 6, right: 18, fontSize: 30 },

  countText: {
    fontSize: 72,
    fontWeight: '900',
    color: '#fff',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  listeningText: {
    fontSize: 17,
    fontWeight: '800',
    color: brand.sky,
    marginTop: 10,
    textAlign: 'center',
  },
  askTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: brand.ink,
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },

  tipCard: {
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginVertical: 14,
    borderWidth: 2,
    borderColor: brand.greenSoft,
  },
  tipTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: brand.ink,
    textAlign: 'right',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 15,
    color: brand.muted,
    textAlign: 'right',
    marginBottom: 4,
    fontWeight: '600',
  },

  btn: {
    alignSelf: 'stretch',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    borderBottomWidth: 5,
    marginTop: 14,
  },
  btnGreen: { backgroundColor: brand.green, borderColor: brand.greenDark },
  btnSky: { backgroundColor: brand.sky, borderColor: brand.skyDark },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  outlineBtn: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e5e5',
    marginTop: 12,
  },
  outlineText: { color: brand.muted, fontSize: 16, fontWeight: '800' },

  playHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  exitChip: {
    backgroundColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  exitChipText: { color: brand.ink, fontWeight: '900', fontSize: 14 },
  hud: { alignItems: 'flex-start' },
  hudText: { fontSize: 18, fontWeight: '900', color: brand.ink },
  hudLevel: { fontSize: 13, fontWeight: '700', color: brand.muted },

  answersRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  answerCard: {
    width: '31%',
    aspectRatio: 0.9,
    borderRadius: 18,
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cardRight: { backgroundColor: brand.yellow, borderColor: brand.yellowDark },
  cardLeft: { backgroundColor: brand.coral, borderColor: '#e0603f' },
  cardBoth: { backgroundColor: brand.sky, borderColor: brand.skyDark },
  cardEmoji: { fontSize: 34, marginBottom: 6 },
  cardText: { fontSize: 14, fontWeight: '900', color: '#fff', textAlign: 'center' },

  resultPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    marginTop: 14,
  },
  pillOk: { backgroundColor: brand.greenSoft },
  pillErr: { backgroundColor: '#ffe3db' },
  resultPillText: { fontSize: 16, fontWeight: '900', color: brand.ink },

  starsRow: { flexDirection: 'row-reverse', marginVertical: 10 },
  starBig: { fontSize: 30, marginHorizontal: 3 },

  levelBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderBottomWidth: 5,
  },
  levelBtnLocked: { opacity: 0.55 },
  levelEmoji: { fontSize: 30, marginLeft: 10 },
  levelTextCol: { flex: 1, alignItems: 'flex-end' },
  levelTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  levelDesc: { color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 3, textAlign: 'right' },
  levelArrow: { color: 'rgba(255,255,255,0.75)', fontSize: 16, marginRight: 4 },

  platformNote: {
    fontSize: 13,
    color: brand.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
});
