# ربط لعبة «تمرين الحرف» بنموذج wav2vec لاحقاً

هذا الملف للتعديل عند وصل كود الذكاء الاصطناعي.  
**لا تغيّر** `SpeechTest.jsx` (اختبار النطق الحالي). اللعبة الجديدة مستقلة.

| عنصر | القيمة |
|---|---|
| شاشة اللعبة | `app/(dashboard)/bayan/LetterRetry.jsx` |
| مسارها | `/bayan/LetterRetry` |
| التسجيل WAV | `utils/wavSpeechRecorder.js` |
| استدعاء النموذج | `utils/pronunciationAi.js` |
| المفتاح لإيقاف المحاكاة | `USE_MOCK_WAV2VEC` في `pronunciationAi.js` |

---

## 1) ماذا تفعل اللعبة الآن؟

1. الطفل يرى الكلمة (مثل **مدرسة**) بأحرف خضراء — **بدون** تلوين أحمر على اللوحة.
2. يضغط الميكروفون فيُسجَّل الصوت **WAV 16kHz أحادي 16-bit** (ما يتوقعه wav2vec2).
3. بعد 4 ثوانٍ أو عند الضغط مرة ثانية يتوقف التسجيل.
4. تُستدعى `analyzePronunciation`.
5. إن وُجد حرف خاطئ **تنبثق شاشة من خلفية اللعبة** تعرض الحرف وتطلب **أعد المحاولة**.
6. إن كان النطق مطابقاً تظهر شاشة نجاح.

حالياً الخطوة 4 **محاكاة** حتى يتوفر السيرفر: المحاولة الأولى تُظهر حرفاً خاطئاً (السين)، والثانية تُعدّ صحيحة حتى تختبر الواجهتين.

---

## 2) لماذا WAV تحديداً؟

نماذج **wav2vec2** تُدرَّب على موجة PCM:

- الامتداد / الحاوية: `.wav`
- التردد: **16000 Hz**
- القنوات: **1 (mono)**
- العيّنة: **PCM 16-bit little-endian**
- الرأس: `RIFF....WAVE`

لا ترسل mp3 أو m4a إلى النموذج مباشرة إلا بعد تحويلها في السيرفر إلى WAV 16kHz.

| المنصة | ماذا يحدث في التطبيق |
|---|---|
| iOS | `LINEARPCM` + امتداد `.wav` → ملف WAV حقيقي |
| الويب | `AudioContext` ثم بناء رأس RIFF في `encodeWavPcm16` |
| أندرويد | نطلب `.wav` و16kHz. بعض الأجهزة لا تكتب RIFF؛ عندها `needsServerConvert: true` ويجب التحويل في بايثون قبل النموذج |

---

## 3) تعديل واحد لتفعيل الذكاء — بدون لمس شاشة اللعب

في `utils/pronunciationAi.js`:

```js
export const USE_MOCK_WAV2VEC = false

export const PRONUNCIATION_API_URL =
  'http://bayan.runasp.net/API/Pronunciation/Analyze'
```

ضع عنوان خادمك إن اختلف. اللعبة تستدعي `analyzePronunciation` فقط؛ كل الربط هنا.

إن كان الـ API محميّاً، مرّر التوكن لاحقاً من شاشة اللعبة:

```js
await analyzePronunciation({
  clip,
  targetWord,
  targetLetters,
  attempt,
  token,
})
```

---

## 4) عقد الطلب والاستجابة (مهم للمبرمج الخلفي)

### الطلب

`POST /API/Pronunciation/Analyze`  
`Content-Type: multipart/form-data`

| الحقل | المعنى |
|---|---|
| `audio` | ملف `utterance.wav` |
| `targetWord` | الكلمة المطلوبة مثل `مدرسة` |
| `targetLetters` | JSON لمصفوفة الأحرف `["م","د","ر","س","ة"]` |
| `sampleRate` | `16000` |
| `channels` | `1` |
| `needsServerConvert` | `true` إن لم يكن الملف RIFF (غالباً أندرويد) |

### الاستجابة المتوقعة من النموذج بعد المقارنة

النموذج يفرّغ الكلام ثم **يقارن** مع الكلمة الصحيحة ويعيد الحرف الخاطئ:

```json
{
  "correct": false,
  "transcript": "مدرثة",
  "errorLetters": [
    {
      "index": 3,
      "expected": "س",
      "heard": "ث"
    }
  ]
}
```

| الحقل | المعنى |
|---|---|
| `correct` | `true` إن طابق النطق الكلمة |
| `transcript` | النص الذي فهمه wav2vec |
| `errorLetters` | الأحرف غير المطابقة. `index` من بداية الكلمة (0 = أول حرف) |
| `expected` | الحرف المطلوب لفظه |
| `heard` | ما سمعه النموذج في ذلك الموضع (قد يكون فارغاً إن سقط الحرف) |

إن أرجعت فقط `transcript` بدون `errorLetters`، التطبيق يقارن حرفاً بحرف عبر `findErrorLetters` في `pronunciationAi.js`.

نجاح كامل:

```json
{
  "correct": true,
  "transcript": "مدرسة",
  "errorLetters": []
}
```

---

## 5) مثال سيرفر بايثون (FastAPI + wav2vec2)

ثبّت تقريباً:

```
pip install fastapi uvicorn python-multipart transformers torch torchaudio librosa soundfile
```

نموذج عربي شائع للبداية (يمكن استبداله بنموذجكم المدرَّب):

`jonatasgrosman/wav2vec2-large-xlsr-53-arabic`

```python
# pronunciation_api.py
import io
import json
import tempfile
from pathlib import Path

import librosa
import soundfile as sf
from fastapi import FastAPI, File, Form, UploadFile
from transformers import pipeline

app = FastAPI()

asr = pipeline(
    "automatic-speech-recognition",
    model="jonatasgrosman/wav2vec2-large-xlsr-53-arabic",
)

TASHKEEL = dict.fromkeys(range(0x064B, 0x0660), None)

def normalize_ar(text: str) -> str:
    text = text.translate(TASHKEEL)
    text = text.replace("\u0640", "")
    for src, dst in (("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ى", "ي")):
        text = text.replace(src, dst)
    return "".join(text.split())

def to_wav16_mono(raw: bytes, suffix: str) -> str:
    """يضمن PCM WAV 16kHz أحادي قبل wav2vec."""
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(raw)
        src = tmp.name
    y, _ = librosa.load(src, sr=16000, mono=True)
    wav_path = src + ".wav"
    sf.write(wav_path, y, 16000, subtype="PCM_16")
    return wav_path

def diff_letters(target: list[str], transcript: str) -> list[dict]:
    heard = list(normalize_ar(transcript))
    errors = []
    for i, ch in enumerate(target):
        got = heard[i] if i < len(heard) else ""
        if normalize_ar(ch) != got:
            errors.append({"index": i, "expected": ch, "heard": got})
    return errors

@app.post("/API/Pronunciation/Analyze")
async def analyze(
    audio: UploadFile = File(...),
    targetWord: str = Form(...),
    targetLetters: str = Form("[]"),
    needsServerConvert: str = Form("false"),
):
    raw = await audio.read()
    suffix = Path(audio.filename or "utt.wav").suffix or ".wav"
    wav_path = to_wav16_mono(raw, suffix)

    result = asr(wav_path)
    transcript = result.get("text") or ""
    letters = json.loads(targetLetters) if targetLetters else list(targetWord)
    error_letters = diff_letters(letters, transcript)

    return {
        "correct": len(error_letters) == 0,
        "transcript": transcript,
        "errorLetters": error_letters,
    }
```

تشغيل تجريبي:

```
uvicorn pronunciation_api:app --host 0.0.0.0 --port 8000
```

ثم غيّر `PRONUNCIATION_API_URL` إلى هذا العنوان. على جهاز حقيقي استخدم IP الحاسوب لا `localhost`.

---

## 6) ماذا يفعل النموذج بالضبط؟

1. يقرأ WAV 16kHz.
2. wav2vec2 يحوّل الموجة إلى تمثيل ثم إلى حروف (CTC).
3. يُطبَّق تطبيع عربي (حذف تشكيل، توحيد الألف).
4. محاذاة مع `targetLetters`.
5. كل موضع مختلف يُعدّ حرفاً خاطئاً ويُعرض في الشاشة المنبثقة.

محاذاة حرف-بحرف كافية للكلمات القصيرة للأطفال. للكلمات الأطول يمكن لاحقاً استخدام **Levenshtein** وإرجاع موضع أول اختلاف فقط (اللعبة تعرض حرفاً واحداً بارزاً: `errorLetters[0]`).

---

## 7) اختبار الربط

1. شغّل الـ API وتأكد أن `USE_MOCK_WAV2VEC = false`.
2. افتح تبويب بيان → **تمرين الحرف**.
3. اسمح بالميكروفون.
4. انطق الكلمة بوضوح.
5. راقب لوج السيرفر: يجب أن يصل `utterance.wav`.
6. انطق عمداً حرفاً خطأ: تنبثق الشاشة بالحرف المطلوب وزر **أعد المحاولة**.
7. أعد التسجيل بشكل صحيح: شاشة «أحسنت».

إن ظهرت «تعذّر تحليل النطق»: عنوان الـ API، CORS (للويب)، أو التوكن.

---

## 8) ماذا لا تغيّره

- لا تعدّل `app/(dashboard)/bayan/SpeechTest.jsx`.
- لا تلوّن أحرف اللوحة الرئيسية بالأحمر في هذه اللعبة؛ الخطأ فقط في الشاشة المنبثقة.
- لا ترسل `require(...)` ولا صوراً. الملف الصوتي فقط + الكلمة المستهدفة.
- أبقِ التسجيل من `wavSpeechRecorder` حتى يبقى 16kHz WAV في مكان واحد.

---

## 9) تحسينات لاحقة (اختياري)

- استبدال النموذج العام بنموذجكم المدرَّب على نطق الأطفال.
- إرجاع أكثر من حرف خاطئ؛ الواجهة جاهزة لـ `errorLetters[0]` ويمكن عرض الباقي كصف.
- تشغيل صوت الحرف المطلوب عند ظهور الشاشة المنبثقة.
- حفظ الجلسات مثل `gameStatsStore` (مريض، كلمة، أخطاء، `synced`).
- على أندرويد: حزمة مثل `@siteed/expo-audio-studio` لـ WAV أصلي إن رغبتم بعدم التحويل في السيرفر.
