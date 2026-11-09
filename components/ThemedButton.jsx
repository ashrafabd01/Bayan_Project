import { Pressable, StyleSheet } from 'react-native'
import React from 'react'
import { Colors } from '../constants/Color'

const { brand } = Colors

const ThemedButton = ({ style, ...props }) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        pressed && styles.pressed,
        style,
      ]}
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: brand.green,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 18,
    marginVertical: 8,
    borderBottomWidth: 5,
    borderColor: brand.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ translateY: 2 }],
    borderBottomWidth: 2,
  },
})

export default ThemedButton
