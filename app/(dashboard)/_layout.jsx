import { Tabs } from 'expo-router'
import { Colors } from '../../constants/Color'
import { useColorScheme } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import UserOnly from '../../components/auth/UserOnly'
import GuestOnly from '../../components/auth/GuestOnly'

const { brand } = Colors

// شاشات تُعرض بملء الشاشة بلا شريط تبويبات
const FULLSCREEN_ROUTES = [
  'bayan/SpeechTest',
  'bayan/LetterRetry',
  'games/levelTwo',
  'games/LevelThree',
  'games/SpaceGame',
  'games/SpaceStopGame',
  'games/closeEyes',
  'games/FocusEarGame',
  'games/SameDiffGame',
  'games/SilenceGame',
  'patientRecord',
]

const HIDDEN_TAB = { href: null, tabBarStyle: { display: 'none' } }

/** شاشات ما بعد الدخول: تبويبات رئيسية + شاشات ألعاب مخفية من الشريط */
export default function DashboardLayout() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light

  return (
    //<UserOnly>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.navBackground,
            paddingTop: 8,
            height: 88,
            borderTopWidth: 0,
            elevation: 12,
            shadowColor: '#234038',
            shadowOpacity: 0.08,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: -2 },
          },
          tabBarLabelStyle: {
            fontWeight: '700',
            fontSize: 12,
            marginBottom: 6,
          },
          tabBarActiveTintColor: brand.green,
          tabBarInactiveTintColor: theme.iconColor,
          sceneStyle: { backgroundColor: theme.background },
        }}
      >
        <Tabs.Screen
          name="profile"
          options={{
            title: 'بيان',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                size={24}
                name={focused ? 'home' : 'home-outline'}
                color={focused ? brand.green : theme.iconColor}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="games"
          options={{
            title: 'الألعاب',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                size={24}
                name={focused ? 'game-controller' : 'game-controller-outline'}
                color={focused ? brand.green : theme.iconColor}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="bayan"
          options={{
            title: 'النطق',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                size={24}
                name={focused ? 'mic' : 'mic-outline'}
                color={focused ? brand.green : theme.iconColor}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'متابعة',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                size={24}
                name={focused ? 'medkit' : 'medkit-outline'}
                color={focused ? brand.green : theme.iconColor}
              />
            ),
          }}
        />
        {/* شاشات اللعب: تُفتح من قائمة الألعاب ولا تظهر في الشريط */}
        {FULLSCREEN_ROUTES.map((name) => (
          <Tabs.Screen key={name} name={name} options={HIDDEN_TAB} />
        ))}
      </Tabs>
    //</UserOnly>
  )
}
