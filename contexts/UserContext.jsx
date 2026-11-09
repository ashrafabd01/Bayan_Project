import React, { createContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { hydrateUserNames } from '../utils/userProfile'

export const UserContext = createContext({})

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken')
      const savedUser = await AsyncStorage.getItem('userData')

      if (token && savedUser) {
        let parsed = JSON.parse(savedUser)
        if (!parsed.accessToken) parsed.accessToken = token

        // إن لم يوجد اسم في الجلسة القديمة، نحاول استرجاعه
        if (!parsed.firstName && !parsed.lastName) {
          parsed = (await hydrateUserNames(parsed)) || parsed
          await AsyncStorage.setItem('userData', JSON.stringify(parsed))
        }

        setUser(parsed)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error checking login status:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkLoginStatus()
  }, [])

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken')
      await AsyncStorage.removeItem('userData')
      await AsyncStorage.removeItem('refreshToken')
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <UserContext.Provider value={{ user, setUser, isLoading, logout }}>
      {children}
    </UserContext.Provider>
  )
}
