import { useSafeAreaInsets } from 'react-native-safe-area-context'

/** مسافة علوية آمنة للألعاب (نوتش / شريط الحالة) */
export default function useGameSafeTop(extra = 8) {
  const insets = useSafeAreaInsets()
  return Math.max(insets.top, 12) + extra
}
