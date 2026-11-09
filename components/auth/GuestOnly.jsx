import { useEffect } from "react"
import { useUser } from "../../hooks/useUser"
import { useRouter } from "expo-router"
import Themedloader from "../ThemedLoader"

const GuestOnly = ({children}) => {
    const {user} = useUser()
    const router = useRouter()

    useEffect(() => {
        if(user !== null) {
            router.replace('/profile')
        }
    }, [user])

    if (user) {
        return ( 
            <Themedloader/>
        )
    }

    return children
}

export default GuestOnly