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
  releaseSound,
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
import {
  hydrateLearnedCards,
  loadCurrentLearnedIds,
  saveLearnedCards,
} from '../../../utils/learnedCardsStore';

const { brand } = Colors;

// ==========================================
// مجموعة البطاقات الكاملة — أضف هنا بطاقات جديدة لاحقاً
// شاشة التعلم تختار LEARN_COUNT منها عشوائياً
// ==========================================
const CARD_DECK = [
  {
    id: 'horse',
    name: 'حصان',
    emoji: '🐴',
    image: require('../../../assets/img/cards/card-horse.png'),
    sound: require('../../../assets/audio/horse-sound.mp3'),
  },
  {
    id: 'cat',
    name: 'قطة',
    emoji: '🐱',
    image: require('../../../assets/img/cards/card-cat.png'),
    sound: require('../../../assets/audio/cat-sound.mp3'),
  },
  {
    id: 'car',
    name: 'سيارة',
    emoji: '🚗',
    image: require('../../../assets/img/cards/card-car.png'),
    sound: require('../../../assets/audio/car-sound.mp3'),
  },
  {
    id: 'bell',
    name: 'جرس',
    emoji: '🔔',
    image: require('../../../assets/img/cards/card-bell.png'),
    sound: require('../../../assets/audio/bell-sound.mp3'),
  },
  {
    id: 'bird',
    name: 'عصفور',
    emoji: '🐦',
    image: require('../../../assets/img/cards/card-bird.png'),
    sound: require('../../../assets/audio/bird-sound.mp3'),
  },
];

const LEARN_COUNT = 4;
const ATTEMPTS = 10;
const UNLOCK_SCORE = 8; // 8 من 10 لفتح المستوى التالي
const UNLOCK_KEY = UNLOCK_KEYS.cards;

const BIBI = {
  main: require('../../../assets/img/bayan-cards.png'),
  listen: require('../../../assets/img/bayan-listen.png'),
  cheer: require('../../../assets/img/bayan-cheer.png'),
  think: require('../../../assets/img/bayan-think.png'),
  cards: require('../../../assets/img/bayan-cards.png'),
};

const BG_NOISE = require('../../../assets/audio/forrest-sound.mp3');

const LEVELS = {
  1: {
    title: 'المستوى 1',
    desc: 'صوت واحد — اختر البطاقة الصحيحة',
    emoji: '🌱',
    sequenceLength: 1,
    hasBgNoise: false,
    color: brand.green,
    border: brand.greenDark,
  },
  2: {
    title: 'المستوى 2',
    desc: 'صوتان — اضغط بالترتيب',
    emoji: '🌿',
    sequenceLength: 2,
    hasBgNoise: false,
    color: brand.sky,
    border: brand.skyDark,
  },
  3: {
    title: 'المستوى 3',
    desc: 'ثلاثة أصوات — بالترتيب',
    emoji: '🌳',
    sequenceLength: 3,
    hasBgNoise: false,
    color: '#ff9600',
    border: '#e08600',
  },
  4: {
    title: 'المستوى 4',
    desc: 'ثلاثة أصوات + ضوضاء خلفية',
    emoji: '🏆',
    sequenceLength: 3,
    hasBgNoise: true,
    color: '#ce82ff',
    border: '#a866d9',
  },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr, count) {
  return shuffle(arr).slice(0, Math.min(count, arr.length));
}

/** وجه البطاقة في شاشة التعلّم: صورة إن وُجدت، وإلا الإيموجي البديل */
function CardFace({ card }) {
  if (card.image) {
    return <Image source={card.image} style={styles.cardImage} resizeMode="cover" />;
  }
  return <Text style={styles.cardEmoji}>{card.emoji}</Text>;
}

export default function LevelThree() {
  const router = useRouter();
  const topSafe = useGameSafeTop();

  // home | learn | levels | play | feedback
  const [screen, setScreen] = useState('home');
  const [learnedCards, setLearnedCards] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [sequence, setSequence] = useState([]); // بطاقات الصوت بالترتيب
  const [stepIndex, setStepIndex] = useState(0); // أي صوت ننتظر اختياره
  const [pickedIds, setPickedIds] = useState([]);
  const [feedback, setFeedback] = useState(null); // success | error
  const [isPlayingSeq, setIsPlayingSeq] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [unlocked, setUnlocked] = useState(1);

  const soundRef = useRef(null);
  const bgRef = useRef(null);
  const sessionRef = useRef(0);
  const activeRef = useRef(true);
  const pulse = useRef(new Animated.Value(1)).current;

  // زيادة رقم الجلسة تُلغي أي تسلسل صوتي قيد التشغيل
  const stopAllAudio = useCallback(async () => {
    sessionRef.current += 1;
    await releaseSounds(soundRef, bgRef);
  }, []);

  useEffect(() => {
    configureGameAudio();
    loadUnlocked(UNLOCK_KEY).then(setUnlocked).catch(() => {});
    loadCurrentLearnedIds()
      .then((ids) => {
        const cards = hydrateLearnedCards(ids, CARD_DECK);
        if (cards.length) setLearnedCards(cards);
      })
      .catch(() => {});
    return () => {
      activeRef.current = false;
      releaseSounds(soundRef, bgRef);
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
                await stopAllAudio();
                setScreen('levels');
                setCurrentLevel(null);
                setFeedback(null);
              },
            },
          ]);
          return true;
        }
        if (screen === 'levels') {
          setScreen('home');
          return true;
        }
        if (screen === 'learn') {
          setScreen('home');
          return true;
        }
        router.replace('/games');
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [screen, stopAllAudio, router])
  );

  useEffect(() => {
    if (!isPlayingSeq) {
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
  }, [isPlayingSeq, pulse]);

  /** يشغّل مقطعاً واحداً وينتظر انتهاءه قبل المتابعة */
  const playOne = async (source) => {
    const sound = await playSound(soundRef, source);
    await waitForFinish(sound);
  };

  const playCardSound = (card) => playOne(card.sound);

  const startLearnSession = () => {
    setLearnedCards(pickRandom(CARD_DECK, LEARN_COUNT));
    setScreen('learn');
  };

  /** يسمّع أصوات الجولة بالترتيب؛ يتوقف فوراً إن بدأت جلسة جديدة */
  const playSequence = async (seq, levelNumber) => {
    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    const isStale = () => sessionRef.current !== sessionId || !activeRef.current;

    setIsPlayingSeq(true);
    try {
      if (LEVELS[levelNumber]?.hasBgNoise) {
        await playSound(bgRef, BG_NOISE, { loop: true, volume: 0.28, isStale });
      } else {
        await releaseSound(bgRef);
      }

      for (const card of seq) {
        if (isStale()) return;
        await playOne(card.sound);
        if (isStale()) return;
        await new Promise((r) => setTimeout(r, 350)); // فاصل قصير بين الأصوات
      }
    } finally {
      if (sessionRef.current === sessionId) setIsPlayingSeq(false);
    }
  };

  const beginRound = async (levelNumber, cards, { resetScore = false } = {}) => {
    await stopAllAudio();
    if (resetScore) {
      setScore(0);
      setAttempts(0);
    }
    setCurrentLevel(levelNumber);
    const cfg = LEVELS[levelNumber];
    const len = Math.min(cfg.sequenceLength, cards.length);
    const seq = pickRandom(cards, len);
    setSequence(seq);
    setStepIndex(0);
    setPickedIds([]);
    setFeedback(null);
    setScreen('play');
    setTimeout(() => playSequence(seq, levelNumber), 350);
  };

  const startLevel = async (levelNumber) => {
    if (isLevelLocked(levelNumber, unlocked)) {
      lockAlert();
      return;
    }
    if (learnedCards.length < LEARN_COUNT) {
      Alert.alert('بيان يقول', 'تعلّم الأصوات أولاً ثم ابدأ التحدي! 🦜');
      return;
    }
    await beginRound(levelNumber, learnedCards, { resetScore: true });
  };

  const startNextRound = async () => {
    await beginRound(currentLevel, learnedCards);
  };

  const retrySameRound = async () => {
    await releaseSound(soundRef);
    setStepIndex(0);
    setPickedIds([]);
    setFeedback(null);
    setScreen('play');
    setTimeout(() => playSequence(sequence, currentLevel), 300);
  };

  /** يتحقق من ترتيب الضغط: الجولة تُحسب محاولة عند الخطأ أو إكمال التسلسل */
  const finishAttempt = (ok) => {
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (ok) {
      setScore((s) => {
        const n = s + 1;
        unlockIfScore(UNLOCK_KEY, currentLevel, n, UNLOCK_SCORE, setUnlocked);
        return n;
      });
      setFeedback('success');
    } else {
      setFeedback('error');
    }
    setScreen(nextAttempts >= ATTEMPTS ? 'stats' : 'feedback');
  };

  const handleCardPress = (card) => {
    if (screen !== 'play' || isPlayingSeq || feedback || !sequence.length) return;

    if (card.id !== sequence[stepIndex].id) {
      finishAttempt(false);
      return;
    }

    setPickedIds((ids) => [...ids, card.id]);

    if (stepIndex + 1 >= sequence.length) {
      finishAttempt(true);
      return;
    }

    setStepIndex((i) => i + 1);
  };

  const exitToGames = async () => {
    await stopAllAudio();
    router.replace('/games');
  };

  useRecordGameSession(screen === 'stats', {
    gameId: GAME_IDS.cards,
    level: currentLevel,
    endedReason: 'attempts',
    correct: score,
    total: ATTEMPTS,
  });

  // ========== الرئيسية ==========
  if (screen === 'home') {
    return (
      <GameNatureBackdrop>
        <SafeAreaView style={[styles.safeClear, { paddingTop: topSafe }]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.bibiHero}>
            <Image source={BIBI.main} style={styles.mascotFill} resizeMode="cover" />
          </View>
          <Text style={styles.titleBig}>مطابقة الأصوات</Text>
          <Text style={styles.subtitle}>
            أنا بيان! نتعلّم الأصوات معاً ثم نختبر ذاكرتك 🦜🎧
          </Text>

          <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={startLearnSession}>
            <Text style={styles.btnText}>استكشف وتعلّم</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnSky, learnedCards.length < LEARN_COUNT && styles.btnDisabled]}
            onPress={() => {
              if (learnedCards.length < LEARN_COUNT) {
                Alert.alert('بيان يقول', 'ابدأ بالتعلّم أولاً لاختيار بطاقات الجلسة!');
                return;
              }
              setScreen('levels');
            }}
          >
            <Text style={styles.btnText}>اختبر نفسك</Text>
          </TouchableOpacity>

          {learnedCards.length > 0 && (
            <Text style={styles.hint}>
              جاهز للتحدي: {learnedCards.map((c) => c.name).join(' · ')}
            </Text>
          )}

          <TouchableOpacity style={styles.outlineBtn} onPress={exitToGames}>
            <Text style={styles.outlineText}>العودة للقائمة</Text>
          </TouchableOpacity>
        </ScrollView>
        </SafeAreaView>
      </GameNatureBackdrop>
    );
  }

  // ========== التعلّم ==========
  if (screen === 'learn') {
    return (
      <GameNatureBackdrop>
        <SafeAreaView style={[styles.safeClear, { paddingTop: topSafe }]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.bibiGuide}>
            <Image source={BIBI.listen} style={styles.mascotFill} resizeMode="cover" />
          </View>
          <Text style={styles.headerTitle}>استمع وتعلّم 🎧</Text>
          <Text style={styles.subtitle}>اضغط أي بطاقة لتسمع صوتها</Text>

          <View style={styles.grid}>
            {learnedCards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={styles.card}
                onPress={() => playCardSound(card)}
                activeOpacity={0.85}
              >
                <CardFace card={card} />
                <Text style={styles.cardName}>{card.name}</Text>
                <View style={styles.speakerChip}>
                  <Ionicons name="volume-high" size={14} color="#fff" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.btn, styles.btnGreen]}
            onPress={async () => {
              await stopAllAudio();
              await saveLearnedCards(learnedCards).catch(() => {});
              setScreen('levels');
            }}
          >
            <Text style={styles.btnText}>أنا جاهز للتحدي!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={async () => {
              await stopAllAudio();
              setScreen('home');
            }}
          >
            <Text style={styles.outlineText}>العودة</Text>
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
              <Image source={BIBI.cards} style={styles.mascotFill} resizeMode="cover" />
            </View>
            <Text style={styles.headerTitleOnBg}>اختر مستوى التحدي</Text>
            <Text style={styles.subtitleOnBg}>البطاقات من درس اليوم فقط</Text>

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

            <TouchableOpacity style={styles.outlineBtn} onPress={() => setScreen('home')}>
              <Text style={styles.outlineText}>العودة للرئيسية</Text>
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
        <SafeAreaView style={[styles.safeClear, { paddingTop: topSafe }]}>
        <View style={styles.feedbackWrap}>
          <View style={styles.bibiFeedback}>
            <Image
              source={ok ? BIBI.cheer : BIBI.think}
              style={styles.mascotFill}
              resizeMode="cover"
            />
          </View>
          <Text style={[styles.feedbackTitle, ok ? styles.okText : styles.errText]}>
            {ok ? 'أحسنت يا بطل!' : 'حاول مرة أخرى'}
          </Text>
          <Text style={styles.subtitle}>
            {ok
              ? 'بيان فخور بك — رتّبت الأصوات صح ⭐'
              : 'بيان يقول: اسمع التسلسل من جديد بتركيز'}
          </Text>
          {ok && (
            <View style={styles.scorePill}>
              <Text style={styles.scorePillText}>النقاط: {score}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, ok ? styles.btnGreen : styles.btnSky]}
            onPress={startNextRound}
          >
            <Text style={styles.btnText}>الجولة التالية ({attempts}/{ATTEMPTS})</Text>
          </TouchableOpacity>

          {ok &&
            currentLevel < MAX_LEVEL &&
            (!LOCK_LEVELS || unlocked >= currentLevel + 1) && (
              <TouchableOpacity
                style={[styles.btn, styles.btnSky]}
                onPress={() => startLevel(currentLevel + 1)}
              >
                <Text style={styles.btnText}>المستوى التالي</Text>
              </TouchableOpacity>
            )}

          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={async () => {
              await stopAllAudio();
              setScreen('levels');
            }}
          >
            <Text style={styles.outlineText}>اختيار مستوى آخر</Text>
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
        <SafeAreaView style={[styles.safeClear, { paddingTop: topSafe }]}>
          <View style={styles.feedbackWrap}>
            <View style={styles.bibiFeedback}>
              <Image source={BIBI.cheer} style={styles.mascotFill} resizeMode="cover" />
            </View>
            <Text style={[styles.feedbackTitle, styles.okText]}>انتهت المحاولات</Text>
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
                  style={[styles.btn, styles.btnGreen]}
                  onPress={() => startLevel(currentLevel + 1)}
                >
                  <Text style={styles.btnText}>المستوى التالي</Text>
                </TouchableOpacity>
              )}
            <TouchableOpacity
              style={[styles.btn, styles.btnSky]}
              onPress={() => startLevel(currentLevel)}
            >
              <Text style={styles.btnText}>أعد هذا المستوى</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={async () => {
                await stopAllAudio();
                setScreen('levels');
              }}
            >
              <Text style={styles.outlineText}>اختيار مستوى آخر</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GameNatureBackdrop>
    );
  }

  // ========== اللعب ==========
  const cfg = LEVELS[currentLevel] || LEVELS[1];
  const totalSteps = sequence.length || cfg.sequenceLength;

  return (
    <GameNatureBackdrop>
      <SafeAreaView style={[styles.safeClear, { paddingTop: topSafe }]}>
      <View style={styles.playHeader}>
        <TouchableOpacity
          style={styles.exitChip}
          onPress={async () => {
            await stopAllAudio();
            setScreen('levels');
          }}
        >
          <Text style={styles.exitChipText}>خروج</Text>
        </TouchableOpacity>
        <View style={styles.hud}>
          <Text style={styles.hudText}>⭐ {score}</Text>
          <Text style={styles.hudLevel}>
            {cfg.title} · جولة {Math.min(attempts + 1, ATTEMPTS)}/{ATTEMPTS}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.playScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.bibiGuideSm}>
          <Image source={BIBI.listen} style={styles.mascotFill} resizeMode="cover" />
        </View>
        <Text style={styles.headerTitle}>ماذا تسمع؟</Text>
        <Text style={styles.stepHint}>
          اختر الصوت {Math.min(stepIndex + 1, totalSteps)} من {totalSteps}
        </Text>

        <View style={styles.dotsRow}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < stepIndex && styles.dotDone,
                i === stepIndex && styles.dotCurrent,
              ]}
            />
          ))}
        </View>

        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <TouchableOpacity
            style={[styles.playSoundBtn, isPlayingSeq && styles.playSoundBtnActive]}
            onPress={() => !isPlayingSeq && playSequence(sequence, currentLevel)}
            disabled={isPlayingSeq}
          >
            <Ionicons name={isPlayingSeq ? 'musical-notes' : 'volume-high'} size={48} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
        <Text style={styles.replayHint}>
          {isPlayingSeq ? 'بيان يشغّل الأصوات… استمع' : 'اضغط لإعادة الاستماع'}
        </Text>

        {cfg.hasBgNoise && (
          <View style={styles.noiseBadge}>
            <Text style={styles.noiseBadgeText}>ضوضاء خلفية مفعّلة 🌊</Text>
          </View>
        )}

        <View style={styles.grid}>
          {learnedCards.map((card) => {
            const order = pickedIds.indexOf(card.id);
            const used = order !== -1;
            return (
              <TouchableOpacity
                key={card.id}
                style={[styles.card, styles.cardPlay, used && styles.cardPicked]}
                onPress={() => handleCardPress(card)}
                disabled={isPlayingSeq || used}
                activeOpacity={0.85}
              >
                {card.image ? (
                  <Image source={card.image} style={styles.cardPlayImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.cardEmojiPlay}>{card.emoji}</Text>
                )}
                {used && (
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>{order + 1}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      </SafeAreaView>
    </GameNatureBackdrop>
  );
}

const styles = StyleSheet.create({
  safeClear: { flex: 1, backgroundColor: 'transparent' },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  playScroll: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  bibiHero: {
    width: 200,
    height: 200,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 6,
  },
  bibiGuide: {
    width: 150,
    height: 150,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 4,
  },
  bibiGuideSm: {
    width: 110,
    height: 110,
    borderRadius: 24,
    overflow: 'hidden',
  },
  bibiFeedback: {
    width: 180,
    height: 180,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 8,
  },
  mascotFill: {
    width: '100%',
    height: '100%',
  },
  titleBig: {
    fontSize: 32,
    fontWeight: '900',
    color: '#102818',
    textAlign: 'center',
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
    lineHeight: 22,
    marginBottom: 18,
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
    lineHeight: 22,
    marginBottom: 18,
    paddingHorizontal: 8,
    fontWeight: '700',
    textShadowColor: 'rgba(255,255,255,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  hint: {
    marginTop: 8,
    marginBottom: 8,
    color: brand.ink,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 13,
  },
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
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  outlineBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d5e8ee',
    borderBottomWidth: 4,
    backgroundColor: '#fff',
    marginTop: 4,
  },
  outlineText: { color: brand.muted, fontSize: 16, fontWeight: '700' },

  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  card: {
    width: '47%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    borderBottomWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
    padding: 6,
  },
  cardPlay: {
    padding: 0,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  cardPicked: {
    borderColor: brand.green,
    backgroundColor: '#e8f7d4',
    opacity: 0.85,
  },
  cardImage: { width: '100%', height: '68%', borderRadius: 14 },
  cardPlayImage: {
    flex: 1,
    width: '100%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  cardEmoji: { fontSize: 52 },
  cardEmojiPlay: {
    flex: 1,
    fontSize: 52,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  cardName: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '800',
    color: brand.ink,
  },
  speakerChip: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: brand.sky,
    borderRadius: 12,
    padding: 4,
  },
  orderBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: brand.green,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  levelBtn: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderBottomWidth: 5,
  },
  levelBtnLocked: { opacity: 0.55 },
  levelEmoji: { fontSize: 28, marginLeft: 10 },
  levelTextCol: { flex: 1, alignItems: 'flex-end' },
  levelTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  levelDesc: { color: 'rgba(255,255,255,0.92)', fontSize: 12, marginTop: 2 },
  levelArrow: { color: 'rgba(255,255,255,0.7)', fontSize: 16 },

  playHeader: {
    width: '100%',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  exitChip: {
    backgroundColor: brand.coral,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderBottomWidth: 3,
    borderColor: '#e06548',
  },
  exitChipText: { color: '#fff', fontWeight: '800' },
  hud: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderColor: '#e8f0ec',
  },
  hudText: { fontWeight: '900', color: brand.ink, fontSize: 16 },
  hudLevel: { fontSize: 12, color: brand.muted, fontWeight: '700' },

  stepHint: {
    fontSize: 15,
    fontWeight: '800',
    color: brand.skyDark,
    marginBottom: 8,
  },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#d5e8ee',
  },
  dotDone: { backgroundColor: brand.green },
  dotCurrent: { backgroundColor: brand.yellow, transform: [{ scale: 1.2 }] },

  playSoundBtn: {
    backgroundColor: brand.sky,
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6,
    borderColor: brand.skyDark,
    marginBottom: 8,
  },
  playSoundBtnActive: { backgroundColor: brand.green, borderColor: brand.greenDark },
  replayHint: {
    color: brand.muted,
    fontWeight: '700',
    marginBottom: 10,
    fontSize: 13,
  },
  noiseBadge: {
    backgroundColor: brand.cream,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 12,
  },
  noiseBadgeText: {
    color: brand.ink,
    fontWeight: '700',
    fontSize: 12,
  },

  feedbackWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  feedbackTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
  },
  okText: { color: brand.green },
  errText: { color: '#e08600' },
  scorePill: {
    backgroundColor: brand.greenSoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 16,
  },
  scorePillText: {
    color: brand.ink,
    fontWeight: '900',
    fontSize: 16,
  },
});
