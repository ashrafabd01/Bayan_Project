import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  Image,
  BackHandler,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useGameSafeTop from '../../../hooks/useGameSafeTop';
import GameNatureBackdrop from '../../../components/GameNatureBackdrop';
import GameStatsPanel from '../../../components/GameStatsPanel';
import {
  clearTimer,
  configureGameAudio,
  playSound,
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
import { GAME_IDS, useRecordGameSession } from '../../../utils/gameStatsStore';

const { width: SCREEN_W } = Dimensions.get('window');

const BAYAN = {
  listen: require('../../../assets/img/bayan-listen.png'),
  cheer: require('../../../assets/img/bayan-cheer.png'),
};

// مشهد الحديقة (السابق) + مشهد الشارع (جديد) — يُختار أحدهما عشوائياً عند بدء المستوى
const GARDEN_SCENE = {
  id: 'garden',
  background: require('../../../assets/img/focus/focus-garden.png'),
  images: [
    require('../../../assets/img/focus/focus-bg.png'), // فهرس 0 للخلفية فقط
    require('../../../assets/img/focus/focus-cat.png'),
    require('../../../assets/img/focus/focus-dog.png'),
    require('../../../assets/img/focus/focus-bird.png'),
    require('../../../assets/img/cards/card-horse.png'),
    require('../../../assets/img/focus/focus-bus.png'),
  ],
  sounds: [
    require('../../../assets/audio/forrest-sound.mp3'),
    require('../../../assets/audio/cat-sound.mp3'),
    require('../../../assets/audio/dog-sound.mp3'), // بديل مؤقت لصوت الكلب
    require('../../../assets/audio/bird-sound.mp3'),
    require('../../../assets/audio/horse-sound.mp3'),
    require('../../../assets/audio/car-sound.mp3'),
  ],
};

const STREET_SCENE = {
  id: 'street',
  background: require('../../../assets/img/focus/focus-street.png'),
  images: [
    require('../../../assets/img/focus/focus-street.png'), // فهرس 0 للخلفية فقط
    require('../../../assets/img/focus/focus-motorcycle.png'),
    require('../../../assets/img/focus/focus-taxi.png'),
    require('../../../assets/img/focus/focus-plane.png'),
    require('../../../assets/img/focus/focus-bike.png'),
    require('../../../assets/img/focus/focus-police.png'),
  ],
  sounds: [
    require('../../../assets/audio/street-sound.mp3'),
    require('../../../assets/audio/motorcycle-sound.mp3'),
    require('../../../assets/audio/car-sound.mp3'),
    require('../../../assets/audio/rocket-sound.mp3'),
    require('../../../assets/audio/bell-sound.mp3'),
    require('../../../assets/audio/police-sound.mp3'),
  ],
};

const GAME_SCENES = [GARDEN_SCENE, STREET_SCENE];

function pickRandomScene() {
  return GAME_SCENES[Math.floor(Math.random() * GAME_SCENES.length)];
}

// توقيتات الجولة (ميلي ثانية)
const ANSWER_TIMEOUT_MS = 5000; // مهلة الطفل للإجابة
const NEXT_ROUND_DELAY_MS = 2000; // مدة عرض النتيجة
const FIRST_ROUND_DELAY_MS = 1000; // مهلة قبل أول صوت
const UNLOCK_SCORE = 8; // 8 من 10 لفتح المستوى التالي
const ATTEMPTS = 10;
const UNLOCK_KEY = UNLOCK_KEYS.focus;

const LEVELS_CONFIG = {
  1: {
    objectsCount: 3,
    hasBgSound: false,
    hasVisualCue: true,
    emoji: '🌱',
    title: 'المستوى 1',
    desc: 'هدوء + مساعدة بصرية',
    color: '#8cc63f',
    border: '#6fa32e',
  },
  2: {
    objectsCount: 3,
    hasBgSound: true,
    hasVisualCue: true,
    emoji: '🌿',
    title: 'المستوى 2',
    desc: 'ضوضاء + مساعدة بصرية',
    color: '#1cb0f6',
    border: '#1899d6',
  },
  3: {
    objectsCount: 3,
    hasBgSound: true,
    hasVisualCue: false,
    emoji: '🌳',
    title: 'المستوى 3',
    desc: 'ضوضاء بدون مساعدة',
    color: '#ff9600',
    border: '#e08600',
  },
  4: {
    objectsCount: 5,
    hasBgSound: true,
    hasVisualCue: false,
    emoji: '🏆',
    title: 'المستوى 4',
    desc: '5 أجسام — تحدٍ أكبر!',
    color: '#ce82ff',
    border: '#a866d9',
  },
};

function ListeningPulse({ active }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.12,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, scale]);

  if (!active) return null;

  return (
    <Animated.View style={[styles.listenBadge, { transform: [{ scale }] }]}>
      <Text style={styles.listenEmoji}>👂</Text>
      <Text style={styles.listenText}>استمع جيداً… ثم اضغط!</Text>
    </Animated.View>
  );
}

function CuePulse({ children, active }) {
  const border = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      border.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(border, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(border, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, border]);

  const borderColor = border.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ff4b4b', '#ffc800'],
  });

  if (!active) return children;

  return (
    <Animated.View style={[styles.cueRing, { borderColor }]}>
      {children}
    </Animated.View>
  );
}

export default function FocusEarGame({ onBackPress }) {
  const router = useRouter();
  const topSafe = useGameSafeTop();
  const [currentLevel, setCurrentLevel] = useState(null);
  const [targetObject, setTargetObject] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [unlocked, setUnlocked] = useState(1);
  const [activeScene, setActiveScene] = useState(GARDEN_SCENE);
  const activeSceneRef = useRef(GARDEN_SCENE);

  const bgSoundRef = useRef(null);
  const objSoundRef = useRef(null);
  const timerRef = useRef(null);
  const nextRoundTimerRef = useRef(null);
  const isActiveRef = useRef(false);
  const sessionIdRef = useRef(0);
  const currentLevelRef = useRef(null);
  const attemptsRef = useRef(0);
  const onBackPressRef = useRef(onBackPress);
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    onBackPressRef.current = onBackPress;
  }, [onBackPress]);

  useEffect(() => {
    currentLevelRef.current = currentLevel;
  }, [currentLevel]);

  const stopAllSoundsAndTimers = useCallback(async () => {
    isActiveRef.current = false;
    sessionIdRef.current += 1;
    clearTimer(timerRef);
    clearTimer(nextRoundTimerRef);
    await releaseSounds(bgSoundRef, objSoundRef);
  }, []);

  const resetToStart = useCallback(async () => {
    await stopAllSoundsAndTimers();
    currentLevelRef.current = null;
    activeSceneRef.current = GARDEN_SCENE;
    setActiveScene(GARDEN_SCENE);
    setCurrentLevel(null);
    setTargetObject(null);
    setFeedback(null);
    setScore(0);
    setAttempts(0);
    attemptsRef.current = 0;
    setSessionDone(false);
  }, [stopAllSoundsAndTimers]);

  const handleFullExit = useCallback(async () => {
    // أوقف اعتراض الرجوع فوراً قبل التنقل
    isActiveRef.current = false;
    currentLevelRef.current = null;
    setCurrentLevel(null);
    setTargetObject(null);
    setFeedback(null);

    await resetToStart();
    if (onBackPressRef.current) {
      onBackPressRef.current();
    } else {
      router.replace('/games');
    }
  }, [resetToStart, router]);

  const handleLevelExit = useCallback(async () => {
    await resetToStart();
  }, [resetToStart]);

  // زر «إيقاف وخروج» داخل اللعب فقط — بدون سؤال مغادرة عام
  const confirmLevelExit = useCallback(() => {
    if (currentLevelRef.current == null || !isActiveRef.current) return;

    Alert.alert(
      'إيقاف وخروج؟',
      'هل تريد إيقاف الأصوات والعودة لاختيار المستويات؟',
      [
        { text: 'أكمل اللعب', style: 'cancel' },
        {
          text: 'إيقاف وخروج',
          style: 'destructive',
          onPress: () => handleLevelExit(),
        },
      ],
      { cancelable: true }
    );
  }, [handleLevelExit]);

  // تنظيف واحد يُستخدم عند تفريغ المكوّن وعند مغادرة الشاشة
  const teardown = useCallback(() => {
    isActiveRef.current = false;
    sessionIdRef.current += 1;
    clearTimer(timerRef);
    clearTimer(nextRoundTimerRef);
    releaseSounds(bgSoundRef, objSoundRef);
  }, []);

  useEffect(() => {
    configureGameAudio();
    return teardown;
  }, [teardown]);

  useEffect(() => {
    loadUnlocked(UNLOCK_KEY).then(setUnlocked).catch(() => {});
  }, []);

  // اعتراض الرجوع فقط أثناء اللعب + أثناء تركيز الشاشة
  useFocusEffect(
    useCallback(() => {
      if (currentLevel == null) return undefined;

      const onHardwareBackPress = () => {
        if (sessionDone) {
          handleLevelExit();
          return true;
        }
        if (currentLevelRef.current == null || !isActiveRef.current) return false;
        confirmLevelExit();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onHardwareBackPress
      );
      return () => subscription.remove();
    }, [currentLevel, sessionDone, confirmLevelExit, handleLevelExit])
  );

  // عند مغادرة الشاشة: أوقف الأصوات فوراً
  useFocusEffect(useCallback(() => teardown, [teardown]));

  const startNewRoundRef = useRef(async () => {});
  const showFeedbackRef = useRef(() => {});

  startNewRoundRef.current = async (levelNumber, sessionId) => {
    const isStale = () =>
      !isActiveRef.current || sessionIdRef.current !== sessionId;
    if (isStale() || !LEVELS_CONFIG[levelNumber]) return;

    setFeedback(null);
    feedbackAnim.setValue(0);

    // نختار جسماً عشوائياً ونشغّل صوته وحده — على الطفل تحديد مصدره
    const config = LEVELS_CONFIG[levelNumber];
    const targetIndex = Math.floor(Math.random() * config.objectsCount) + 1;
    setTargetObject(targetIndex);

    await playSound(objSoundRef, activeSceneRef.current.sounds[targetIndex], {
      isStale,
    });
    if (isStale()) return;

    // مهلة الإجابة: بعدها تُحسب الجولة خطأ
    timerRef.current = setTimeout(() => {
      if (isStale()) return;
      showFeedbackRef.current('error', levelNumber, sessionId);
    }, ANSWER_TIMEOUT_MS);
  };

  showFeedbackRef.current = (type, levelNumber, sessionId) => {
    if (!isActiveRef.current || sessionIdRef.current !== sessionId) return;

    setFeedback(type);
    setTargetObject(null);
    attemptsRef.current += 1;
    const nAttempts = attemptsRef.current;
    setAttempts(nAttempts);
    if (type === 'success') {
      setScore((s) => {
        const n = s + 1;
        unlockIfScore(UNLOCK_KEY, levelNumber, n, UNLOCK_SCORE, setUnlocked);
        return n;
      });
    }

    feedbackAnim.setValue(0);
    Animated.spring(feedbackAnim, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();

    nextRoundTimerRef.current = setTimeout(() => {
      if (!isActiveRef.current || sessionIdRef.current !== sessionId) return;
      if (nAttempts >= ATTEMPTS) {
        isActiveRef.current = false;
        releaseSounds(bgSoundRef, objSoundRef);
        setSessionDone(true);
        return;
      }
      const level = levelNumber ?? currentLevelRef.current;
      if (level == null) return;
      startNewRoundRef.current(level, sessionId);
    }, NEXT_ROUND_DELAY_MS);
  };

  const startLevel = useCallback(
    async (levelNumber) => {
      if (!LEVELS_CONFIG[levelNumber]) return;
      if (isLevelLocked(levelNumber, unlocked)) {
        lockAlert();
        return;
      }

      await stopAllSoundsAndTimers();
      const sessionId = sessionIdRef.current + 1;
      sessionIdRef.current = sessionId;
      isActiveRef.current = true;

      currentLevelRef.current = levelNumber;
      setCurrentLevel(levelNumber);
      setFeedback(null);
      setTargetObject(null);
      setScore(0);
      setAttempts(0);
      attemptsRef.current = 0;
      setSessionDone(false);

      // المشهد يُختار عشوائياً مرة واحدة ويبقى ثابتاً لكل جولات المستوى
      const scene = pickRandomScene();
      activeSceneRef.current = scene;
      setActiveScene(scene);

      const isStale = () =>
        !isActiveRef.current || sessionIdRef.current !== sessionId;

      // ضوضاء المكان (فهرس 0) تزيد صعوبة التمييز في المستويات المتقدمة
      if (LEVELS_CONFIG[levelNumber].hasBgSound) {
        await playSound(bgSoundRef, scene.sounds[0], {
          loop: true,
          volume: 0.3,
          isStale,
        });
      }
      if (isStale()) return;

      nextRoundTimerRef.current = setTimeout(() => {
        startNewRoundRef.current(levelNumber, sessionId);
      }, FIRST_ROUND_DELAY_MS);
    },
    [stopAllSoundsAndTimers, unlocked]
  );

  const handleObjectPress = async (index) => {
    if (feedback !== null || !isActiveRef.current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (objSoundRef.current) {
      try {
        await objSoundRef.current.stopAsync();
      } catch (_) {}
    }

    if (!isActiveRef.current) return;

    const sessionId = sessionIdRef.current;
    const levelNumber = currentLevelRef.current;
    if (index === targetObject) {
      showFeedbackRef.current('success', levelNumber, sessionId);
    } else {
      showFeedbackRef.current('error', levelNumber, sessionId);
    }
  };

  useRecordGameSession(sessionDone, {
    gameId: GAME_IDS.focus,
    level: currentLevel,
    endedReason: 'attempts',
    correct: score,
    total: ATTEMPTS,
  });
  if (currentLevel === null) {
    return (
      <GameNatureBackdrop>
        <SafeAreaView style={[styles.menuSafeClear, { paddingTop: topSafe }]}>
          <ScrollView
            contentContainerStyle={styles.menuScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.heroMascot}>
              <Image source={BAYAN.listen} style={styles.mascotFill} resizeMode="cover" />
            </View>
            <Text style={styles.titleBig}>أين مصدر الصوت؟</Text>
            <Text style={styles.subtitle}>
              اسمع جيداً… ثم اضغط على الصورة الصحيحة!
            </Text>

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
      </GameNatureBackdrop>
    );
  }

  // ========== إحصائيات نهاية المستوى ==========
  if (sessionDone) {
    return (
      <GameNatureBackdrop>
        <SafeAreaView style={[styles.menuSafeClear, { paddingTop: topSafe }]}>
          <ScrollView
            contentContainerStyle={styles.menuScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroMascot}>
              <Image source={BAYAN.cheer} style={styles.mascotFill} resizeMode="cover" />
            </View>
            <Text style={styles.titleBig}>انتهت المحاولات</Text>
            <GameStatsPanel
              headline={`أصبتَ ${score} من ${ATTEMPTS}`}
              rows={[
                { icon: '✅', label: 'إجابات صحيحة', value: score, highlight: true },
                { icon: '❌', label: 'إجابات خاطئة', value: ATTEMPTS - score },
                { icon: '🎯', label: 'كل المحاولات', value: ATTEMPTS },
              ]}
            />
            {currentLevel < MAX_LEVEL &&
              (!LOCK_LEVELS || unlocked >= currentLevel + 1) && (
                <TouchableOpacity
                  style={styles.outlineButton}
                  onPress={() => startLevel(currentLevel + 1)}
                >
                  <Text style={styles.outlineButtonText}>المستوى التالي</Text>
                </TouchableOpacity>
              )}
            <TouchableOpacity
              style={[styles.outlineButton, { marginTop: 10 }]}
              onPress={() => startLevel(currentLevel)}
            >
              <Text style={styles.outlineButtonText}>أعد هذا المستوى</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.outlineButton, { marginTop: 10 }]}
              onPress={handleLevelExit}
            >
              <Text style={styles.outlineButtonText}>اختيار مستوى آخر</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </GameNatureBackdrop>
    );
  }

  // ========== شاشة اللعب ==========
  const config = LEVELS_CONFIG[currentLevel];
  const visibleObjects = Array.from({ length: config.objectsCount }, (_, i) => i + 1);
  const isListening = feedback === null && targetObject !== null;

  return (
    <ImageBackground
      source={activeScene.background}
      style={styles.gameContainer}
      resizeMode="cover"
    >
      <View style={styles.gameDim} pointerEvents="none" />

      <SafeAreaView style={[styles.gameSafe, { paddingTop: topSafe }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.exitBtn}
            onPress={confirmLevelExit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.exitBtnText}>إيقاف وخروج</Text>
          </TouchableOpacity>

          <View style={styles.hudPill}>
            <Text style={styles.hudScore}>⭐ {score}</Text>
            <Text style={styles.hudLevel}>
              المستوى {currentLevel} · جولة {Math.min(attempts + 1, ATTEMPTS)}/{ATTEMPTS}
            </Text>
          </View>
        </View>

        <ListeningPulse active={isListening} />

        <View style={styles.objectsScene}>
          {/* العصفور (والباص إن وُجد) من الأعلى */}
          <View style={styles.objectsRowTop}>
            {visibleObjects
              .filter((id) => id === 3 || id === 5)
              .map((objIndex) => {
                const isTarget = objIndex === targetObject;
                const showCue = isTarget && config.hasVisualCue;
                return (
                  <CuePulse key={objIndex} active={showCue}>
                    <TouchableOpacity
                      style={[
                        styles.objectHit,
                        showCue && styles.visualCue,
                        feedback !== null && styles.objectDimmed,
                      ]}
                      onPress={() => handleObjectPress(objIndex)}
                      activeOpacity={0.85}
                      disabled={feedback !== null}
                    >
                      <Image
                        source={activeScene.images[objIndex]}
                        style={styles.objectImage}
                      />
                    </TouchableOpacity>
                  </CuePulse>
                );
              })}
          </View>

          {/* السيارات في الوسط (المستوى 4) */}
          {visibleObjects.some((id) => id === 4) && (
            <View style={styles.objectsRowMid}>
              {visibleObjects
                .filter((id) => id === 4)
                .map((objIndex) => {
                  const isTarget = objIndex === targetObject;
                  const showCue = isTarget && config.hasVisualCue;
                  return (
                    <CuePulse key={objIndex} active={showCue}>
                      <TouchableOpacity
                        style={[
                          styles.objectHit,
                          showCue && styles.visualCue,
                          feedback !== null && styles.objectDimmed,
                        ]}
                        onPress={() => handleObjectPress(objIndex)}
                        activeOpacity={0.85}
                        disabled={feedback !== null}
                      >
                        <Image
                          source={activeScene.images[objIndex]}
                          style={styles.objectImage}
                        />
                      </TouchableOpacity>
                    </CuePulse>
                  );
                })}
            </View>
          )}

          {/* القطة والكلب من الأسفل */}
          <View style={styles.objectsRowBottom}>
            {visibleObjects
              .filter((id) => id === 1 || id === 2)
              .map((objIndex) => {
                const isTarget = objIndex === targetObject;
                const showCue = isTarget && config.hasVisualCue;
                return (
                  <CuePulse key={objIndex} active={showCue}>
                    <TouchableOpacity
                      style={[
                        styles.objectHit,
                        showCue && styles.visualCue,
                        feedback !== null && styles.objectDimmed,
                      ]}
                      onPress={() => handleObjectPress(objIndex)}
                      activeOpacity={0.85}
                      disabled={feedback !== null}
                    >
                      <Image
                        source={activeScene.images[objIndex]}
                        style={styles.objectImage}
                      />
                    </TouchableOpacity>
                  </CuePulse>
                );
              })}
          </View>
        </View>

        {feedback === 'success' && (
          <Animated.View
            style={[
              styles.feedbackOverlay,
              styles.successBg,
              {
                opacity: feedbackAnim,
                transform: [
                  {
                    scale: feedbackAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.feedbackEmoji}>🌟🎉</Text>
            <Text style={styles.feedbackText}>أحسنت! إجابة رائعة</Text>
          </Animated.View>
        )}

        {feedback === 'error' && (
          <Animated.View
            style={[
              styles.feedbackOverlay,
              styles.errorBg,
              {
                opacity: feedbackAnim,
                transform: [
                  {
                    scale: feedbackAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.feedbackEmoji}>🙈</Text>
            <Text style={styles.feedbackText}>حاول مرة أخرى… اسمع جيداً</Text>
          </Animated.View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const CARD_W = Math.min(SCREEN_W - 40, 420);

const styles = StyleSheet.create({
  menuSafe: {
    flex: 1,
    backgroundColor: '#f7fbf8',
  },
  menuSafeClear: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
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
  menuScroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  menuDecorTop: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(140, 198, 63, 0.18)',
  },
  menuDecorBottom: {
    position: 'absolute',
    bottom: 40,
    left: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(28, 176, 246, 0.12)',
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 6,
  },
  titleBig: {
    fontSize: 32,
    fontWeight: '900',
    color: '#102818',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#1a3324',
    fontWeight: '700',
    marginBottom: 22,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
    textShadowColor: 'rgba(255,255,255,0.92)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  levelsContainer: {
    width: CARD_W,
    marginBottom: 16,
  },
  levelBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderBottomWidth: 5,
    marginBottom: 12,
  },
  levelBtnLocked: { opacity: 0.55 },
  levelEmoji: {
    fontSize: 28,
    marginLeft: 10,
  },
  levelTextCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  levelBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  levelDesc: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 2,
  },
  levelArrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginRight: 4,
  },
  outlineButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#d5eadc',
    borderBottomWidth: 4,
    width: CARD_W,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  outlineButtonText: {
    color: '#7a9a82',
    fontSize: 16,
    fontWeight: '700',
  },

  gameContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gameDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 50, 40, 0.12)',
  },
  gameSafe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    zIndex: 20,
  },
  exitBtn: {
    backgroundColor: '#ff4b4b',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderBottomWidth: 4,
    borderColor: '#cc3c3c',
  },
  exitBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  hudPill: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderColor: '#e8e8e8',
  },
  hudScore: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2d5a27',
  },
  hudLevel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7a9a82',
    marginTop: 2,
  },

  listenBadge: {
    alignSelf: 'center',
    marginTop: 14,
    backgroundColor: 'rgba(255, 200, 0, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 22,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 4,
    borderColor: '#e0a800',
    zIndex: 15,
  },
  listenEmoji: { fontSize: 22 },
  listenText: {
    color: '#4a3b00',
    fontWeight: '800',
    fontSize: 15,
  },

  objectsScene: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 16,
  },
  objectsRowTop: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 22,
  },
  objectsRowMid: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    marginVertical: 6,
  },
  objectsRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    gap: 12,
  },
  cueRing: {
    borderRadius: 999,
    borderWidth: 3,
    padding: 3,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  objectHit: {
    width: 148,
    height: 148,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 999,
    overflow: 'hidden',
  },
  visualCue: {
    backgroundColor: 'transparent',
  },
  objectDimmed: {
    opacity: 0.5,
  },
  objectImage: {
    width: 148,
    height: 148,
    resizeMode: 'cover',
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },

  feedbackOverlay: {
    position: 'absolute',
    bottom: '18%',
    alignSelf: 'center',
    paddingVertical: 22,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    width: '84%',
    maxWidth: 360,
    borderBottomWidth: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  successBg: {
    backgroundColor: '#8cc63f',
    borderColor: '#6fa32e',
  },
  errorBg: {
    backgroundColor: '#ff9600',
    borderColor: '#e08600',
  },
  feedbackEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  feedbackText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
});
