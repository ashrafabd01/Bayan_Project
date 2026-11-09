import React, { useCallback, useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import ThemedView from '../../components/ThemedView'
import { Colors } from '../../constants/Color'
import {
  GAME_META,
  loadGameSessions,
} from '../../utils/gameStatsStore'

const { brand } = Colors

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function scoreLine(session) {
  if (session.total != null) {
    return `أصاب ${session.correct} من ${session.total}`
  }
  return `إصابات: ${session.correct}`
}

function SessionCard({ session }) {
  const meta = GAME_META[session.gameId] || {}
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={meta.icon || 'stats-chart-outline'}
            size={22}
            color={brand.greenDark}
          />
        </View>
        <View style={styles.cardHeadText}>
          <Text style={styles.gameTitle}>{session.gameTitle}</Text>
          <Text style={styles.when}>{formatWhen(session.createdAt)}</Text>
        </View>
      </View>
      <Text style={styles.score}>{scoreLine(session)}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>المستوى {session.level}</Text>
        {session.accuracy != null && (
          <Text style={styles.meta}>الدقة {session.accuracy}٪</Text>
        )}
        {session.patientName ? (
          <Text style={styles.meta}>{session.patientName}</Text>
        ) : null}
      </View>
    </View>
  )
}

export default function PatientRecord() {
  const router = useRouter()
  const [sessions, setSessions] = useState([])
  const [filter, setFilter] = useState('all')

  useFocusEffect(
    useCallback(() => {
      let alive = true
      loadGameSessions()
        .then((list) => {
          if (alive) setSessions(list)
        })
        .catch(() => {
          if (alive) setSessions([])
        })
      return () => {
        alive = false
      }
    }, [])
  )

  const gamesInUse = [...new Set(sessions.map((s) => s.gameId))]
  const visible =
    filter === 'all' ? sessions : sessions.filter((s) => s.gameId === filter)

  return (
    <ThemedView safe edges={['top', 'left', 'right']} style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/dashboard')}
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
          <Text style={styles.backTxt}>عودة</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>سجل المريض</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summary}>
          <Text style={styles.summaryNum}>{sessions.length}</Text>
          <Text style={styles.summaryLabel}>جلسة مسجّلة على هذا الجهاز</Text>
        </View>

        <ScrollView
          horizontal
          inverted
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <Pressable
            onPress={() => setFilter('all')}
            style={[styles.chip, filter === 'all' && styles.chipOn]}
          >
            <Text style={[styles.chipTxt, filter === 'all' && styles.chipTxtOn]}>
              الكل
            </Text>
          </Pressable>
          {gamesInUse.map((id) => (
            <Pressable
              key={id}
              onPress={() => setFilter(id)}
              style={[styles.chip, filter === id && styles.chipOn]}
            >
              <Text style={[styles.chipTxt, filter === id && styles.chipTxtOn]}>
                {GAME_META[id]?.title || id}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {visible.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>لا توجد نتائج بعد</Text>
            <Text style={styles.emptyBody}>
              عند انتهاء أي لعبة وظهور الإحصائيات تُحفظ هنا تلقائياً.
            </Text>
          </View>
        ) : (
          visible.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))
        )}
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    marginBottom: 8,
  },
  backBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: brand.coral,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderBottomWidth: 3,
    borderColor: '#e06548',
  },
  backTxt: { color: '#fff', fontWeight: '800' },
  pageTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#102818',
  },
  topSpacer: { width: 72 },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 36,
  },
  summary: {
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#c5ddcc',
  },
  summaryNum: {
    fontSize: 28,
    fontWeight: '900',
    color: brand.greenDark,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a3324',
  },
  filters: {
    gap: 8,
    paddingBottom: 14,
    flexDirection: 'row-reverse',
  },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#c5ddcc',
  },
  chipOn: {
    backgroundColor: brand.green,
    borderColor: brand.greenDark,
  },
  chipTxt: { fontWeight: '800', color: brand.ink, fontSize: 13 },
  chipTxtOn: { color: '#fff' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#c5ddcc',
    borderBottomWidth: 4,
  },
  cardHead: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: brand.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadText: { flex: 1, alignItems: 'flex-end' },
  gameTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#102818',
    textAlign: 'right',
  },
  when: {
    fontSize: 12,
    fontWeight: '600',
    color: brand.muted,
    textAlign: 'right',
    marginTop: 2,
  },
  score: {
    fontSize: 18,
    fontWeight: '900',
    color: brand.greenDark,
    textAlign: 'right',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  meta: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a3324',
    backgroundColor: '#f3f8f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  empty: {
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102818',
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a3324',
    textAlign: 'center',
    lineHeight: 22,
  },
})
