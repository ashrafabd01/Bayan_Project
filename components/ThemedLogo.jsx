import { Image, View, StyleSheet } from 'react-native'
import { BayanAssets } from '../constants/bayanAssets'

/**
 * شعار بيان
 * variant: 'side' | 'icon' | 'listen' | 'cheer' | 'think' | 'wave' | 'gamer' | 'mic'
 * circular: يعرض الأيقونة داخل دائرة (هوية تسجيل الدخول)
 */
const ThemedLogo = ({
  style,
  variant = 'side',
  circular = false,
  resizeMode = 'contain',
  ...props
}) => {
  const source = BayanAssets[variant] || BayanAssets.side

  if (circular) {
    const flat = StyleSheet.flatten([styles.circle, style]) || {}
    const size = Number(flat.width) || 112
    return (
      <View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size / 2 },
          style,
        ]}
        {...props}
      >
        <Image
          source={BayanAssets.icon}
          style={styles.circleImg}
          resizeMode="cover"
        />
      </View>
    )
  }

  return (
    <View style={[styles.rounded, { width: 220, height: 160 }, style]} {...props}>
      <Image
        resizeMode={resizeMode === 'contain' ? 'cover' : resizeMode}
        source={source}
        style={styles.roundedImg}
      />
    </View>
  )
}

export default ThemedLogo

const styles = StyleSheet.create({
  circle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    overflow: 'hidden',
    backgroundColor: '#e8f5ec',
    borderWidth: 3,
    borderColor: '#cfe8d6',
  },
  circleImg: {
    width: '100%',
    height: '100%',
  },
  rounded: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  roundedImg: {
    width: '100%',
    height: '100%',
  },
})
