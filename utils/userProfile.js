import AsyncStorage from '@react-native-async-storage/async-storage'

const profileKey = (email) =>
  `userProfile:${String(email || '').trim().toLowerCase()}`

function cleanText(value) {
  if (value == null) return ''
  return String(value).trim()
}

export async function saveUserProfile(profile) {
  if (!profile?.email) return null
  const email = cleanText(profile.email)
  const prev = (await getUserProfile(email)) || {}

  const nextFirst = cleanText(profile.firstName) || cleanText(prev.firstName)
  const nextLast = cleanText(profile.lastName) || cleanText(prev.lastName)
  const nextPhone = cleanText(profile.phone) || cleanText(prev.phone)

  const next = {
    ...prev,
    ...profile,
    email,
    firstName: nextFirst,
    lastName: nextLast,
    phone: nextPhone,
    birthDate: profile.birthDate || prev.birthDate || null,
    gender: profile.gender || prev.gender || null,
  }

  await AsyncStorage.setItem(profileKey(email), JSON.stringify(next))
  return next
}

export async function getUserProfile(email) {
  if (!email) return null
  try {
    const raw = await AsyncStorage.getItem(profileKey(email))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** فك Base64URL بدون الاعتماد على atob (قد يفشل في بعض بيئات RN) */
function base64UrlToUtf8(part) {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  let str = ''
  let i = 0
  const input = padded.replace(/[^A-Za-z0-9+/=]/g, '')
  while (i < input.length) {
    const enc1 = chars.indexOf(input.charAt(i++))
    const enc2 = chars.indexOf(input.charAt(i++))
    const enc3 = chars.indexOf(input.charAt(i++))
    const enc4 = chars.indexOf(input.charAt(i++))
    const bitmap = (enc1 << 18) | (enc2 << 12) | (enc3 << 6) | enc4
    if (enc3 !== 64) str += String.fromCharCode((bitmap >> 16) & 255)
    if (enc4 !== 64) str += String.fromCharCode((bitmap >> 8) & 255)
    if (enc3 !== 64 && enc4 !== 64) str += String.fromCharCode(bitmap & 255)
  }
  return str
}

export function decodeJwtPayload(token) {
  try {
    if (!token || typeof token !== 'string') return null
    const part = token.split('.')[1]
    if (!part) return null
    return JSON.parse(base64UrlToUtf8(part))
  } catch {
    return null
  }
}

export function getUserIdFromToken(token) {
  const payload = decodeJwtPayload(token)
  if (!payload) return null
  const id =
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
    payload.sub ||
    payload.nameid ||
    null
  const n = Number(id)
  return Number.isFinite(n) ? n : id
}

export function getEmailFromToken(token) {
  const payload = decodeJwtPayload(token)
  if (!payload) return ''
  const email =
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
    payload.email ||
    ''
  return cleanText(email)
}

/** الخادم حالياً يضع الاسم الأول في phone ويُرجع firstName/lastName فارغين */
export function namesFromApiUser(apiUser) {
  if (!apiUser) return { firstName: '', lastName: '', phone: '' }
  let firstName = cleanText(apiUser.firstName)
  let lastName = cleanText(apiUser.lastName)
  const phoneRaw = cleanText(apiUser.phone)
  const phoneIsDigits = /^\d+$/.test(phoneRaw)

  if (!firstName && phoneRaw && !phoneIsDigits) {
    firstName = phoneRaw
  }

  return {
    firstName,
    lastName,
    phone: phoneIsDigits ? phoneRaw : '',
  }
}

export async function fetchApiUser(userId) {
  if (userId == null || userId === '') return null
  try {
    const res = await fetch(
      `http://bayan.runasp.net/API/User/GetUserById/${userId}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function buildSessionUser({
  email,
  token,
  refreshToken,
  refreshTokenID,
  apiUser,
}) {
  const cleanEmail = cleanText(email) || getEmailFromToken(token)
  const local = (await getUserProfile(cleanEmail)) || {}
  const fromApi = namesFromApiUser(apiUser)
  const id = apiUser?.id || getUserIdFromToken(token)

  const firstName = cleanText(local.firstName) || fromApi.firstName
  const lastName = cleanText(local.lastName) || fromApi.lastName
  const phone =
    cleanText(local.phone) || fromApi.phone || cleanText(apiUser?.phone)

  const userInfo = {
    id,
    email: cleanEmail,
    firstName,
    lastName,
    phone,
    birthDate: local.birthDate || null,
    gender: local.gender || null,
    accessToken: token,
    refreshToken: refreshToken || null,
    refreshTokenID: refreshTokenID || null,
  }

  // لا نحفظ قيماً فارغة فوق الاسم المخزّن
  await saveUserProfile(userInfo)
  return userInfo
}

/** يُEnrich جلسة قديمة بلا اسم من التخزين المحلي أو الخادم */
export async function hydrateUserNames(user) {
  if (!user) return null

  const email = cleanText(user.email) || getEmailFromToken(user.accessToken)
  const hasName =
    cleanText(user.firstName) || cleanText(user.lastName)

  if (hasName && email) {
    await saveUserProfile({
      email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
    })
    return {
      ...user,
      email,
      firstName: cleanText(user.firstName),
      lastName: cleanText(user.lastName),
    }
  }

  let apiUser = null
  const userId = user.id || getUserIdFromToken(user.accessToken || user.token)
  if (userId) {
    apiUser = await fetchApiUser(userId)
  }

  return buildSessionUser({
    email: email || cleanText(apiUser?.email),
    token: user.accessToken || user.token || '',
    refreshToken: user.refreshToken,
    refreshTokenID: user.refreshTokenID,
    apiUser,
  })
}
