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

const BAYAN_GAMES = [
  // {
  //   route: '/bayan/SpeechTest',
  //   title: 'اختبار النطق',
  //   desc: 'انطق الكلمة مع بيان وصحّح نطقك',
  //   icon: 'mic-outline',
  //   accent: brand.green,
  // },
  {
    route: '/bayan/LetterRetry',
    title: 'اختبار النطق',
    desc: 'انطق الكلمة مع بيان وصحح نطقك',
    //icon: 'reload-circle-outline',
    icon: 'mic-outline',
    accent: brand.green,
  },
]

export default function BayanHub() {
  const router = useRouter()

  return (
    <ThemedView safe edges={['top', 'left', 'right']} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <BayanBrandHeader
          circular={false}
          logoVariant="mic"
          title="قسم بيان للصوتيات"
          subtitle="ألعاب النطق والصوت"
        />

        <View style={styles.list}>
          {BAYAN_GAMES.map((game) => (
            <Pressable
              key={game.route}
              onPress={() => router.push(game.route)}
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 120,
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
