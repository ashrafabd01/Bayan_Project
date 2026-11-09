import { View, Text, StyleSheet } from 'react-native'
import ThemedLogo from './ThemedLogo'
import { natureText } from './GameNatureBackdrop'

/** رأس الهوية: أيقونة/مشهد + اسم بيان + عنوان */
export default function BayanBrandHeader({
  title,
  subtitle,
  circular = true,
  logoVariant = 'side',
}) {
  return (
    <View style={styles.wrap}>
      {circular ? (
        <ThemedLogo circular style={styles.icon} />
      ) : (
        <ThemedLogo variant={logoVariant} style={styles.scene} />
      )}
      <View style={styles.nameBanner}>
        {/* <Text style={styles.brandName}>بيان</Text> */}
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    marginBottom: 2,
  },
  scene: {
    width: 190,
    height: 190,
    borderRadius: 24,
    overflow: 'hidden',
  },
  nameBanner: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    maxWidth: '100%',
  },
  brandName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#2f7a1f',
    letterSpacing: 1,
    textAlign: 'center',
  },
  title: {
    ...natureText.title,
    marginTop: 4,
    fontSize: 20,
  },
  subtitle: {
    ...natureText.muted,
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
})
