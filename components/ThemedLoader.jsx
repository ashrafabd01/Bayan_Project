import { ActivityIndicator, useColorScheme } from "react-native"
import { Colors } from "../constants/Color"
import ThemedView from "./ThemedView"

const Themedloader = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light

    return (
        <ThemedView style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <ActivityIndicator size="large" color={theme.text} />
        </ThemedView>
    )
}

export default Themedloader