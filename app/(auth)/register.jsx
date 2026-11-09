import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native'
import { Link, router } from 'expo-router'
import React, { useRef, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'

import ThemedView from '../../components/ThemedView'
import ThemedTextInput from '../../components/ThemedTextInput'
import { Colors } from '../../constants/Color'
import useKeyboardBottomInset from '../../hooks/useKeyboardBottomInset'
import { saveUserProfile } from '../../utils/userProfile'

const bayanIcon = require('../../assets/img/bayan-icon.png')

const { brand } = Colors

function IconField({ label, icon, hint, children }) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.fieldFrame}>
        <View style={styles.fieldIcon}>
          <Ionicons name={icon} size={18} color="#9bb5ab" />
        </View>
        <View style={styles.fieldInputSlot}>{children}</View>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

const Register = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('Male')
  const [birthDate, setBirthDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef(null)
  const keyboardInset = useKeyboardBottomInset()

  const focusScroll = (yEstimate) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, yEstimate),
        animated: true,
      })
    })
  }

  const handleSignup = async () => {
    const payload = {
      userID: 0,
      email: email.trim(),
      passwordHash: password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      birthDate: birthDate.trim(),
      gender,
    }

    if (
      !payload.firstName ||
      !payload.lastName ||
      !payload.email ||
      !payload.passwordHash ||
      !payload.phone ||
      !payload.birthDate
    ) {
      Alert.alert('تنبيه', 'يرجى تعبئة جميع الحقول المطلوبة')
      return
    }

    if (payload.passwordHash.length < 8) {
      Alert.alert('تنبيه', 'يجب أن تكون كلمة المرور 8 أحرف على الأقل')
      return
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.birthDate)) {
      Alert.alert('تنبيه', 'يرجى إدخال تاريخ الميلاد بالصيغة الصحيحة: YYYY-MM-DD')
      return
    }

    const body = JSON.stringify(payload)
    setIsLoading(true)

    try {
      const API_URL = 'http://bayan.runasp.net/API/User/SignUp'

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body,
      })

      const rawText = await response.text()
      let data = null
      try {
        data = rawText ? JSON.parse(rawText) : null
      } catch {
        data = rawText
      }

      if (response.ok) {
        // الخادم لا يحفظ firstName/lastName بشكل موثوق؛ نحفظهما محلياً للملف الشخصي
        await saveUserProfile({
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: payload.phone,
          birthDate: payload.birthDate,
          gender: payload.gender,
        })

        Alert.alert('نجاح', 'تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.', [
          {
            text: 'تسجيل الدخول',
            onPress: () =>
              router.replace({
                pathname: '/login',
                params: {
                  email: payload.email,
                  firstName: payload.firstName,
                  lastName: payload.lastName,
                },
              }),
          },
        ])
      } else {
        let errorMessage = 'حدث خطأ أثناء إنشاء الحساب'
        if (data?.errors && typeof data.errors === 'object') {
          const keys = Object.keys(data.errors).filter(
            (k) => k && k.toLowerCase() !== 'signup'
          )
          const key = keys[0] || Object.keys(data.errors)[0]
          const msg = data.errors[key]?.[0]

          if (
            !key ||
            key.toLowerCase() === 'signup' ||
            /signUp field is required/i.test(msg || '')
          ) {
            errorMessage =
              'لم يصل طلب التسجيل إلى الخادم بشكل صحيح. تأكد من الاتصال وحاول مرة أخرى.'
          } else {
            errorMessage = msg || errorMessage
          }
        } else if (typeof data === 'string' && data.trim()) {
          errorMessage = data
        } else if (data?.message) {
          errorMessage = data.message
        } else if (typeof rawText === 'string' && rawText.trim()) {
          errorMessage = rawText
        }
        Alert.alert('فشل التسجيل', errorMessage)
      }
    } catch (error) {
      Alert.alert('خطأ في الاتصال', 'تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.')
      console.error('Signup Error:', error)
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
            styles.scrollContent,
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
              <Text style={styles.title}>انضم إلى عائلة بيان</Text>
              <Text style={styles.subtitle}>أنشئ حساباً وابدأ رحلة السمع الممتعة</Text>
            </View>
          </View>

          {/* البيانات الشخصية */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={18} color={brand.green} />
              <Text style={styles.sectionTitle}>البيانات الشخصية</Text>
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <IconField label="الاسم الأول" icon="person-outline">
                  <ThemedTextInput
                    style={styles.input}
                    placeholder="الاسم الأول"
                    placeholderTextColor="#a8bfb5"
                    value={firstName}
                    onChangeText={setFirstName}
                    textAlign="right"
                    onFocus={() => focusScroll(40)}
                  />
                </IconField>
              </View>
              <View style={styles.half}>
                <IconField label="اسم العائلة" icon="person-outline">
                  <ThemedTextInput
                    style={styles.input}
                    placeholder="اسم العائلة"
                    placeholderTextColor="#a8bfb5"
                    value={lastName}
                    onChangeText={setLastName}
                    textAlign="right"
                    onFocus={() => focusScroll(40)}
                  />
                </IconField>
              </View>
            </View>

            <IconField label="رقم الجوال" icon="call-outline">
              <ThemedTextInput
                style={styles.input}
                placeholder="رقم الجوال"
                placeholderTextColor="#a8bfb5"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textAlign="right"
                onFocus={() => focusScroll(140)}
              />
            </IconField>

            <Text style={styles.label}>الجنس</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[styles.genderChip, gender === 'Male' && styles.genderChipActive]}
                onPress={() => setGender('Male')}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="male"
                  size={16}
                  color={gender === 'Male' ? brand.greenDark : brand.muted}
                />
                <Text
                  style={[
                    styles.genderText,
                    gender === 'Male' && styles.genderTextActive,
                  ]}
                >
                  ذكر
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.genderChip, gender === 'Female' && styles.genderChipActive]}
                onPress={() => setGender('Female')}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="female"
                  size={16}
                  color={gender === 'Female' ? brand.greenDark : brand.muted}
                />
                <Text
                  style={[
                    styles.genderText,
                    gender === 'Female' && styles.genderTextActive,
                  ]}
                >
                  أنثى
                </Text>
              </TouchableOpacity>
            </View>

            <IconField label="تاريخ الميلاد" icon="calendar-outline" hint="YYYY-MM-DD">
              <ThemedTextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#a8bfb5"
                value={birthDate}
                onChangeText={setBirthDate}
                keyboardType="numbers-and-punctuation"
                textAlign="right"
                onFocus={() => focusScroll(280)}
              />
            </IconField>
          </View>

          {/* بيانات الحساب */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed" size={18} color={brand.green} />
              <Text style={styles.sectionTitle}>بيانات الحساب</Text>
            </View>

            <IconField label="البريد الإلكتروني" icon="mail-outline">
              <ThemedTextInput
                style={styles.input}
                placeholder="البريد الإلكتروني"
                placeholderTextColor="#a8bfb5"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setEmail}
                value={email}
                textAlign="right"
                onFocus={() => focusScroll(420)}
              />
            </IconField>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>كلمة المرور</Text>
              <View style={styles.fieldFrame}>
                <View style={styles.fieldIcon}>
                  <Ionicons name="lock-closed-outline" size={18} color="#9bb5ab" />
                </View>
                <View style={styles.fieldInputSlot}>
                  <ThemedTextInput
                    style={styles.input}
                    placeholder="كلمة المرور"
                    placeholderTextColor="#a8bfb5"
                    onChangeText={setPassword}
                    value={password}
                    secureTextEntry={!showPassword}
                    textAlign="right"
                    onFocus={() => focusScroll(520)}
                  />
                </View>
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9bb5ab"
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>يجب أن تكون 8 أحرف على الأقل</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonInner}>
                <Ionicons name="person-add" size={20} color="#fff" />
                <Text style={styles.buttonText}>إنشاء الحساب</Text>
              </View>
            )}
          </TouchableOpacity>

          <Link href="/login" style={styles.linkWrap}>
            <Text style={styles.linkText}>لديك حساب؟ تسجيل الدخول</Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  )
}

export default Register

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
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
    fontWeight: '900',
    fontSize: 20,
    color: '#102818',
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    color: '#1a3324',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 0,
    fontSize: 13,
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
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 10,
  },
  half: { flex: 1 },
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
  eyeBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    alignSelf: 'stretch',
    textAlign: 'right',
    color: brand.muted,
    fontSize: 11,
    marginTop: 5,
  },
  genderRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 12,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#d7e6de',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
    gap: 6,
  },
  genderChipActive: {
    backgroundColor: brand.greenSoft,
    borderColor: brand.green,
  },
  genderText: {
    color: brand.muted,
    fontWeight: '800',
    fontSize: 14,
  },
  genderTextActive: {
    color: brand.ink,
  },
  button: {
    width: '100%',
    backgroundColor: brand.green,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: brand.greenDark,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
  linkWrap: {
    marginTop: 18,
    marginBottom: 8,
  },
  linkText: {
    textAlign: 'center',
    color: brand.skyDark,
    fontWeight: '700',
    fontSize: 15,
  },
})
