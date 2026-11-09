import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native'
import React, { useCallback, useState } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import ThemedView from '../../components/ThemedView'
import { Colors } from '../../constants/Color'
import { useUser } from '../../hooks/useUser'
import { fetchLinkedSpecialist } from '../../utils/patientSpecialist'

const { brand } = Colors
const BAYAN_DOCTOR = require('../../assets/img/bayan-doctor.png')

/**
 * لوحة متابعة المختص
 * لاحقاً: تقارير تقدم الأطفال المرضى ومتابعة الجلسات
 */
const DashBoard = () => {
  const router = useRouter()
  const { user } = useUser()
  const [specialist, setSpecialist] = useState(null)

  useFocusEffect(
    useCallback(() => {
      let alive = true
      fetchLinkedSpecialist(user)
        .then((found) => {
          if (alive) setSpecialist(found)
        })
        .catch(() => {
          if (alive) setSpecialist(null)
        })
      return () => {
        alive = false
      }
    }, [user])
  )

  return (
    <ThemedView safe edges={['top', 'left', 'right']} style={styles.safeRoot}>
      <View style={styles.center}>
        <View style={styles.mascotFrame}>
          <Image
            source={BAYAN_DOCTOR}
            style={styles.mascotImg}
            resizeMode="cover"
          />
        </View>
        <View style={styles.textCard}>
          <Text style={styles.title}>متابعة المختص</Text>
          <Text style={styles.body}>
            هنا سيتابع المختص تقدّم الطفل في الألعاب والجلسات العلاجية.
          </Text>
          {specialist ? (
            <View style={styles.specialistBox}>
              <View style={styles.specialistHead}>
                <Ionicons name="medkit" size={18} color={brand.greenDark} />
                <Text style={styles.specialistLabel}>المختص المرتبط</Text>
              </View>
              <Text style={styles.specialistName}>{specialist.name}</Text>
              {specialist.specialization ? (
                <Text style={styles.specialistMeta}>
                  التخصص: {specialist.specialization}
                </Text>
              ) : null}
              {specialist.typeOfTreatment ? (
                <Text style={styles.specialistMeta}>
                  نوع العلاج: {specialist.typeOfTreatment}
                </Text>
              ) : null}
            </View>
          ) : null}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>قريباً</Text>
          </View>
          <TouchableOpacity
            style={styles.recordBtn}
            onPress={() => router.push('/patientRecord')}
            activeOpacity={0.85}
          >
            <Text style={styles.recordBtnText}>سجل المريض</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  )
}

export default DashBoard

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 80,
  },
  mascotFrame: {
    width: 140,
    height: 140,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 14,
  },
  mascotImg: {
    width: '100%',
    height: '100%',
  },
  textCard: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#102818',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    color: '#1a3324',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 14,
  },
  specialistBox: {
    width: '100%',
    backgroundColor: 'rgba(232, 247, 212, 0.95)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: brand.greenDark,
    alignItems: 'center',
  },
  specialistHead: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  specialistLabel: {
    color: brand.greenDark,
    fontWeight: '800',
    fontSize: 13,
  },
  specialistName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102818',
    textAlign: 'center',
  },
  specialistMeta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#1a3324',
    textAlign: 'center',
  },
  badge: {
    backgroundColor: 'rgba(140, 198, 63, 0.35)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: brand.greenDark,
  },
  badgeText: {
    color: brand.greenDark,
    fontWeight: '800',
    fontSize: 14,
  },
  recordBtn: {
    marginTop: 14,
    backgroundColor: brand.green,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 18,
    borderBottomWidth: 5,
    borderColor: brand.greenDark,
    width: '100%',
    alignItems: 'center',
  },
  recordBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 17,
  },
})
