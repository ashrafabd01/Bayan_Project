import { StyleSheet, useColorScheme, View } from 'react-native'
import { Colors } from '../constants/Color'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import GameNatureBackdrop from './GameNatureBackdrop'

/**
 * غلاف ثيم بيان مع دعم Safe Area لفتحة الكاميرا وشريط الحالة
 * استخدم safe={true} في الشاشات الكاملة
 * nature={false} لإلغاء خلفية الحديقة (مثل الفضاء أو الوضع الليلي)
 */
const ThemedView = ({
  style,
  safe = false,
  edges = ['top', 'right', 'bottom', 'left'],
  nature = true,
  ...props
}) => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light
  const insets = useSafeAreaInsets()

  const bg = nature ? 'transparent' : theme.background

  let inner
  if (!safe) {
    inner = (
      <View style={[{ backgroundColor: bg }, style, nature && { backgroundColor: 'transparent' }]} {...props} />
    )
  } else {
    const flat = StyleSheet.flatten(style) || {}
    const edgeSet = new Set(edges)

    const baseTop = Number(
      flat.paddingTop ?? flat.paddingVertical ?? flat.padding ?? 0
    )
    const baseBottom = Number(
      flat.paddingBottom ?? flat.paddingVertical ?? flat.padding ?? 0
    )
    const baseLeft = Number(
      flat.paddingLeft ?? flat.paddingHorizontal ?? flat.padding ?? 0
    )
    const baseRight = Number(
      flat.paddingRight ?? flat.paddingHorizontal ?? flat.padding ?? 0
    )

    inner = (
      <View
        style={[
          { backgroundColor: bg },
          style,
          nature && { backgroundColor: 'transparent' },
          {
            paddingTop: baseTop + (edgeSet.has('top') ? insets.top : 0),
            paddingBottom: baseBottom + (edgeSet.has('bottom') ? insets.bottom : 0),
            paddingLeft: baseLeft + (edgeSet.has('left') ? insets.left : 0),
            paddingRight: baseRight + (edgeSet.has('right') ? insets.right : 0),
          },
        ]}
        {...props}
      />
    )
  }

  if (!nature) return inner
  return <GameNatureBackdrop dim={0.52}>{inner}</GameNatureBackdrop>
}

export default ThemedView
