import React, { useState, useContext, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native'
import { Link, router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { UserContext } from '../../contexts/UserContext'
import { Colors } from '../../constants/Color'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ThemedView from '../../components/ThemedView'
import ThemedTextInput from '../../components/ThemedTextInput'
import useKeyboardBottomInset from '../../hooks/useKeyboardBottomInset'
import {
  buildSessionUser,
  fetchApiUser,
  getUserIdFromToken,
  saveUserProfile,
} from '../../utils/userProfile'

const { brand } = Colors
const bayanIcon = require('../../assets/img/bayan-icon.png')

function IconField({ label, icon, children }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.fieldFrame}>
        <View style={styles.fieldIcon}>
          <Ionicons name={icon} size={18} color="#9bb5ab" />
        </View>
        <View style={styles.fieldInputSlot}>{children}</View>
      </View>
    </View>
  )
}

const Login = () => {
  const params = useLocalSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { setUser } = useContext(UserContext)
  const scrollRef = useRef(null)
  const keyboardInset = useKeyboardBottomInset()

  // إن جاء المستخدم من صفحة التسجيل: عبّئ البريد واحفظ الاسم محلياً
  useEffect(() => {
    const pEmail = typeof params.email === 'string' ? params.email.trim() : ''
    const pFirst =
      typeof params.firstName === 'string' ? params.firstName.trim() : ''
    const pLast =
      typeof params.lastName === 'string' ? params.lastName.trim() : ''

    if (pEmail) setEmail(pEmail)
    if (pEmail && (pFirst || pLast)) {
      saveUserProfile({
        email: pEmail,
        firstName: pFirst,
        lastName: pLast,
      }).catch(() => {})
    }
  }, [params.email, params.firstName, params.lastName])

  const handleLogin = async () => {
    const cleanEmail = email.trim()
    const cleanPassword = password

    if (!cleanEmail || !cleanPassword) {
      Alert.alert('تنبيه', 'يرجى إدخال البريد الإلكتروني وكلمة المرور')
      return
    }

    setIsLoading(true)

    try {
      // احفظ أي اسم قادم من باراميترات التسجيل قبل بناء الجلسة
      const pFirst =
        typeof params.firstName === 'string' ? params.firstName.trim() : ''
      const pLast =
        typeof params.lastName === 'string' ? params.lastName.trim() : ''
      if (pFirst || pLast) {
        await saveUserProfile({
          email: cleanEmail,
          firstName: pFirst,
          lastName: pLast,
        })
      }

      const API_URL =
        `http://bayan.runasp.net/API/User/Login` +
        `?Email=${encodeURIComponent(cleanEmail)}` +
        `&Password=${encodeURIComponent(cleanPassword)}`

      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
        },
      })

      const rawText = await response.text()
      let data = null
      try {
        data = rawText ? JSON.parse(rawText) : null
      } catch {
        data = rawText
      }

      if (response.ok) {
        // الخادم يعيد accessToken وليس token، ولا يعيد الاسم
        const token = data?.accessToken || data?.token
        if (!token) {
          Alert.alert('فشل الدخول', 'تم الدخول لكن لم يُرجع الخادم رمز الجلسة.')
          return
        }

        const userId = data?.user?.id || data?.id || getUserIdFromToken(token)
        const apiUser = data?.user || (await fetchApiUser(userId))

        const userInfo = await buildSessionUser({
          email: cleanEmail,
          token,
          refreshToken: data?.refreshToken || null,
          refreshTokenID: data?.refreshTokenID || null,
          apiUser,
        })

        // تأكيد حفظ الاسم محلياً إن وُجد
        if (userInfo.firstName || userInfo.lastName) {
          await saveUserProfile(userInfo)
        }

        await AsyncStorage.setItem('userToken', token)
        if (data?.refreshToken) {
          await AsyncStorage.setItem('refreshToken', data.refreshToken)
        }
        await AsyncStorage.setItem('userData', JSON.stringify(userInfo))

        setUser(userInfo)
        router.replace('/profile')
        return
      }

      let errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      if (response.status === 429) {
        errorMessage =
          'محاولات كثيرة جداً. انتظر دقيقة ثم أعد المحاولة.'
      } else if (typeof data === 'string' && data.trim()) {
        errorMessage =
          /invalid credentials/i.test(data)
            ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            : data
      } else if (data?.message) {
        errorMessage = data.message
      } else if (data?.title) {
        errorMessage = data.title
      }

      Alert.alert('فشل الدخول', errorMessage)
    } catch (error) {
      Alert.alert('خطأ في الاتصال', 'تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.')
      console.error('Login Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ThemedView safe edges={['top', 'left', 'right']} style={styles.safeRoot}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.container,
            { paddingBottom: 56 + keyboardInset },
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
          bounces
          nestedScrollEnabled
          removeClippedSubviews={false}
          scrollEventThrottle={16}
        >
          <View style={styles.mascotWrap}>
            <View style={styles.mascotIcon}>
              <Image source={bayanIcon} style={styles.mascotImage} resizeMode="cover" />
            </View>
            <View style={styles.nameBanner}>
              <Text style={styles.brandName}>بيان</Text>
              <Text style={styles.title}>مرحباً مجدداً!</Text>
              <Text style={styles.sub}>سجّل دخولك لتكمل رحلتك مع بيان</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="log-in-outline" size={18} color={brand.green} />
              <Text style={styles.sectionTitle}>تسجيل الدخول</Text>
            </View>

            <IconField label="البريد الإلكتروني" icon="mail-outline">
              <ThemedTextInput
                style={styles.input}
                placeholder="email@example.com"
                placeholderTextColor="#a8bfb5"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setEmail}
                value={email}
                textAlign="right"
                onFocus={() =>
                  requestAnimationFrame(() =>
                    scrollRef.current?.scrollTo({ y: 80, animated: true })
                  )
                }
              />
            </IconField>

            <IconField label="كلمة المرور" icon="lock-closed-outline">
              <View style={styles.passwordRow}>
                <ThemedTextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor="#a8bfb5"
                  onChangeText={setPassword}
                  value={password}
                  secureTextEntry={!showPassword}
                  textAlign="right"
                  onFocus={() =>
                    requestAnimationFrame(() =>
                      scrollRef.current?.scrollTo({ y: 140, animated: true })
                    )
                  }
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9bb5ab"
                  />
                </TouchableOpacity>
              </View>
            </IconField>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>دخول</Text>
              )}
            </TouchableOpacity>
          </View>

          <Link href="/register" style={styles.linkWrap}>
            <Text style={styles.linkText}>ليس لديك حساب؟ إنشاء حساب</Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  )
}

export default Login

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  mascotWrap: {
    alignItems: 'center',
    marginBottom: 4,
  },
  mascotIcon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    overflow: 'hidden',
    backgroundColor: '#e8f5ec',
    borderWidth: 3,
    borderColor: '#cfe8d6',
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
  brandName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#2f7a1f',
    letterSpacing: 1,
    textAlign: 'center',
  },
  nameBanner: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#102818',
    marginTop: 4,
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    color: '#1a3324',
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e4efe8',
    shadowColor: '#234038',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    alignSelf: 'stretch',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2f6b3a',
    textAlign: 'right',
  },
  fieldWrap: {
    width: '100%',
    marginBottom: 12,
  },
  label: {
    alignSelf: 'stretch',
    textAlign: 'right',
    color: brand.ink,
    fontWeight: '700',
    marginBottom: 6,
    fontSize: 13,
  },
  fieldFrame: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#d7e6de',
    borderRadius: 16,
    backgroundColor: '#fff',
    minHeight: 50,
    paddingHorizontal: 10,
  },
  fieldIcon: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldInputSlot: {
    flex: 1,
  },
  input: {
    width: '100%',
    marginBottom: 0,
    borderRadius: 16,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 6,
    textAlign: 'right',
    fontSize: 14,
    color: brand.ink,
  },
  passwordRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  eyeBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: brand.green,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    borderBottomWidth: 5,
    borderColor: brand.greenDark,
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  linkWrap: { marginTop: 8, marginBottom: 8 },
  linkText: {
    color: brand.skyDark,
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
})
