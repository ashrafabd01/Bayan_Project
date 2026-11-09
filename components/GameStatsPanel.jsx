import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../constants/Color'

const { brand } = Colors

/** بطاقة نتيجة موحّدة لنهاية المستوى */
export default function GameStatsPanel({ headline, rows = [], dark = false }) {
  return (
    <View style={[styles.box, dark && styles.boxDark]}>
      {headline ? (
        <Text style={[styles.headline, dark && styles.headlineDark]}>{headline}</Text>
      ) : null}
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text
            style={[
              styles.value,
              dark && styles.valueDark,
              row.highlight && styles.hi,
            ]}
          >
            {row.value}
          </Text>
          <Text style={[styles.label, dark && styles.labelDark]}>
            {row.icon ? `${row.icon}  ${row.label}` : row.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d7e8dc',
  },
  boxDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: '#2a4570',
  },
  headline: {
    fontSize: 20,
    fontWeight: '900',
    color: brand.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  headlineDark: { color: '#fff' },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(35,64,56,0.08)',
  },
  label: {
    flex: 1,
    textAlign: 'right',
    color: brand.ink,
    fontWeight: '700',
    fontSize: 15,
  },
  labelDark: { color: '#cfe3ff' },
  value: {
    fontSize: 18,
    fontWeight: '900',
    color: brand.ink,
    marginLeft: 12,
  },
  valueDark: { color: '#fff' },
  hi: { color: brand.green, fontSize: 22 },
})
