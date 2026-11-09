import { useEffect, useState } from 'react'
import { Keyboard, Platform } from 'react-native'

/** ارتفاع لوحة المفاتيح لإضافة مساحة سفلية تسمح بالتمرير أثناء الكتابة */
export default function useKeyboardBottomInset() {
  const [bottomInset, setBottomInset] = useState(0)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const onShow = Keyboard.addListener(showEvent, (e) => {
      setBottomInset(e.endCoordinates?.height ?? 0)
    })
    const onHide = Keyboard.addListener(hideEvent, () => {
      setBottomInset(0)
    })

    return () => {
      onShow.remove()
      onHide.remove()
    }
  }, [])

  return bottomInset
}
