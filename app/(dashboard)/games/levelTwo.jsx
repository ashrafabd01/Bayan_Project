import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  SafeAreaView,
  ImageBackground,
  Image,
  BackHandler,
  Alert,
  AppState,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useGameSafeTop from '../../../hooks/useGameSafeTop';
import {
  configureGameAudio,
  playEffect,
  playSound,
  releaseSound,
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
import GameStatsPanel from '../../../components/GameStatsPanel';
import { GAME_IDS, useRecordGameSession } from '../../../utils/gameStatsStore';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BUBBLE_SIZE = 72;
const MAX_MISTAKES = 3;
/** أكثر من 10 فقاعات صحيحة لفتح المستوى التالي */
const UNLOCK_SCORE = 11;
const UNLOCK_KEY = UNLOCK_KEYS.bubbles;

const BUBBLE_COLORS = [
  ['#7ee8fa', '#67d4ef'],
  ['#a8f0c6', '#7ed9a8'],
  ['#ffd6e7', '#ffb3d1'],
  ['#ffe6a7', '#ffd06a'],
  ['#c9b6ff', '#a994f0'],
  ['#b8f2ff', '#8ad8ef'],
];

const SOUNDS = {
  spawn: require('../../../assets/audio/spawn_sound.mp3'),
  error: require('../../../assets/audio/error_sound.mp3'),
  background: null, // require('../../../assets/audio/bubble-ambient.mp3')
};

const LEVEL4_BACKGROUND_IMAGE = null; // require('../../../assets/img/underwater.png')

const BAYAN = {
  listen: require('../../../assets/img/bayan-listen.png'),
  cheer: require('../../../assets/img/bayan-cheer.png'),
  bubbles: require('../../../assets/img/bayan-bubbles.png'),
};

const LEVELS_CONFIG = {
  1: {
    title: 'المستوى 1',
    desc: 'فقاعات هادئة وبطيئة',
    emoji: '🫧',
    color: '#58cc02',
    border: '#46a302',
    spawnIntervalMs: 2800,
    floatDurationMs: 7800,
    hasBgSound: false,
    dualSources: false,
    hasThemeBackground: false,
  },
  2: {
    title: 'المستوى 2',
    desc: 'أسرع قليلاً + صوت بيئة',
    emoji: '🌊',
    color: '#1cb0f6',
    border: '#1899d6',
    spawnIntervalMs: 2000,
    floatDurationMs: 5600,
    hasBgSound: true,
    dualSources: false,
    hasThemeBackground: false,
  },
  3: {
    title: 'المستوى 3',
    desc: 'فقاعات من مصدرين!',
    emoji: '💨',
    color: '#ff9600',
    border: '#e08600',
    spawnIntervalMs: 1800,
    floatDurationMs: 5000,
    hasBgSound: true,
    dualSources: true,
    hasThemeBackground: false,
  },
  4: {
    title: 'المستوى 4',
    desc: 'عالم تحت الماء',
    emoji: '🐠',
    color: '#ce82ff',
    border: '#a866d9',
    spawnIntervalMs: 1500,
    floatDurationMs: 4400,
    hasBgSound: true,
    dualSources: true,
    hasThemeBackground: true,
  },
};

function SoftSkyBackdrop({ children, deep }) {
  return (
    <View style={[styles.skyRoot, deep && styles.skyRootDeep]}>
      <View style={styles.skyBlobA} pointerEvents="none" />
      <View style={styles.skyBlobB} pointerEvents="none" />
      <View style={styles.skyBlobC} pointerEvents="none" />
      {children}
    </View>
  );
}

function OceanBackdrop({ children }) {
  return (
    <View style={styles.oceanRoot}>
      <View style={[styles.oceanLayer, styles.oceanDeep]} pointerEvents="none" />
      <View style={[styles.oceanLayer, styles.oceanMid]} pointerEvents="none" />
      <View style={[styles.oceanLayer, styles.oceanLight]} pointerEvents="none" />
      <View style={styles.oceanGlow} pointerEvents="none" />
      <Text style={styles.oceanFish} pointerEvents="none">
        🐠    🐙    🐟
      </Text>
      {children}
    </View>
  );
}

function HeartsRow({ mistakes, max }) {
  const left = Math.max(max - mistakes, 0);
  return (
    <View style={styles.heartsRow}>
      {Array.from({ length: max }).map((_, i) => (
        <Text key={i} style={[styles.heart, i >= left && styles.heartLost]}>
          {i < left ? '❤️' : '🤍'}
        </Text>
      ))}
    </View>
  );
}

function Bubble({ id, hasSound, x, durationMs, onPop, onMiss, isPaused, colorPair }) {
  const bottom = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(0.35)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const wobble = useRef(new Animated.Value(0)).current;
  const finishedRef = useRef(false);
  const animRef = useRef(null);
  const wobbleRef = useRef(null);
  const onPopRef = useRef(onPop);
  const onMissRef = useRef(onMiss);
  const colors = colorPair || BUBBLE_COLORS[0];

  useEffect(() => {
    onPopRef.current = onPop;
    onMissRef.current = onMiss;
  }, [onPop, onMiss]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();

    wobbleRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(wobble, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false,
        }),
        Animated.timing(wobble, {
          toValue: -1,
          duration: 700,
          useNativeDriver: false,
        }),
      ])
    );
    wobbleRef.current.start();

    return () => {
      wobbleRef.current?.stop();
      animRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (isPaused) {
      bottom.stopAnimation();
      wobbleRef.current?.stop();
      return;
    }

    wobbleRef.current?.start();

    bottom.stopAnimation((currentBottom) => {
      const target = SCREEN_H + BUBBLE_SIZE;
      const remaining = Math.max(target - currentBottom, 0);
      const total = SCREEN_H + BUBBLE_SIZE - 20;
      const durationLeft = Math.max((remaining / total) * durationMs, 120);

      animRef.current = Animated.timing(bottom, {
        toValue: target,
        duration: durationLeft,
        useNativeDriver: false,
      });

      animRef.current.start(({ finished }) => {
        if (finished && !finishedRef.current) {
          finishedRef.current = true;
          onMissRef.current?.(id, hasSound);
        }
      });
    });
  }, [isPaused, durationMs, id, hasSound, bottom]);

  const handlePress = () => {
    if (finishedRef.current || isPaused) return;
    finishedRef.current = true;
    animRef.current?.stop();
    wobbleRef.current?.stop();
    onPopRef.current?.(id, hasSound);

    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1.55,
        duration: 140,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const rotate = wobble.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-7deg', '7deg'],
  });

  return (
    <Animated.View
      style={[
        styles.bubbleWrap,
        {
          left: x,
          bottom,
          opacity,
          transform: [{ scale }, { rotate }],
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={handlePress}
        disabled={isPaused}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        style={[
          styles.bubble,
          { backgroundColor: colors[0], borderColor: '#fff' },
        ]}
      >
        <View
          style={[styles.bubbleInnerGlow, { backgroundColor: colors[1] }]}
          pointerEvents="none"
        />
        <View style={styles.bubbleShine} pointerEvents="none" />
        <View style={styles.bubbleShineSmall} pointerEvents="none" />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function BubbleGame() {
  const router = useRouter();
  const topSafe = useGameSafeTop();

  const [currentLevel, setCurrentLevel] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [bubbles, setBubbles] = useState([]);

  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [totalSoundBubbles, setTotalSoundBubbles] = useState(0);
  const [missedSoundBubbles, setMissedSoundBubbles] = useState(0);
  const [unlocked, setUnlocked] = useState(1);

  const bgSoundRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const sessionIdRef = useRef(0);
  const isActiveRef = useRef(false);
  const currentLevelRef = useRef(null);
  const mistakesRef = useRef(0);
  const isPausedRef = useRef(false);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    currentLevelRef.current = currentLevel;
  }, [currentLevel]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const clearSpawnTimer = () => {
    if (spawnTimerRef.current) {
      clearInterval(spawnTimerRef.current);
      spawnTimerRef.current = null;
    }
  };

  const stopBgSound = useCallback(() => releaseSound(bgSoundRef), []);

  const stopEverything = useCallback(async () => {
    isActiveRef.current = false;
    sessionIdRef.current += 1;
    clearSpawnTimer();
    setBubbles([]);
    await stopBgSound();
  }, [stopBgSound]);

  /** مؤثر قصير عند إصابة فقاعة صوتية أو الخطأ */
  const playFx = useCallback(
    (kind) => playEffect(kind === 'error' ? SOUNDS.error : SOUNDS.spawn, 1),
    []
  );

  useEffect(() => {
    configureGameAudio();
    loadUnlocked(UNLOCK_KEY).then(setUnlocked).catch(() => {});
    return () => {
      isActiveRef.current = false;
      sessionIdRef.current += 1;
      clearSpawnTimer();
      releaseSound(bgSoundRef);
    };
  }, []);

  const resetStats = () => {
    setScore(0);
    setMistakes(0);
    mistakesRef.current = 0;
    setTotalSoundBubbles(0);
    setMissedSoundBubbles(0);
    setBubbles([]);
    setGameOver(false);
    setIsPaused(false);
    isPausedRef.current = false;
  };

  const resetToLevelSelect = useCallback(async () => {
    await stopEverything();
    resetStats();
    setIsPlaying(false);
    currentLevelRef.current = null;
    setCurrentLevel(null);
  }, [stopEverything]);

  const handleFullExit = useCallback(async () => {
    // أوقف اعتراض الرجوع فوراً قبل التنقل حتى لا يظهر أي سؤال بعد الخروج
    isPlayingRef.current = false;
    isActiveRef.current = false;
    currentLevelRef.current = null;
    setIsPlaying(false);
    setCurrentLevel(null);
    setGameOver(false);
    setBubbles([]);

    await stopEverything();
    router.replace('/games');
  }, [router, stopEverything]);

  const confirmLevelExit = useCallback(() => {
    // لا تعرض النافذة إلا أثناء لعب فعلي
    if (!isPlayingRef.current || currentLevelRef.current == null) return;

    Alert.alert(
      'إيقاف وخروج؟',
      'هل تريد إيقاف الفقاعات والعودة لاختيار المستويات؟',
      [
        { text: 'أكمل اللعب', style: 'cancel' },
        {
          text: 'إيقاف وخروج',
          style: 'destructive',
          onPress: () => resetToLevelSelect(),
        },
      ],
      { cancelable: true }
    );
  }, [resetToLevelSelect]);

  // زر الرجوع يعترض فقط أثناء اللعب وأثناء تركيز الشاشة
  useFocusEffect(
    useCallback(() => {
      if (!isPlaying || currentLevel == null || gameOver) {
        return undefined;
      }

      const onBack = () => {
        if (!isPlayingRef.current || currentLevelRef.current == null) {
          return false;
        }
        confirmLevelExit();
        return true;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [isPlaying, currentLevel, gameOver, confirmLevelExit])
  );

  // عند مغادرة الشاشة: أوقف صوت الخلفية فقط
  // لا تُصفّر isActive هنا — نوافذ Alert قد تُفقد التركيز مؤقتاً وتوقف الأصوات بالخطأ
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (bgSoundRef.current) {
          bgSoundRef.current.pauseAsync().catch(() => {});
        }
      };
    }, [])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (
        next.match(/inactive|background/) &&
        isActiveRef.current &&
        isPlayingRef.current &&
        !gameOver
      ) {
        setIsPaused(true);
        isPausedRef.current = true;
        if (bgSoundRef.current) {
          bgSoundRef.current.pauseAsync().catch(() => {});
        }
      }
    });
    return () => sub.remove();
  }, [gameOver]);

  const endGame = useCallback(async () => {
    isActiveRef.current = false;
    sessionIdRef.current += 1;
    clearSpawnTimer();
    setBubbles([]);
    setIsPlaying(false);
    setIsPaused(false);
    setGameOver(true);
    await stopBgSound();
  }, [stopBgSound]);

  /** ضوضاء خلفية في المستويات المتقدمة لتصعيب تمييز الفقاعة الصوتية */
  const playBgIfNeeded = async (levelNumber, sessionId) => {
    if (!LEVELS_CONFIG[levelNumber]?.hasBgSound || !SOUNDS.background) return;

    await playSound(bgSoundRef, SOUNDS.background, {
      loop: true,
      volume: 0.28,
      isStale: () =>
        !isActiveRef.current || sessionIdRef.current !== sessionId,
    });
  };

  const pickSpawnX = (dualSources) => {
    const margin = 16;
    if (!dualSources) {
      return margin + Math.random() * (SCREEN_W - BUBBLE_SIZE - margin * 2);
    }
    const fromLeft = Math.random() < 0.5;
    const laneW = SCREEN_W * 0.38;
    if (fromLeft) {
      return margin + Math.random() * Math.max(laneW - BUBBLE_SIZE, 10);
    }
    return (
      SCREEN_W -
      laneW +
      Math.random() * Math.max(laneW - BUBBLE_SIZE - margin, 10)
    );
  };

  const spawnBubble = useCallback(async (levelNumber, sessionId) => {
    if (!isActiveRef.current || sessionIdRef.current !== sessionId) return;
    if (isPausedRef.current) return;

    const config = LEVELS_CONFIG[levelNumber];
    if (!config) return;

    const hasSound = Math.random() > 0.45;

    if (hasSound) {
      setTotalSoundBubbles((p) => p + 1);
      playFx('spawn');
    }

    if (!isActiveRef.current || sessionIdRef.current !== sessionId) return;

    const colorPair =
      BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];

    setBubbles((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        hasSound,
        x: pickSpawnX(config.dualSources),
        durationMs: config.floatDurationMs,
        colorPair,
      },
    ]);
  }, [playFx]);

  const startLevel = async (levelNumber) => {
    if (isLevelLocked(levelNumber, unlocked)) {
      lockAlert();
      return;
    }
    await stopEverything();
    resetStats();

    const sessionId = sessionIdRef.current + 1;
    sessionIdRef.current = sessionId;
    isActiveRef.current = true;

    currentLevelRef.current = levelNumber;
    setCurrentLevel(levelNumber);
    setIsPlaying(true);
    setGameOver(false);

    await playBgIfNeeded(levelNumber, sessionId);
    if (!isActiveRef.current || sessionIdRef.current !== sessionId) return;

    const config = LEVELS_CONFIG[levelNumber];
    setTimeout(() => {
      if (isActiveRef.current && sessionIdRef.current === sessionId) {
        spawnBubble(levelNumber, sessionId);
      }
    }, 600);

    spawnTimerRef.current = setInterval(() => {
      spawnBubble(levelNumber, sessionId);
    }, config.spawnIntervalMs);
  };

  const handlePop = async (id, hasSound) => {
    if (!isActiveRef.current) return;
    setBubbles((prev) => prev.filter((b) => b.id !== id));

    if (hasSound) {
      setScore((p) => {
        const n = p + 1;
        unlockIfScore(UNLOCK_KEY, currentLevelRef.current, n, UNLOCK_SCORE, setUnlocked);
        return n;
      });
      return;
    }

    const nextMistakes = mistakesRef.current + 1;
    mistakesRef.current = nextMistakes;
    setMistakes(nextMistakes);

    playFx('error');

    if (nextMistakes >= MAX_MISTAKES) {
      await endGame();
    }
  };

  const handleMiss = (id, hasSound) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
    if (hasSound && isActiveRef.current) {
      setMissedSoundBubbles((p) => p + 1);
    }
  };

  const togglePause = async () => {
    setIsPaused((prev) => {
      const next = !prev;
      isPausedRef.current = next;
      if (bgSoundRef.current) {
        if (next) bgSoundRef.current.pauseAsync().catch(() => {});
        else bgSoundRef.current.playAsync().catch(() => {});
      }
      return next;
    });
  };

  const accuracy =
    totalSoundBubbles > 0
      ? Math.round((score / totalSoundBubbles) * 100)
      : 0;

  useRecordGameSession(gameOver, {
    gameId: GAME_IDS.bubbles,
    level: currentLevel,
    endedReason: 'hearts',
    correct: score,
    total: totalSoundBubbles,
    accuracy,
    extra: { missedSoundBubbles, mistakes },
  });

  // ========== قائمة المستويات ==========
  if (currentLevel === null && !gameOver) {
    return (
      <SoftSkyBackdrop>
        <SafeAreaView style={styles.menuSafe}>
          <ScrollView
            contentContainerStyle={[styles.menuScroll, { paddingTop: topSafe + 16 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.heroMascot}>
              <Image source={BAYAN.bubbles} style={styles.mascotFill} resizeMode="cover" />
            </View>
            <Text style={styles.titleBig}>صيد الفقاعات</Text>
            <Text style={styles.subtitle}>
              اسمع الصوت… ثم اضغط الفقاعة بسرعة!
            </Text>
            <View style={styles.hintPill}>
              <Text style={styles.hintPillText}>
                لديك {MAX_MISTAKES} قلوب — لا تضغط الفقاعات الصامتة
              </Text>
            </View>

            <View style={styles.levelsContainer}>
              {[1, 2, 3, 4].map((level) => {
                const cfg = LEVELS_CONFIG[level];
                const locked = isLevelLocked(level, unlocked);
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.levelBtn,
                      { backgroundColor: cfg.color, borderColor: cfg.border },
                      locked && styles.levelBtnLocked,
                    ]}
                    onPress={() => startLevel(level)}
                    activeOpacity={0.85}
                  >
                    {locked ? (
                      <Ionicons name="lock-closed" size={22} color="#fff" />
                    ) : (
                      <Text style={styles.levelEmoji}>{cfg.emoji}</Text>
                    )}
                    <View style={styles.levelTextCol}>
                      <Text style={styles.levelBtnText}>{cfg.title}</Text>
                      <Text style={styles.levelDesc}>
                        {locked ? 'أكمل المستوى السابق للفتح' : cfg.desc}
                      </Text>
                    </View>
                    <Text style={styles.levelArrow}>◀</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.outlineButton} onPress={handleFullExit}>
              <Text style={styles.outlineButtonText}>العودة للقائمة</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </SoftSkyBackdrop>
    );
  }

  // ========== نهاية الجولة ==========
  if (gameOver) {
    return (
      <SoftSkyBackdrop>
        <SafeAreaView style={styles.menuSafe}>
          <ScrollView
            contentContainerStyle={[styles.menuScroll, { paddingTop: topSafe + 16 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroMascot}>
              <Image source={BAYAN.cheer} style={styles.mascotFill} resizeMode="cover" />
            </View>
            <Text style={styles.titleBig}>أحسنت المحاولة!</Text>
            <Text style={styles.subtitle}>انتهت القلوب — انظر نتيجتك</Text>
            <GameStatsPanel
              headline={`أصبت ${score} فقاعة صوتية`}
              rows={[
                { icon: '🎯', label: 'الفقاعات التي أصبتها', value: score, highlight: true },
                { icon: '🔊', label: 'كل الفقاعات الصوتية', value: totalSoundBubbles },
                { icon: '💨', label: 'فقاعات أفلتت', value: missedSoundBubbles },
                { icon: '🙈', label: 'ضغطات خاطئة', value: mistakes },
                { icon: '✨', label: 'دقتك', value: `${accuracy}%` },
              ]}
            />

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => currentLevel != null && startLevel(currentLevel)}
            >
              <Text style={styles.btnText}>العب مرة أخرى 🎮</Text>
            </TouchableOpacity>

            {currentLevel != null &&
              currentLevel < MAX_LEVEL &&
              (!LOCK_LEVELS || unlocked >= currentLevel + 1) && (
                <TouchableOpacity
                  style={[styles.btnPrimary, { marginTop: 10 }]}
                  onPress={() => startLevel(currentLevel + 1)}
                >
                  <Text style={styles.btnText}>المستوى التالي</Text>
                </TouchableOpacity>
              )}

            <TouchableOpacity
              style={[styles.outlineButton, { marginTop: 12 }]}
              onPress={resetToLevelSelect}
            >
              <Text style={styles.outlineButtonText}>اختيار مستوى آخر</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </SoftSkyBackdrop>
    );
  }

  // ========== اللعب ==========
  const config = LEVELS_CONFIG[currentLevel] || LEVELS_CONFIG[1];
  const gameBody = (
    <View style={styles.gameContainer}>
      <View style={[styles.header, { paddingTop: topSafe }]}>
        <TouchableOpacity style={styles.exitBtn} onPress={confirmLevelExit}>
          <Text style={styles.exitBtnText}>إيقاف وخروج</Text>
        </TouchableOpacity>

        <View style={styles.hudCard}>
          <Text style={styles.hudScore}>⭐ {score}</Text>
          <HeartsRow mistakes={mistakes} max={MAX_MISTAKES} />
        </View>

        <TouchableOpacity style={styles.pauseBtn} onPress={togglePause}>
          <Text style={styles.pauseBtnText}>{isPaused ? '▶' : '⏸'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.levelChip}>
        <Text style={styles.levelChipText}>
          {config.emoji} المستوى {currentLevel}
        </Text>
      </View>

      <View style={styles.tipBanner} pointerEvents="none">
        <Text style={styles.tipText}>👂 اضغط فقط الفقاعة التي تسمع صوتها</Text>
      </View>

      {config.dualSources && (
        <View style={styles.sourcesRow} pointerEvents="none">
          <View style={styles.sourceVent}>
            <Text style={styles.sourceEmoji}>💨</Text>
            <Text style={styles.sourceLabel}>مصدر</Text>
          </View>
          <View style={styles.sourceVent}>
            <Text style={styles.sourceEmoji}>💨</Text>
            <Text style={styles.sourceLabel}>مصدر</Text>
          </View>
        </View>
      )}

      {bubbles.map((b) => (
        <Bubble
          key={b.id}
          id={b.id}
          hasSound={b.hasSound}
          x={b.x}
          durationMs={b.durationMs}
          colorPair={b.colorPair}
          onPop={handlePop}
          onMiss={handleMiss}
          isPaused={isPaused}
        />
      ))}

      {isPaused && (
        <View style={styles.pausedOverlay}>
          <Text style={styles.pausedEmoji}>🫧</Text>
          <Text style={styles.pausedText}>استراحة قصيرة</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={togglePause}>
            <Text style={styles.btnText}>متابعة اللعب</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (config.hasThemeBackground) {
    if (LEVEL4_BACKGROUND_IMAGE) {
      return (
        <ImageBackground
          source={LEVEL4_BACKGROUND_IMAGE}
          style={styles.flex}
          resizeMode="cover"
        >
          <SafeAreaView style={styles.flex}>{gameBody}</SafeAreaView>
        </ImageBackground>
      );
    }
    return (
      <OceanBackdrop>
        <SafeAreaView style={styles.flex}>{gameBody}</SafeAreaView>
      </OceanBackdrop>
    );
  }

  return (
    <SoftSkyBackdrop deep>
      <SafeAreaView style={styles.flex}>{gameBody}</SafeAreaView>
    </SoftSkyBackdrop>
  );
}

function StatRow({ label, value, highlight, icon }) {
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statValue, highlight && styles.statHighlight]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>
        {icon ? `${icon} ` : ''}
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  menuSafe: {
    flex: 1,
  },
  menuScroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  skyRoot: {
    flex: 1,
    backgroundColor: '#e9f9ff',
  },
  skyRootDeep: {
    backgroundColor: '#cfefff',
  },
  skyBlobA: {
    position: 'absolute',
    top: -70,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(120, 210, 255, 0.35)',
  },
  skyBlobB: {
    position: 'absolute',
    bottom: 60,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(140, 230, 180, 0.25)',
  },
  skyBlobC: {
    position: 'absolute',
    top: '40%',
    right: 20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 220, 120, 0.22)',
  },

  heroEmoji: { fontSize: 52, marginBottom: 4 },
  heroMascot: {
    width: 150,
    height: 150,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 6,
  },
  mascotFill: {
    width: '100%',
    height: '100%',
  },
  titleBig: {
    fontSize: 32,
    fontWeight: '900',
    color: '#176b7a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4f8793',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  hintPill: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 18,
    borderBottomWidth: 3,
    borderColor: '#d7eef4',
  },
  hintPillText: {
    color: '#3d7080',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  levelsContainer: { width: '100%', marginBottom: 14 },
  levelBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderBottomWidth: 5,
    marginBottom: 12,
  },
  levelBtnLocked: { opacity: 0.55 },
  levelEmoji: { fontSize: 28, marginLeft: 10 },
  levelTextCol: { flex: 1, alignItems: 'flex-end' },
  levelBtnText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  levelDesc: { color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 2 },
  levelArrow: { color: 'rgba(255,255,255,0.75)', fontSize: 16, marginRight: 2 },

  outlineButton: {
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#d5e8ee',
    borderBottomWidth: 4,
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  outlineButtonText: { color: '#6a9099', fontSize: 16, fontWeight: '700' },
  btnPrimary: {
    backgroundColor: '#8cc63f',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 22,
    borderBottomWidth: 5,
    borderColor: '#6fa32e',
  },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  gameContainer: { flex: 1, position: 'relative' },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 4,
    zIndex: 40,
  },
  exitBtn: {
    backgroundColor: '#ff5a5a',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderBottomWidth: 4,
    borderColor: '#d64545',
  },
  exitBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  pauseBtn: {
    backgroundColor: '#ffc44d',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderColor: '#e0a82e',
  },
  pauseBtnText: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  hudCard: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderColor: '#e4f2f6',
    minWidth: 110,
  },
  hudScore: {
    fontSize: 18,
    fontWeight: '900',
    color: '#176b7a',
    marginBottom: 2,
  },
  heartsRow: { flexDirection: 'row', gap: 2 },
  heart: { fontSize: 16 },
  heartLost: { opacity: 0.55 },

  levelChip: {
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    borderBottomWidth: 3,
    borderColor: '#d7eef4',
    zIndex: 35,
  },
  levelChipText: {
    color: '#176b7a',
    fontWeight: '800',
    fontSize: 14,
  },
  tipBanner: {
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(255, 210, 70, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomWidth: 3,
    borderColor: '#e0a82e',
    zIndex: 35,
  },
  tipText: {
    color: '#5a4300',
    fontWeight: '800',
    fontSize: 13,
  },

  sourcesRow: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_W * 0.07,
    zIndex: 1,
  },
  sourceVent: {
    width: 78,
    height: 52,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    backgroundColor: 'rgba(25, 110, 140, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  sourceEmoji: { fontSize: 16 },
  sourceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '800',
  },

  bubbleWrap: {
    position: 'absolute',
    zIndex: 30,
    elevation: 30,
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    borderWidth: 3,
    overflow: 'hidden',
    shadowColor: '#1a6b7a',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 8,
  },
  bubbleInnerGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    opacity: 0.45,
  },
  bubbleShine: {
    position: 'absolute',
    top: 12,
    left: 14,
    width: 20,
    height: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    transform: [{ rotate: '-22deg' }],
  },
  bubbleShineSmall: {
    position: 'absolute',
    top: 28,
    left: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },

  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 45, 55, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
  },
  pausedEmoji: { fontSize: 48, marginBottom: 8 },
  pausedText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 20,
  },

  statsBox: {
    width: '100%',
    backgroundColor: '#1a6b7a',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 22,
    marginTop: 4,
  },
  statsLevel: {
    marginTop: 12,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '800',
  },
  statRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
    fontWeight: '600',
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    minWidth: 48,
    textAlign: 'left',
  },
  statHighlight: { color: '#7dffb3', fontSize: 24 },

  oceanRoot: { flex: 1, backgroundColor: '#06364a' },
  oceanLayer: { ...StyleSheet.absoluteFillObject },
  oceanDeep: { backgroundColor: '#042f40' },
  oceanMid: {
    top: '28%',
    backgroundColor: 'rgba(20, 110, 140, 0.55)',
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
  },
  oceanLight: {
    top: '55%',
    backgroundColor: 'rgba(50, 170, 190, 0.35)',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
  oceanGlow: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(120, 220, 255, 0.12)',
  },
  oceanFish: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    fontSize: 22,
    opacity: 0.55,
  },
});
