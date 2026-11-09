import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Modal,
  Pressable,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { useUser } from '../../hooks/useUser'
import Spacer from '../../components/Spacer'
import ThemedView from '../../components/ThemedView'
import ThemedButton from '../../components/ThemedButton'
import ThemedLogo from '../../components/ThemedLogo'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors } from '../../constants/Color'
import { hydrateUserNames } from '../../utils/userProfile'

const { brand } = Colors

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color={brand.greenDark} />
      </View>
      <View style={styles.infoRowText}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text style={styles.infoRowValue}>{value || '—'}</Text>
      </View>
    </View>
  )
}

const Profile = () => {
  const router = useRouter()
  const { logout, user, setUser } = useUser()
  const [settingsOpen, setSettingsOpen] = useState(false)

  // استرجاع الاسم إن كانت الجلسة القديمة بلا firstName/lastName
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!user) return
      if (user.firstName || user.lastName) return

      const hydrated = await hydrateUserNames(user)
      if (cancelled || !hydrated) return
      if (!hydrated.firstName && !hydrated.lastName) return

      await AsyncStorage.setItem('userData', JSON.stringify(hydrated))
      setUser(hydrated)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [user, setUser])

  const firstName = (user?.firstName || '').trim()
  const lastName = (user?.lastName || '').trim()
  const fullName = firstName
    //[firstName, lastName].filter(Boolean).join(' ') || 'صديق بيان'

  // جاهز للربط لاحقاً من الخادم أو التقدم المحلي
  const userLevel = user?.level ?? null

  const confirmLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج من حسابك؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: async () => {
          setSettingsOpen(false)
          await logout()
        },
      },
    ])
  }

  return (
    <ThemedView safe edges={['top', 'left', 'right']} style={styles.safeRoot}>
      {/* شريط علوي: الترحيب + المستوى + زر الإعدادات */}
      <View style={styles.topBar}>
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingText}>أهلاً بك 👋</Text>
          <Text style={styles.nameText}>{fullName}</Text>
        </View>

        <View style={styles.topActions}>
          
          {/* <View style={styles.levelBadge} accessibilityLabel="لفل اللاعب">
            <Ionicons name="trophy" size={15} color="#fff" />
            <Text style={styles.levelBadgeValue}>
              {userLevel != null ? userLevel : '1'}
            </Text>
          </View> */}

          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => setSettingsOpen(true)}
            activeOpacity={0.8}
            accessibilityLabel="الإعدادات"
          >
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <ThemedLogo variant="wave" style={styles.waveImg} />
          <Text style={styles.waveHello}>مرحبا {firstName || fullName}</Text>
          <Text style={styles.heroTitle}>بيان يرحب بك</Text>
          <Text style={styles.heroSubtitle}>
            كل لعبة تساعد أذنك للاعتياد على الأصوات بشكل أفضل
          </Text>

          <ThemedButton
            style={styles.playButton}
            onPress={() => router.replace('/games')}
          >
            <Text style={styles.playButtonText}>هيا نلعب 🎮</Text>
          </ThemedButton>
        </View>

        <View style={styles.infoCard}>
          <ThemedLogo circular style={styles.tipMascot} />
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoTitle}>نصيحة بيان</Text>
            <Text style={styles.infoBody}>
              استخدم السماعات، اجلس في مكان هادئ، والعب قليلاً كل يوم.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>رحلتي 🌱</Text>
        <View style={styles.journeyCard}>
          <Text style={styles.journeyEmoji}>⭐</Text>
          <Text style={styles.journeyTitle}>أنت في بداية رحلة رائعة</Text>
          <Text style={styles.journeyBody}>
            كل لعبة تكملها تجعل أذنك أقوى وأكثر ثقة
          </Text>
        </View>

        {[
          { emoji: '👂', title: 'اسمع أولاً', body: 'انتظر الصوت قبل أن تضغط' },
          { emoji: '🐢', title: 'لا تستعجل', body: 'الهدوء يساعدك على التمييز' },
          { emoji: '⭐', title: 'كرّر يومياً', body: 'دقائق قليلة كل يوم تكفي' },
        ].map((tip) => (
          <View key={tip.title} style={styles.tipCard}>
            <Text style={styles.tipEmoji}>{tip.emoji}</Text>
            <View style={styles.tipText}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipBody}>{tip.body}</Text>
            </View>
          </View>
        ))}

        <Spacer height={1} />
      </ScrollView>

      {/* قائمة الإعدادات */}
      <Modal
        visible={settingsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSettingsOpen(false)}>
          <Pressable style={styles.settingsSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>الإعدادات</Text>
              <TouchableOpacity
                onPress={() => setSettingsOpen(false)}
                style={styles.closeBtn}
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color={brand.ink} />
              </TouchableOpacity>
            </View>

            <View style={styles.userBanner}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(firstName || fullName).charAt(0)}
                </Text>
              </View>
              <View style={styles.userBannerText}>
                <Text style={styles.userBannerName}>{fullName}</Text>
                <Text style={styles.userBannerHint}>بيانات حسابك الأساسية</Text>
              </View>
            </View>

            <View style={styles.dataCard}>
              <InfoRow icon="mail-outline" label="البريد الإلكتروني" value={user?.email} />
              <InfoRow
                icon="trophy-outline"
                label=""
                value={userLevel != null ? String(userLevel) : 'سيُضاف لاحقاً'}
              />
            </View>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={confirmLogout}
              activeOpacity={0.85}
            >
              <Ionicons name="log-out-outline" size={20} color="#fff" />
              <Text style={styles.logoutText}>تسجيل الخروج</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  )
}

export default Profile

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  greetingBlock: {
    flex: 1,
    alignItems: 'flex-end',
    paddingLeft: 12,
  },
  topActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: brand.yellow,
    borderBottomWidth: 3,
    borderColor: brand.yellowDark,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
    gap: 5,
  },
  levelBadgeValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#d7ebe3',
    borderBottomWidth: 3,
    borderBottomColor: '#cfe6db',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: brand.ink,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10
  },
  greetingText: {
    fontSize: 16,
    color: '#1a3324',
    fontWeight: '700',
    textAlign: 'right',
  },
  nameText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#102818',
    textAlign: 'right',
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e4efe8',
    width: '100%',
    shadowColor: '#234038',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  tipMascot: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  waveImg: {
    width: 220,
    height: 220,
    marginBottom: 4,
    borderRadius: 28,
    overflow: 'hidden',
  },
  waveHello: {
    fontSize: 20,
    fontWeight: '900',
    color: brand.green,
    textAlign: 'center',
    marginTop: 4,
  },
  heroTitle: {
    color: '#2f6b3a',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: brand.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 14,
  },
  playButton: {
    backgroundColor: brand.green,
    borderColor: brand.greenDark,
    width: '100%',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  infoCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e4efe8',
    gap: 12,
  },
  infoTextWrap: { flex: 1 },
  infoTitle: {
    fontWeight: '800',
    color: '#2f6b3a',
    fontSize: 16,
    textAlign: 'right',
    marginBottom: 4,
  },
  infoBody: {
    color: brand.muted,
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2f6b3a',
    textAlign: 'right',
    marginBottom: 10,
    marginTop: 4,
  },
  journeyCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e4efe8',
  },
  journeyEmoji: { fontSize: 32, marginBottom: 6 },
  journeyTitle: {
    color: '#2f6b3a',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  journeyBody: {
    color: brand.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  tipCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e4efe8',
    gap: 10,
    alignItems: 'center',
  },
  tipEmoji: { fontSize: 24 },
  tipText: { flex: 1 },
  tipTitle: {
    fontWeight: '800',
    color: brand.ink,
    textAlign: 'right',
    fontSize: 14,
  },
  tipBody: {
    color: brand.muted,
    textAlign: 'right',
    fontSize: 12,
    marginTop: 2,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(35, 64, 56, 0.35)',
    justifyContent: 'flex-start',
    paddingTop: 70,
    paddingHorizontal: 16,
  },
  settingsSheet: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#d7ebe3',
    borderBottomWidth: 5,
    borderBottomColor: '#cfe6db',
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: brand.ink,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: brand.greenSoft,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  userBannerText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  userBannerName: {
    fontSize: 16,
    fontWeight: '900',
    color: brand.ink,
    textAlign: 'right',
  },
  userBannerHint: {
    fontSize: 12,
    color: brand.muted,
    marginTop: 2,
    textAlign: 'right',
  },
  dataCard: {
    backgroundColor: '#f7fcf9',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#d7ebe3',
    paddingVertical: 4,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dceee6',
  },
  infoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRowText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  infoRowLabel: {
    fontSize: 11,
    color: brand.muted,
    textAlign: 'right',
  },
  infoRowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: brand.ink,
    textAlign: 'right',
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: brand.coral,
    borderRadius: 16,
    paddingVertical: 14,
    borderBottomWidth: 4,
    borderColor: '#e06548',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
})
