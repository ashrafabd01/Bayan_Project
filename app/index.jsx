import { StyleSheet, Text, View, ScrollView } from 'react-native'
import { Link } from 'expo-router'
import React from 'react'
import ThemedView from '../components/ThemedView'
import ThemedButton from '../components/ThemedButton'
import BayanBrandHeader from '../components/BayanBrandHeader'
import GuestOnly from '../components/auth/GuestOnly'
import { Colors } from '../constants/Color'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { Redirect } from 'expo-router';

const { brand } = Colors

const Home = () => {
  return <Redirect href="/(dashboard)/profile" />;
  // return (
  //   //<GuestOnly>
  //     <ThemedView safe style={styles.safeRoot}>
  //       <StatusBar style="dark" />

  //       <ScrollView
  //         style={styles.scroll}
  //         contentContainerStyle={styles.scrollContent}
  //         showsVerticalScrollIndicator={false}
  //       >
  //         <BayanBrandHeader
  //           title="أهلاً بك في عالم الأصوات!"
  //           subtitle="ألعاب ممتعة تساعد الأطفال على التعود على السمع من جديد"
  //         />

  //         <View style={styles.card}>
  //           <View style={styles.sectionHeader}>
  //             <Ionicons name="happy-outline" size={18} color={brand.green} />
  //             <Text style={styles.sectionTitle}>ابدأ رحلتك</Text>
  //           </View>

  //           <Link href="/login" asChild>
  //             <ThemedButton style={styles.primaryBtn}>
  //               <Text style={styles.btnText}>تسجيل الدخول</Text>
  //             </ThemedButton>
  //           </Link>
  //           <Link href="/register" asChild>
  //             <ThemedButton style={styles.secondaryBtn}>
  //               <Text style={styles.secondaryBtnText}>إنشاء حساب</Text>
  //             </ThemedButton>
  //           </Link>
  //         </View>

  //         <View style={styles.tipsCard}>
  //           <Text style={styles.tipItem}>🎧 ضع السماعات</Text>
  //           <Text style={styles.tipItem}>🏡 اختر مكاناً هادئاً</Text>
  //           <Text style={styles.tipItem}>⭐ العب كل يوم قليلاً</Text>
  //         </View>
  //       </ScrollView>
  //     </ThemedView>
  //   //</GuestOnly>
  //)
}

export default Home

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
    alignItems: 'center',
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
  primaryBtn: {
    backgroundColor: brand.green,
    borderColor: brand.greenDark,
    width: '100%',
  },
  secondaryBtn: {
    backgroundColor: '#fff',
    borderColor: '#d7e6de',
    width: '100%',
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
  secondaryBtnText: {
    color: '#2f6b3a',
    fontWeight: '800',
    fontSize: 17,
  },
  tipsCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e4efe8',
    gap: 10,
  },
  tipItem: {
    textAlign: 'right',
    color: brand.ink,
    fontSize: 15,
    fontWeight: '700',
  },
})
