import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Dimensions,
  Easing,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Color';
import useGameSafeTop from '../../../hooks/useGameSafeTop';
import {
  configureGameAudio,
  playSound,
  playEffect,
  releaseSounds,
} from '../../../utils/gameAudio';
import {
  LOCK_LEVELS,
  MAX_LEVEL,
  UNLOCK_KEYS,
  isLevelLocked,
  loadUnlocked,
  lockAlert,
  unlockNext as persistUnlock,
} from '../../../utils/levelUnlock';
import GameStatsPanel from '../../../components/GameStatsPanel';
import { GAME_IDS, useRecordGameSession } from '../../../utils/gameStatsStore';

const { brand } = Colors;
const { width: W, height: H } = Dimensions.get('window');

const MAP_W = W - 32;
const GAP_Y = 125;
const AMP_X = MAP_W * 0.28;
const REACT_MS = 3000;
const MAX_LIVES = 3;
const UNLOCK_KEY = UNLOCK_KEYS.spaceStop;

const ROCKET = require('../../../assets/img/space/bayan-rocket.png');
const PLANETS = [
  require('../../../assets/img/space/planet-1.png'),
  require('../../../assets/img/space/planet-2.png'),
  require('../../../assets/img/space/planet-3.png'),
  require('../../../assets/img/space/planet-4.png'),
  require('../../../assets/img/space/planet-5.png'),
];
const SND_HUM = require('../../../assets/audio/space-sound.wav');
const SND_ERROR = require('../../../assets/audio/error_sound.mp3');

const LEVELS = {
  1: {
    title: 'المستوى 1',
    desc: '5 كواكب — اضغط خلال 3 ثوانٍ بعد السكوت',
    emoji: '🌱',
    planets: 5,
    waitMin: 2500,
    waitMax: 6000,
    volume: 1,
    color: brand.green,
    border: brand.greenDark,
  },
  2: {
    title: 'المستوى 2',
    desc: 'انتظار أقصر بين فجوات المحرك',
    emoji: '⚡',
    planets: 5,
    waitMin: 1800,
    waitMax: 4500,
    volume: 0.9,
    color: brand.sky,
    border: brand.skyDark,
  },
  3: {
    title: 'المستوى 3',
    desc: 'محرك أخفت',
    emoji: '🌌',
    planets: 5,
    waitMin: 1800,
    waitMax: 5000,
    volume: 0.4,
    color: '#ff9600',
    border: '#e08600',
  },
  4: {
    title: 'المستوى 4',
    desc: '10 كواكب',
    emoji: '🏆',
    planets: 10,
    waitMin: 2000,
    waitMax: 5500,
    volume: 0.75,
    color: '#ce82ff',
    border: '#a866d9',
  },
};

function buildLayout(count) {
  const nodes = [];
  for (let i = 0; i < count; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const wobble = (i % 3) * 8;
    nodes.push({
      x: MAP_W / 2 + side * AMP_X + wobble * side * 0.3,
      y: (count - 1 - i) * GAP_Y + 36,
    });
  }
  return nodes;
}

function PathDots({ from, to }) {
  const dots = [];
  const steps = 8;
  for (let s = 1; s < steps; s += 1) {
    const t = s / steps;
    dots.push({
      left: from.x + (to.x - from.x) * t - 3,
      top: from.y + (to.y - from.y) * t - 3,
      key: `${from.x}-${s}`,
    });
  }
  return dots.map((d) => (
    <View key={d.key} style={[styles.pathDot, { left: d.left, top: d.top }]} />
  ));
}

function SmokeBurst({ active, x, y }) {
  const puffs = useRef(
    [0, 1, 2, 3, 4].map(() => ({
      opacity: new Animated.Value(0),
      tx: new Animated.Value(0),
      ty: new Animated.Value(0),
      scale: new Animated.Value(0.4),
    }))
  ).current;

  useEffect(() => {
    if (!active) return undefined;
    const anims = puffs.map((p, i) => {
      p.opacity.setValue(0.7);
      p.tx.setValue(0);
      p.ty.setValue(0);
      p.scale.setValue(0.35);
      const angle = -Math.PI / 2 + (i - 2) * 0.35;
      const dist = 28 + i * 10;
      return Animated.parallel([
        Animated.timing(p.opacity, {
          toValue: 0,
          duration: 700 + i * 60,
          useNativeDriver: true,
        }),
        Animated.timing(p.tx, {
          toValue: Math.cos(angle) * dist,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(p.ty, {
          toValue: Math.sin(angle) * dist,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(p.scale, {
          toValue: 1.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]);
    });
    Animated.stagger(40, anims).start();
    return undefined;
  }, [active, puffs]);

  if (!active) return null;

  return (
    <View style={[styles.smokeLayer, { left: x - 10, top: y + 28 }]} pointerEvents="none">
      {puffs.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.smokePuff,
            {
              opacity: p.opacity,
              transform: [
                { translateX: p.tx },
                { translateY: p.ty },
                { scale: p.scale },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * عكس رحلة الفضاء: المحرك يعمل، وعند سكوته يضغط الطفل خلال 3 ثوانٍ.
 * ملف مستقل — لا يغيّر لعبة الصاروخ الأصلية.
 */
export default function SpaceStopGame() {
  const router = useRouter();
  const topSafe = useGameSafeTop();

  const [screen, setScreen] = useState('home');
  const [level, setLevel] = useState(1);
  const [station, setStation] = useState(0);
  // idle | running (المحرك يعمل) | silent (سكت — اضغط)
  const [mode, setMode] = useState('idle');
  const [smokeTick, setSmokeTick] = useState(0);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [hits, setHits] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [unlocked, setUnlocked] = useState(1);

  const layout = useMemo(
    () => buildLayout(LEVELS[level]?.planets || 5),
    [level]
  );

  const rocketLeft = useRef(new Animated.Value(layout[0]?.x ?? 0)).current;
  const rocketTop = useRef(new Animated.Value(layout[0]?.y ?? 0)).current;

  const engineSnd = useRef(null);
  const waitT = useRef(null);
  const reactT = useRef(null);
  const session = useRef(0);
  const modeRef = useRef('idle');
  const stationRef = useRef(0);
  const levelRef = useRef(1);
  const livesRef = useRef(MAX_LIVES);
  const scrollRef = useRef(null);
  const runningRef = useRef(false);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    stationRef.current = station;
  }, [station]);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);
  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  const clearTimers = () => {
    if (waitT.current) clearTimeout(waitT.current);
    if (reactT.current) clearTimeout(reactT.current);
    waitT.current = null;
    reactT.current = null;
  };

  const stopAll = useCallback(async () => {
    session.current += 1;
    runningRef.current = false;
    clearTimers();
    await releaseSounds(engineSnd);
  }, []);

  useEffect(() => {
    configureGameAudio();
    loadUnlocked(UNLOCK_KEY).then(setUnlocked).catch(() => {});
    return () => {
      clearTimers();
      releaseSounds(engineSnd);
    };
  }, []);

  const unlockNext = (completedLevel) =>
    persistUnlock(UNLOCK_KEY, completedLevel, setUnlocked);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (won || lost) {
          setWon(false);
          setLost(false);
          setScreen('home');
          return true;
        }
        if (screen === 'play') {
          Alert.alert('مغادرة الرحلة؟', 'هل تريد العودة للقائمة؟', [
            { text: 'البقاء', style: 'cancel' },
            {
              text: 'خروج',
              style: 'destructive',
              onPress: async () => {
                await stopAll();
                setMode('idle');
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
    }, [screen, won, lost, stopAll, router])
  );

  const moveRocket = (index, withSmoke = false) => {
    const node = layout[index];
    if (!node) return;
    if (withSmoke) setSmokeTick((t) => t + 1);
    Animated.parallel([
      Animated.timing(rocketLeft, {
        toValue: node.x,
        duration: 780,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(rocketTop, {
        toValue: node.y,
        duration: 780,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
    scrollRef.current?.scrollTo({
      y: Math.max(0, node.y - H * 0.2),
      animated: true,
    });
  };

  const pauseEngine = async () => {
    const sound = engineSnd.current;
    if (!sound) return;
    try {
      await sound.pauseAsync();
    } catch (_) {}
  };

  const startEngine = async (sid) => {
    const cfg = LEVELS[levelRef.current] || LEVELS[1];
    await playSound(engineSnd, SND_HUM, {
      loop: true,
      volume: cfg.volume,
      isStale: () => session.current !== sid || !runningRef.current,
    });
  };

  const cutEngine = async () => {
    if (!runningRef.current) return;
    if (modeRef.current !== 'running') return;
    await pauseEngine();
    if (!runningRef.current) return;
    setMode('silent');
    reactT.current = setTimeout(() => {
      onMiss();
    }, REACT_MS);
  };

  const scheduleNextGap = () => {
    if (!runningRef.current) return;
    const cfg = LEVELS[levelRef.current];
    if (!cfg) return;
    clearTimers();
    const sid = session.current;
    setMode('running');
    startEngine(sid).then(() => {
      if (!runningRef.current || session.current !== sid) return;
      const delay =
        cfg.waitMin + Math.floor(Math.random() * (cfg.waitMax - cfg.waitMin + 1));
      waitT.current = setTimeout(() => {
        cutEngine();
      }, delay);
    });
  };

  const scrollToRocket = (nodes, index = 0) => {
    if (!scrollRef.current) return;
    if (index === 0) {
      scrollRef.current.scrollToEnd({ animated: false });
      return;
    }
    const node = nodes?.[index];
    if (!node) return;
    scrollRef.current.scrollTo({
      y: Math.max(0, node.y - 80),
      animated: true,
    });
  };

  const offerGameOver = () => {
    runningRef.current = false;
    clearTimers();
    releaseSounds(engineSnd);
    setMode('idle');
    setLost(true);
  };

  const goBackOne = async () => {
    const sid = session.current + 1;
    session.current = sid;
    clearTimers();
    await pauseEngine();
    playEffect(SND_ERROR, 0.9);

    const nextLives = livesRef.current - 1;
    livesRef.current = nextLives;
    setLives(nextLives);

    const prev = Math.max(0, stationRef.current - 1);
    setStation(prev);
    moveRocket(prev, false);

    if (nextLives <= 0) {
      setMode('idle');
      offerGameOver();
      return;
    }

    setMode('running');
    if (runningRef.current) {
      waitT.current = setTimeout(() => scheduleNextGap(), 900);
    }
  };

  const onMiss = () => {
    if (!runningRef.current) return;
    if (modeRef.current !== 'silent') return;
    goBackOne();
  };

  const onPadPress = () => {
    if (!runningRef.current) return;
    const m = modeRef.current;

    if (m === 'running') {
      goBackOne();
      return;
    }

    if (m === 'silent') {
      clearTimers();
      const cfg = LEVELS[levelRef.current];
      const next = stationRef.current + 1;

      if (next >= cfg.planets) {
        runningRef.current = false;
        setHits((h) => h + 1);
        setStation(cfg.planets - 1);
        moveRocket(cfg.planets - 1, true);
        setMode('idle');
        unlockNext(levelRef.current); // فتح التالي فقط عند الوصول لنهاية الرحلة
        setWon(true);
        releaseSounds(engineSnd);
        return;
      }

      setHits((h) => h + 1);
      setStation(next);
      moveRocket(next, true);
      setMode('running');
      waitT.current = setTimeout(() => scheduleNextGap(), 850);
    }
  };

  const beginTrip = async (levelNo) => {
    if (isLevelLocked(levelNo, unlocked)) {
      lockAlert();
      return;
    }
    await stopAll();
    const cfg = LEVELS[levelNo];
    const nodes = buildLayout(cfg.planets);
    setLevel(levelNo);
    levelRef.current = levelNo;
    setStation(0);
    stationRef.current = 0;
    setLives(MAX_LIVES);
    livesRef.current = MAX_LIVES;
    setHits(0);
    setWon(false);
    setLost(false);
    setMode('idle');
    setScreen('play');

    rocketLeft.setValue(nodes[0].x);
    rocketTop.setValue(nodes[0].y);

    setTimeout(() => scrollToRocket(nodes, 0), 60);
    setTimeout(() => scrollToRocket(nodes, 0), 200);

    session.current += 1;
    runningRef.current = true;
    setMode('running');
    waitT.current = setTimeout(() => scheduleNextGap(), 700);
  };

  useRecordGameSession(won || lost, {
    gameId: GAME_IDS.spaceStop,
    level,
    endedReason: won ? 'win' : 'hearts',
    correct: hits,
    total: LEVELS[level]?.planets ?? null,
    livesLeft: lives,
  });

  const mapHeight = (LEVELS[level]?.planets || 5) * GAP_Y + 100;
  const rocketPos = layout[station] || layout[0];

  if (screen === 'home') {
    return (
      <SafeAreaView style={[styles.safe, { paddingTop: topSafe }]}>
        <ScrollView contentContainerStyle={styles.homeScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.bibi}>
            <Image source={ROCKET} style={styles.mascotFill} resizeMode="cover" />
          </View>
          <Text style={styles.title}>صمت الفضاء</Text>
          <Text style={styles.sub}>
            المحرك يعمل… عندما يسكت اضغط الزر خلال 3 ثوانٍ 🚀
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
                onPress={() => beginTrip(n)}
                activeOpacity={0.85}
              >
                {locked ? (
                  <Ionicons name="lock-closed" size={22} color="rgba(255,255,255,0.9)" />
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
    );
  }

  if (lost) {
    const planets = LEVELS[level]?.planets || 5;
    return (
      <SafeAreaView style={[styles.safe, { paddingTop: topSafe }]}>
        <View style={styles.winBox}>
          <View style={styles.winRocket}>
            <Image source={ROCKET} style={styles.mascotFill} resizeMode="cover" />
          </View>
          <Text style={styles.winTitle}>انتهت القلوب</Text>
          <GameStatsPanel
            dark
            headline={`سكوت صحيح: ${hits}`}
            rows={[
              { icon: '🎯', label: 'ضغطات في الوقت', value: hits, highlight: true },
              { icon: '🌍', label: 'الكواكب في الرحلة', value: planets },
              { icon: '💔', label: 'الأخطاء', value: MAX_LIVES },
            ]}
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={() => beginTrip(level)}>
            <Text style={styles.primaryTxt}>مرة أخرى</Text>
          </TouchableOpacity>
          {level < MAX_LEVEL && (!LOCK_LEVELS || unlocked >= level + 1) && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => beginTrip(level + 1)}
            >
              <Text style={styles.primaryTxt}>المستوى التالي</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.outline}
            onPress={async () => {
              await stopAll();
              setLost(false);
              setScreen('home');
            }}
          >
            <Text style={styles.outlineTxt}>المستويات</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (won) {
    const planets = LEVELS[level]?.planets || 5;
    return (
      <SafeAreaView style={[styles.safe, { paddingTop: topSafe }]}>
        <View style={styles.winBox}>
          <View style={styles.winRocket}>
            <Image source={ROCKET} style={styles.mascotFill} resizeMode="cover" />
          </View>
          <Text style={styles.winTitle}>وصلت لنهاية الرحلة!</Text>
          <GameStatsPanel
            dark
            headline={`أكملت ${planets} كواكب`}
            rows={[
              { icon: '🎯', label: 'ضغطات في الوقت', value: hits, highlight: true },
              { icon: '🌍', label: 'الكواكب', value: planets },
              { icon: '🚀', label: 'قلوب متبقية', value: lives },
            ]}
          />
          {level < MAX_LEVEL && (!LOCK_LEVELS || unlocked >= level + 1) && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => beginTrip(level + 1)}
            >
              <Text style={styles.primaryTxt}>المستوى التالي</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.primaryBtn} onPress={() => beginTrip(level)}>
            <Text style={styles.primaryTxt}>مرة أخرى</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.outline}
            onPress={async () => {
              await stopAll();
              setWon(false);
              setScreen('home');
            }}
          >
            <Text style={styles.outlineTxt}>المستويات</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: topSafe }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.exit}
          onPress={async () => {
            await stopAll();
            setScreen('home');
            setMode('idle');
          }}
        >
          <Text style={styles.exitTxt}>خروج</Text>
        </TouchableOpacity>

        <View style={styles.livesRow}>
          {Array.from({ length: MAX_LIVES }).map((_, i) => {
            const alive = i < lives;
            return (
              <Text key={i} style={[styles.lifeRocket, !alive && styles.lifeRocketLost]}>
                🚀
              </Text>
            );
          })}
        </View>

        <View style={styles.pill}>
          <Text style={styles.pillTxt}>{LEVELS[level].title}</Text>
        </View>
      </View>

      <View style={styles.mapFrame}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ width: MAP_W, height: mapHeight }}
          onContentSizeChange={() => {
            if (station === 0) scrollToRocket(layout, 0);
          }}
          onLayout={() => {
            if (station === 0) scrollToRocket(layout, 0);
          }}
        >
          {layout.slice(0, -1).map((node, i) => (
            <PathDots key={`p-${i}`} from={node} to={layout[i + 1]} />
          ))}

          {layout.map((node, i) => (
            <Image
              key={`pl-${i}`}
              source={PLANETS[i % PLANETS.length]}
              style={[
                styles.planet,
                {
                  left: node.x - 40,
                  top: node.y - 40,
                  opacity: i < station ? 0.95 : i === station ? 1 : 0.7,
                  transform: [{ scale: i === station ? 1.08 : 1 }],
                },
              ]}
              resizeMode="contain"
            />
          ))}

          <SmokeBurst
            active={smokeTick > 0}
            x={rocketPos?.x ?? 0}
            y={rocketPos?.y ?? 0}
            key={smokeTick}
          />

          <Animated.Image
            source={ROCKET}
            style={[
              styles.rocket,
              {
                left: Animated.subtract(rocketLeft, 34),
                top: Animated.subtract(rocketTop, 34),
              },
            ]}
            resizeMode="contain"
          />
        </ScrollView>
      </View>

      <View style={styles.padWrap}>
        <TouchableOpacity style={styles.pad} onPress={onPadPress} activeOpacity={0.8}>
          <Text style={styles.padText}>سكت! 🛑</Text>
        </TouchableOpacity>
        <Text style={styles.padHint}>اضغط عندما يسكت محرك الصاروخ (3 ثوانٍ)</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1A3A' },
  homeScroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  bibi: {
    width: 180,
    height: 180,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 4,
  },
  mascotFill: { width: '100%', height: '100%' },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 6,
  },
  sub: {
    color: '#9ec9ff',
    textAlign: 'center',
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 22,
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
  levelEmoji: { fontSize: 26, marginLeft: 10 },
  levelCol: { flex: 1, alignItems: 'flex-end' },
  levelTitle: { color: '#fff', fontWeight: '800', fontSize: 18 },
  levelDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  levelBtnLocked: { opacity: 0.55 },
  outline: {
    width: '100%',
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#2a4570',
    borderBottomWidth: 4,
    alignItems: 'center',
  },
  outlineTxt: { color: '#9ec9ff', fontWeight: '700', fontSize: 16 },
  topBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    alignItems: 'center',
    gap: 8,
  },
  livesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  lifeRocket: { fontSize: 18 },
  lifeRocketLost: { opacity: 0.25 },
  exit: {
    backgroundColor: brand.coral,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderBottomWidth: 3,
    borderColor: '#e06548',
  },
  exitTxt: { color: '#fff', fontWeight: '800' },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  pillTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  mapFrame: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    maxHeight: H * 0.62,
  },
  pathDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(150,190,255,0.45)',
    zIndex: 1,
  },
  planet: {
    position: 'absolute',
    width: 80,
    height: 80,
    zIndex: 2,
  },
  rocket: {
    position: 'absolute',
    width: 68,
    height: 68,
    zIndex: 5,
  },
  smokeLayer: {
    position: 'absolute',
    width: 20,
    height: 20,
    zIndex: 4,
  },
  smokePuff: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(200,210,230,0.55)',
  },
  padWrap: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  pad: {
    minWidth: 200,
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 22,
    backgroundColor: '#ff5a3d',
    borderBottomWidth: 6,
    borderColor: '#d6452e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  padText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  padHint: {
    marginTop: 10,
    color: '#9ec9ff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  winBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  winRocket: {
    width: 120,
    height: 120,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 12,
  },
  winTitle: {
    color: brand.green,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 18,
    textAlign: 'center',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: brand.green,
    borderColor: brand.greenDark,
    borderBottomWidth: 5,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryTxt: { color: '#fff', fontWeight: '800', fontSize: 18 },
});
