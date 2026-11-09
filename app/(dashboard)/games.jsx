import React from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ThemedView from '../../components/ThemedView'
import BayanBrandHeader from '../../components/BayanBrandHeader'
import { useRouter } from 'expo-router'
import { Colors } from '../../constants/Color'

const { brand } = Colors

const GAMES = [
  {
    route: '/games/levelTwo',
    title: 'صيد الفقاعات',
    desc: 'اضغط الفقاعات التي تُصدر صوتاً',
    icon: 'water-outline',
    accent: brand.sky,
  },
  {
    route: '/games/SameDiffGame',
    title: 'متشابه أم مختلف؟',
    desc: 'اسمع الصوتين واختر الزوج المناسب',
    icon: 'copy-outline',
    accent: '#7b68c6',
  },
  {
    route: '/games/SpaceStopGame',
    title: 'رحلة الفضاء',
    desc: 'اضغط عندما يتوقف الصوت',
    icon: 'rocket-outline',
    accent: '#3d7dff',
  },
  {
    route: '/games/LevelThree',
    title: 'مطابقة الأصوات',
    desc: 'طابق الصوت مع الصورة الصحيحة',
    icon: 'locate-outline',
    accent: '#f0a202',
  },
  // {
  //   route: '/games/SpaceGame',
  //   title: 'رحلة الفضاء',
  //   desc: 'رحلة صوتية بين النجوم',
  //   icon: 'rocket-outline',
  //   accent: '#5b8def',
  // },
  {
    route: '/games/closeEyes',
    title: 'من أين يأتي الصوت؟',
    desc: 'أغلق عينيك وحدد اتجاه الصوت',
    icon: 'headset-outline',
    accent: '#2f9e7a',
  },
  {
    route: '/games/FocusEarGame',
    title: 'أين مصدر الصوت؟',
    desc: 'اسمع الصوت واضغط على مصدره المشهد',
    icon: 'volume-medium-outline',
    accent: '#1aae9f',
  },
  // {
  //   route: '/games/SilenceGame',
  //   title: 'سكت الصوت!',
  //   desc: 'اسمع الصوت واضغط عندما يتوقف',
  //   icon: 'pause-circle-outline',
  //   accent: '#e06548',
  // },
]

const Games = () => {
  const router = useRouter()

  return (
    <ThemedView safe edges={['top', 'left', 'right']} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <BayanBrandHeader
          circular={false}
          logoVariant="gamer"
          title="هيا نلعب مع بيان"
          subtitle="اختر لعبة .. اسمع جيداً .. واستمتع"
        />

        <View style={styles.list}>
          {GAMES.map((game) => (
            <Pressable
              key={game.route}
              onPress={() => router.replace(game.route)}
              style={({ pressed }) => [
                styles.card,
                { opacity: pressed ? 0.92 : 1 },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${game.accent}33` }]}>
                <Ionicons name={game.icon} size={24} color={game.accent} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{game.title}</Text>
                <Text style={styles.cardDesc}>{game.desc}</Text>
              </View>
              <Ionicons name="chevron-back" size={20} color="#6fa32e" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  )
}

export default Games

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    paddingTop: 6,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#c5ddcc',
    borderBottomWidth: 4,
    shadowColor: '#234038',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#102818',
    textAlign: 'right',
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 13,
    color: '#1a3324',
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 19,
  },
})
