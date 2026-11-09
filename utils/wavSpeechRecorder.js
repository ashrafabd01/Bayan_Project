import { Platform } from 'react-native'
import { Audio } from 'expo-av'

/**
 * تسجيل كلام الطفل بصيغة WAV 16kHz أحادي 16-bit
 * لأن نموذج wav2vec2 يتوقع PCM WAV (ليس m4a/mp3).
 *
 * iOS: LINEARPCM → ملف WAV حقيقي.
 * الويب: AudioContext → نبني رأس RIFF بأنفسنا.
 * أندرويد: نطلب .wav بعيّنة 16kHz؛ إن رفض الجهاز نرجع لأفضل جودة متاحة
 * ونضع needsServerConvert حتى يحوّل السيرفر بـ librosa قبل wav2vec.
 */

export const WAV2VEC_SAMPLE_RATE = 16000
export const WAV_MIME = 'audio/wav'

const WAV_RECORDING_OPTIONS = {
  isMeteringEnabled: true,
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: WAV2VEC_SAMPLE_RATE,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.MAX,
    sampleRate: WAV2VEC_SAMPLE_RATE,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/wav',
    bitsPerSecond: 256000,
  },
}

let nativeRecording = null
let usedNativeFallback = false
let webSession = null

function encodeWavPcm16(float32, sampleRate) {
  const n = float32.length
  const buffer = new ArrayBuffer(44 + n * 2)
  const view = new DataView(buffer)
  const str = (off, s) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(off + i, s.charCodeAt(i))
  }

  str(0, 'RIFF')
  view.setUint32(4, 36 + n * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  str(36, 'data')
  view.setUint32(40, n * 2, true)

  let off = 44
  for (let i = 0; i < n; i += 1) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }
  return buffer
}

function resampleMono(input, fromRate, toRate) {
  if (!fromRate || fromRate === toRate) return input
  const ratio = fromRate / toRate
  const newLen = Math.round(input.length / ratio)
  const out = new Float32Array(newLen)
  for (let i = 0; i < newLen; i += 1) {
    const x = i * ratio
    const i0 = Math.floor(x)
    const i1 = Math.min(i0 + 1, input.length - 1)
    const f = x - i0
    out[i] = input[i0] * (1 - f) + input[i1] * f
  }
  return out
}

function mergeFloatChunks(chunks) {
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Float32Array(total)
  let offset = 0
  chunks.forEach((c) => {
    out.set(c, offset)
    offset += c.length
  })
  return out
}

function isRiffWave(bytes) {
  if (!bytes || bytes.length < 12) return false
  const riff =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
  const wave =
    bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45
  return riff && wave
}

async function inspectWavHeader(uri) {
  try {
    const res = await Promise.race([
      fetch(uri),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
    ])
    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    return { isWav: isRiffWave(bytes), byteLength: bytes.length }
  } catch {
    return { isWav: false, byteLength: 0 }
  }
}

async function startWebWavRecording() {
  const nav = globalThis.navigator
  if (!nav?.mediaDevices?.getUserMedia) {
    throw new Error('NO_MIC')
  }

  const stream = await nav.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: WAV2VEC_SAMPLE_RATE,
      echoCancellation: true,
      noiseSuppression: true,
    },
  })

  const AC = globalThis.AudioContext || globalThis.webkitAudioContext
  const ctx = new AC({ sampleRate: WAV2VEC_SAMPLE_RATE })
  const source = ctx.createMediaStreamSource(stream)
  const processor = ctx.createScriptProcessor(4096, 1, 1)
  const chunks = []

  processor.onaudioprocess = (e) => {
    const data = e.inputBuffer.getChannelData(0)
    chunks.push(new Float32Array(data))
  }

  const mute = ctx.createGain()
  mute.gain.value = 0
  source.connect(processor)
  processor.connect(mute)
  mute.connect(ctx.destination)
  webSession = { stream, ctx, source, processor, mute, chunks }
}

function stopWebWavRecording() {
  const session = webSession
  webSession = null
  if (!session) return null

  try {
    session.processor.disconnect()
    session.source.disconnect()
    session.mute?.disconnect()
  } catch (_) {}
  session.stream.getTracks().forEach((t) => t.stop())
  const nativeRate = session.ctx.sampleRate || WAV2VEC_SAMPLE_RATE
  session.ctx.close?.()

  const merged = mergeFloatChunks(session.chunks)
  const pcm = resampleMono(merged, nativeRate, WAV2VEC_SAMPLE_RATE)
  const wavBuffer = encodeWavPcm16(pcm, WAV2VEC_SAMPLE_RATE)
  const blob = new Blob([wavBuffer], { type: WAV_MIME })
  const uri = URL.createObjectURL(blob)

  return {
    uri,
    blob,
    mimeType: WAV_MIME,
    sampleRate: WAV2VEC_SAMPLE_RATE,
    channels: 1,
    isWav: true,
    needsServerConvert: false,
    fileName: 'utterance.wav',
  }
}

async function startNativeWavRecording() {
  const perm = await Audio.requestPermissionsAsync()
  if (!perm.granted) throw new Error('NO_MIC')

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  })

  const rec = new Audio.Recording()
  usedNativeFallback = false
  try {
    await rec.prepareToRecordAsync(WAV_RECORDING_OPTIONS)
  } catch (e) {
    usedNativeFallback = true
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
  }
  await rec.startAsync()
  nativeRecording = rec
}

async function stopNativeWavRecording() {
  const rec = nativeRecording
  nativeRecording = null
  if (!rec) return null

  try {
    await rec.stopAndUnloadAsync()
  } catch (_) {}

  const uri = rec.getURI()
  if (!uri) return null

  const header = await inspectWavHeader(uri)
  const isWav = header.isWav || (!usedNativeFallback && Platform.OS === 'ios')

  return {
    uri,
    mimeType: WAV_MIME,
    sampleRate: WAV2VEC_SAMPLE_RATE,
    channels: 1,
    isWav,
    needsServerConvert: !isWav,
    fileName: 'utterance.wav',
  }
}

export async function startWavRecording() {
  await discardWavRecording()
  if (Platform.OS === 'web') {
    await startWebWavRecording()
    return
  }
  await startNativeWavRecording()
}

export async function stopWavRecording() {
  if (Platform.OS === 'web' || webSession) {
    return stopWebWavRecording()
  }
  return stopNativeWavRecording()
}

/** إيقاف دون إرجاع ملف (خروج من الشاشة) */
export async function discardWavRecording() {
  if (webSession) {
    try {
      webSession.processor.disconnect()
      webSession.source.disconnect()
      webSession.mute?.disconnect()
    } catch (_) {}
    webSession.stream.getTracks().forEach((t) => t.stop())
    webSession.ctx.close?.()
    webSession = null
  }
  if (nativeRecording) {
    try {
      await nativeRecording.stopAndUnloadAsync()
    } catch (_) {}
    nativeRecording = null
  }
}

export function wavToFormData(clip, fields = {}) {
  const form = new FormData()
  const fileName = clip.fileName || 'utterance.wav'
  const mime = clip.mimeType || WAV_MIME
  if (clip.blob) {
    form.append('audio', clip.blob, fileName)
  } else {
    form.append('audio', {
      uri: clip.uri,
      name: fileName,
      type: mime,
    })
  }
  form.append('sampleRate', String(clip.sampleRate || WAV2VEC_SAMPLE_RATE))
  form.append('channels', String(clip.channels || 1))
  form.append('needsServerConvert', clip.needsServerConvert ? 'true' : 'false')
  Object.entries(fields).forEach(([key, value]) => {
    form.append(key, typeof value === 'string' ? value : JSON.stringify(value))
  })
  return form
}
