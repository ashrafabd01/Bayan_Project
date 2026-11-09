import { ImageBackground, View, StyleSheet } from 'react-native'

const NATURE_BG = require('../assets/img/focus/focus-bg.png')

/** نصوص واضحة فوق خلفية الحديقة */
export const natureText = StyleSheet.create({
  title: {
    color: '#102818',
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  body: {
    color: '#1a3324',
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.92)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  muted: {
    color: '#243f30',
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  banner: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 10,
    alignSelf: 'center',
    maxWidth: '100%',
  },
})

/** خلفية مشهد الحديقة المشتركة */
export default function GameNatureBackdrop({ children, dim = 0.5 }) {
  return (
    <ImageBackground source={NATURE_BG} style={styles.fill} resizeMode="cover">
      <View
        style={[styles.dim, { backgroundColor: `rgba(247, 251, 248, ${dim})` }]}
        pointerEvents="none"
      />
      {children}
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
  },
})
