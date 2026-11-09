# -*- coding: utf-8 -*-
"""
يولّد مستند Word يشرح واجهات تطبيق بيان والتقنيات المستخدمة وطريقة بناء الألعاب.
التشغيل: python docs/generate_frontend_doc.py
"""
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

GREEN = (0x52, 0x85, 0x2D)
INK = (0x18, 0x37, 0x2B)
MUTED = (0x53, 0x6F, 0x63)
CODE_BG = "F3F6F4"

doc = Document()
section = doc.sections[0]
section.right_margin = Cm(2)
section.left_margin = Cm(2)
section.top_margin = Cm(1.8)
section.bottom_margin = Cm(1.8)


def set_rtl(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    pPr = paragraph._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    bidi.set(qn("w:val"), "1")
    pPr.append(bidi)


def run(paragraph, text, size=13, bold=False, color=None, font="Arial"):
    r = paragraph.add_run(text)
    r.bold = bold
    r.font.name = font
    r.font.size = Pt(size)
    r._element.get_or_add_rPr().rFonts.set(qn("w:cs"), font)
    if color:
        r.font.color.rgb = RGBColor(*color)
    return r


def title(text):
    p = doc.add_paragraph()
    set_rtl(p)
    run(p, text, 24, True, INK)
    p.paragraph_format.space_after = Pt(4)


def h1(text):
    p = doc.add_paragraph()
    set_rtl(p)
    run(p, text, 17, True, GREEN)
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(6)


def h2(text):
    p = doc.add_paragraph()
    set_rtl(p)
    run(p, text, 14, True, INK)
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)


def body(text, size=13):
    p = doc.add_paragraph()
    set_rtl(p)
    run(p, text, size)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.line_spacing = 1.3
    return p


def note(text):
    p = doc.add_paragraph()
    set_rtl(p)
    run(p, text, 11, False, MUTED)
    p.paragraph_format.space_after = Pt(8)


def bullet(text):
    p = doc.add_paragraph(style="List Bullet")
    set_rtl(p)
    run(p, text, 13)
    p.paragraph_format.space_after = Pt(3)


def shade(cell_or_para, color=CODE_BG):
    el = cell_or_para._p.get_or_add_pPr() if hasattr(cell_or_para, "_p") else None
    if el is None:
        return
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:fill"), color)
    el.append(shd)


def code(snippet, caption=None):
    """مقطع كود بخط ثابت العرض واتجاه من اليسار لليمين"""
    if caption:
        p = doc.add_paragraph()
        set_rtl(p)
        run(p, caption, 11, True, MUTED)
        p.paragraph_format.space_after = Pt(2)

    for line in snippet.strip("\n").split("\n"):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        pf = p.paragraph_format
        pf.space_after = Pt(0)
        pf.space_before = Pt(0)
        pf.left_indent = Cm(0.4)
        pf.line_spacing = 1.0
        shade(p)
        run(p, line if line else " ", 9.5, font="Consolas")

    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(8)


def table(headers, rows):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = "Light Grid Accent 1"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, head in enumerate(headers):
        cell = t.rows[0].cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        set_rtl(p)
        run(p, head, 11, True)
    for row in rows:
        cells = t.add_row().cells
        for i, value in enumerate(row):
            p = cells[i].paragraphs[0]
            set_rtl(p)
            run(p, value, 11)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)


# ==========================================================
title("تطبيق بيان — شرح الواجهة الأمامية والألعاب")
note(
    "مستند مرجعي للنوطة: يشرح كل واجهة في التطبيق، والتقنيات التي بُني بها، "
    "وطريقة بناء الألعاب السمعية، مع أمثلة من الكود الفعلي للمشروع."
)

# ---------------------------------------------------------- 1
h1("1. نظرة عامة على التطبيق")
body(
    "بيان تطبيق هاتف محمول موجّه للأطفال الذين استعادوا السمع حديثاً، سواء عبر "
    "زراعة القوقعة أو المعينات السمعية. الهدف ليس عرض معلومات، بل تدريب الطفل "
    "على مهارات سمعية محددة من خلال ألعاب قصيرة ومتدرّجة الصعوبة."
)
body(
    "تنقسم واجهات التطبيق إلى ثلاث مجموعات: واجهات الوصول (الترحيب، الدخول، "
    "إنشاء الحساب)، والواجهات الرئيسية (الملف الشخصي، قائمة الألعاب، قسم بيان، "
    "متابعة المختص)، ثم شاشات الألعاب نفسها."
)

h2("المهارات السمعية التي تدرّبها الألعاب")
table(
    ["اللعبة", "المهارة المستهدفة"],
    [
        ("صيد الفقاعات", "الانتباه السمعي والتمييز بين وجود صوت وغيابه"),
        ("مطابقة الأصوات", "ربط الصوت بمصدره وتذكّر ترتيب الأصوات"),
        ("من أين يأتي الصوت؟", "تحديد اتجاه الصوت (يمين / يسار)"),
        ("أين مصدر الصوت؟", "التعرّف على الصوت داخل مشهد مزدحم"),
        ("رحلة الفضاء", "سرعة الاستجابة للإشارة الصوتية"),
    ],
)

# ---------------------------------------------------------- 2
h1("2. التقنيات المستخدمة")

h2("2.1 إطار العمل والأدوات")
table(
    ["التقنية", "الدور في المشروع"],
    [
        ("React Native", "إطار العمل الأساسي لبناء التطبيق على Android و iOS"),
        ("Expo", "منصة تطوير فوق React Native: تشغيل واختبار ونشر أسهل"),
        ("Expo Router", "التنقل بين الشاشات اعتماداً على بنية المجلدات"),
        ("expo-av", "تشغيل الملفات الصوتية وضبط اتجاه الصوت"),
        ("AsyncStorage", "تخزين جلسة المستخدم وبياناته على الجهاز"),
        ("Animated (React Native)", "حركات الفقاعات والصاروخ والنبضات"),
        ("@expo/vector-icons", "أيقونات الواجهة"),
        ("react-native-safe-area-context", "تفادي النوتش وشريط الحالة"),
    ],
)
body(
    "لغة البرمجة هي JavaScript مع صيغة JSX. أما الخادم فمبني على ASP.NET ويتواصل "
    "معه التطبيق عبر REST API."
)

h2("2.2 التنقل عبر بنية المجلدات")
body(
    "يعتمد Expo Router على أسماء المجلدات والملفات لتوليد المسارات، فلا حاجة "
    "لتعريف كل شاشة يدوياً. المجلدات بين قوسين مثل (auth) تجمع شاشات متشابهة "
    "دون أن تظهر في المسار."
)
code(
    """
app/
  index.jsx                → شاشة الترحيب
  (auth)/
    login.jsx              → /login
    register.jsx           → /register
  (dashboard)/
    profile.jsx            → /profile
    games.jsx              → /games
    bayan.jsx              → /bayan
    dashboard.jsx          → /dashboard
    games/levelTwo.jsx     → /games/levelTwo
    games/LevelThree.jsx   → /games/LevelThree
""",
    "بنية المسارات",
)

h2("2.3 حماية الشاشات")
body(
    "قُسّمت الشاشات إلى نوعين: شاشات للزوار فقط (الدخول والتسجيل)، وشاشات "
    "للمستخدم المسجّل فقط. يتحقق مكوّن UserOnly من الجلسة، ويعرض شاشة تحميل "
    "أثناء الفحص، ثم يوجّه غير المسجّل إلى صفحة الدخول."
)
code(
    """
const UserOnly = ({ children }) => {
  const { user, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user === null) {
      router.replace('/login')
    }
  }, [user, isLoading])

  if (isLoading) return <ThemedLoader />
  return user ? children : null
}
""",
    "components/auth/UserOnly.jsx",
)

h2("2.4 إدارة جلسة المستخدم")
body(
    "تُحفظ بيانات المستخدم في UserContext ليصل إليها أي مكوّن دون تمريرها عبر "
    "الخصائص. عند فتح التطبيق يُقرأ التوكن من ذاكرة الجهاز؛ فإن وُجد تُستعاد "
    "الجلسة تلقائياً وإلا عُرضت شاشة الدخول."
)
code(
    """
const token = await AsyncStorage.getItem('userToken')
const savedUser = await AsyncStorage.getItem('userData')

if (token && savedUser) {
  let parsed = JSON.parse(savedUser)
  if (!parsed.accessToken) parsed.accessToken = token
  setUser(parsed)
} else {
  setUser(null)
}
""",
    "contexts/UserContext.jsx — استعادة الجلسة",
)

# ---------------------------------------------------------- 3
h1("3. الهوية البصرية والمكوّنات المشتركة")
body(
    "وُحّدت الألوان والخلفيات في ملفات مركزية، فأي تعديل على الهوية ينتقل إلى "
    "كل الشاشات تلقائياً. الألوان مستوحاة من الببغاء «بيان»: أخضر وسماوي "
    "وأصفر بدرجات هادئة مناسبة للأطفال."
)

h2("3.1 ملف الألوان")
code(
    """
export const Colors = {
  brand: {
    green: '#8cc63f',
    sky: '#6BCBEE',
    yellow: '#FFC107',
    ink: '#234038',
    ...
  },
}
""",
    "constants/Color.js",
)

h2("3.2 الخلفية الموحّدة")
body(
    "كل شاشة تُغلَّف بخلفية طبيعية واحدة مع طبقة تفتيح شفافة تجعل النصوص "
    "مقروءة فوق الصورة."
)
code(
    """
export default function GameNatureBackdrop({ children, dim = 0.5 }) {
  return (
    <ImageBackground source={NATURE_BG} style={styles.fill} resizeMode="cover">
      <View
        style={[styles.dim, { backgroundColor: `rgba(247, 251, 248, ${dim})` }]}
        pointerEvents="none"
      />
      {children}
    </ImageBackground>
  )
}
""",
    "components/GameNatureBackdrop.jsx",
)

h2("3.3 قائمة المكوّنات المشتركة")
table(
    ["المكوّن", "الوظيفة"],
    [
        ("ThemedView", "غلاف الشاشة مع الخلفية ومسافات المنطقة الآمنة"),
        ("ThemedButton", "زر موحّد الشكل بحدّ سفلي بارز"),
        ("ThemedTextInput", "حقل إدخال موحّد للنماذج"),
        ("ThemedLogo", "شعار بيان بعدة أشكال (دائري / مشهد)"),
        ("BayanBrandHeader", "رأس الشاشة: شعار + عنوان + وصف"),
        ("GameNatureBackdrop", "خلفية المشاهد الموحّدة"),
        ("UserOnly / GuestOnly", "حماية الشاشات حسب حالة الدخول"),
        ("useGameSafeTop", "حساب المسافة العلوية الآمنة في الألعاب"),
    ],
)

# ---------------------------------------------------------- 4
h1("4. شرح الواجهات")

h2("4.1 شاشة الترحيب")
body(
    "أول ما يراه المستخدم. تعرض شعار بيان وزرَّي «تسجيل الدخول» و«إنشاء حساب»، "
    "مع بطاقة نصائح قصيرة (استخدام السماعات، اختيار مكان هادئ، اللعب اليومي) "
    "لأنها تؤثر فعلياً على جودة التدريب السمعي. الشاشة محميّة بمكوّن GuestOnly "
    "فلا تظهر لمستخدم مسجّل."
)

h2("4.2 تسجيل الدخول")
body(
    "نموذج بريد إلكتروني وكلمة مرور. عند الإرسال يُطلب الخادم، وإذا نجح الدخول "
    "يُخزَّن التوكن وبيانات المستخدم على الجهاز ثم يُنتقل إلى الملف الشخصي. "
    "الحقول مصمّمة بأيقونة داخلية لكل حقل، ويرتفع المحتوى تلقائياً عند ظهور "
    "لوحة المفاتيح."
)
code(
    """
const response = await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
""",
    "app/(auth)/login.jsx — طلب الدخول",
)

h2("4.3 إنشاء حساب")
body(
    "نموذج أطول: الاسم الأول والأخير، البريد، كلمة المرور وتأكيدها، تاريخ "
    "الميلاد والجنس. تُتحقَّق المدخلات قبل الإرسال، وتُحفظ البيانات محلياً حتى "
    "تظهر في الملف الشخصي بعد الدخول."
)

h2("4.4 الملف الشخصي")
body(
    "الشاشة الأولى بعد الدخول. تعرض ترحيباً باسم الطفل، ومعلوماته الأساسية في "
    "صفوف مقروءة، وزر تسجيل الخروج. تُقرأ البيانات من الجلسة المحفوظة، وإن كانت "
    "جلسة قديمة بلا اسم تُستكمل من الخادم عبر دالة hydrateUserNames."
)

h2("4.5 قائمة الألعاب")
body(
    "قلب التطبيق. تُعرض الألعاب كبطاقات، كل بطاقة تحمل أيقونة ولوناً مميّزاً "
    "وعنواناً ووصفاً قصيراً يفهمه الطفل. القائمة معرّفة كمصفوفة بيانات، فإضافة "
    "لعبة جديدة لا تتطلب تعديل واجهة العرض."
)
code(
    """
const GAMES = [
  {
    route: '/games/levelTwo',
    title: 'صيد الفقاعات',
    desc: 'اضغط الفقاعات التي تُصدر صوتاً',
    icon: 'water-outline',
    accent: brand.sky,
  },
  ...
]

{GAMES.map((game) => (
  <Pressable key={game.route} onPress={() => router.replace(game.route)}>
    ...
  </Pressable>
))}
""",
    "app/(dashboard)/games.jsx",
)

h2("4.6 قسم بيان للصوتيات")
body(
    "قسم مخصص لتمارين النطق، ويحتوي حالياً على «اختبار النطق». فُصل عن قائمة "
    "الألعاب لأن تمارين النطق تعتمد على الميكروفون ومعالجة الكلام، بينما ألعاب "
    "السمعيات تعتمد على الاستماع فقط."
)

h2("4.7 اختبار النطق")
body(
    "تُعرض كلمة عربية ويُطلب من الطفل نطقها. بعد التحليل تُلوَّن الأحرف التي "
    "أخطأ فيها بالأحمر ليعرف موضع الخطأ بدقة. الواجهة جاهزة وتنتظر ربطها "
    "بنموذج تحليل النطق."
)
note(
    "مشكلة تقنية واجهناها: React Native يكسر ربط الحروف العربية عند تلوين كل "
    "حرف في عنصر نصي منفصل، فتظهر الكلمة «م د ر س ة» مفكّكة. الحل كان تحويل "
    "الأحرف إلى أشكال العرض الموصولة (Presentation Forms) قبل عرضها."
)
code(
    """
function WordLetters({ letters, errorIndexes }) {
  const shaped = shapeArabicLetters(letters)   // تحويل لأشكال موصولة

  return (
    <View style={styles.lettersRow}>
      {shaped.map((ch, i) => (
        <Text
          key={i}
          style={[styles.letter, errorIndexes.includes(i) && styles.letterError]}
        >
          {ch}
        </Text>
      ))}
    </View>
  )
}
""",
    "app/(dashboard)/bayan/SpeechTest.jsx",
)

h2("4.8 متابعة المختص")
body(
    "واجهة مخصصة للمختص لمتابعة تقدّم الأطفال وعرض إحصائياتهم. مُعدّة في التطبيق "
    "وتنتظر ربطها بتقارير الجلسات من الخادم."
)

# ---------------------------------------------------------- 5
h1("5. كيف بُنيت الألعاب")

h2("5.1 البنية المشتركة لكل لعبة")
body(
    "كل الألعاب تتبع النمط نفسه: شاشة تعريف، ثم اختيار مستوى، ثم اللعب، ثم "
    "نتيجة الجولة. تُدار هذه المراحل بحالة واحدة اسمها screen، فتُعرض الواجهة "
    "المناسبة لكل مرحلة داخل ملف واحد."
)
code(
    """
// home | learn | levels | play | feedback
const [screen, setScreen] = useState('home')

if (screen === 'home') return ( ... )
if (screen === 'learn') return ( ... )
if (screen === 'levels') return ( ... )
""",
    "نمط إدارة الشاشات داخل اللعبة",
)

body(
    "أما المستويات فتُعرَّف كبيانات لا كشيفرة. كل مستوى كائن يحدّد عدد الأصوات "
    "ووجود الضوضاء ولونه، فتغيير الصعوبة أو إضافة مستوى جديد يحدث في مكان واحد."
)
code(
    """
const LEVELS = {
  1: { sequenceLength: 1, hasBgNoise: false, desc: 'صوت واحد' },
  2: { sequenceLength: 2, hasBgNoise: false, desc: 'صوتان — بالترتيب' },
  3: { sequenceLength: 3, hasBgNoise: false, desc: 'ثلاثة أصوات' },
  4: { sequenceLength: 3, hasBgNoise: true,  desc: 'ثلاثة أصوات + ضوضاء' },
}
""",
    "تعريف المستويات كبيانات",
)

h2("5.2 إدارة الصوت — أهم تحدٍّ تقني")
body(
    "الصوت هو جوهر التطبيق، وقد واجهنا معه مشكلتين حقيقيتين. الأولى أن كل مقطع "
    "صوتي يحتفظ بذاكرة، فإن لم يُحرَّر عند الخروج تراكمت الأصوات وتشوّش التشغيل. "
    "والثانية أن الطفل قد يخرج من المستوى قبل أن ينتهي تحميل المقطع، فيُشغَّل "
    "الصوت بعد مغادرة الشاشة."
)
body(
    "حُلّت المشكلة الأولى بتحرير كل مقطع بعد الانتهاء منه. أما الثانية فبفكرة "
    "«رقم الجلسة»: كل جولة تأخذ رقماً، وقبل تشغيل أي صوت نتحقق أن الرقم لم "
    "يتغيّر؛ فإن تغيّر يعني أن اللاعب خرج، فيُحرَّر المقطع بدل تشغيله."
)
body(
    "وبما أن الألعاب الخمسة تحتاج المنطق نفسه، جُمع في وحدة واحدة "
    "utils/gameAudio.js تستخدمها كل الألعاب."
)
code(
    """
/** يوقف المقطع ويحرّر ذاكرته ويصفّر المرجع — آمن للاستدعاء المتكرر */
export async function releaseSound(ref) {
  if (!ref) return
  const sound = ref.current
  ref.current = null
  if (!sound) return
  try { sound.setOnPlaybackStatusUpdate(null) } catch (_) {}
  try { await sound.stopAsync() } catch (_) {}
  try { await sound.unloadAsync() } catch (_) {}
}

/** يشغّل مقطعاً بعد تحرير ما قبله، ويلغيه إن انتهت الجلسة */
export async function playSound(ref, source, options = {}) {
  const { loop = false, volume = 1, isStale, ...rest } = options
  await releaseSound(ref)

  const { sound } = await Audio.Sound.createAsync(source, {
    shouldPlay: true,
    isLooping: loop,
    volume,
    ...rest,
  })

  if (isStale?.()) {                    // خرج اللاعب أثناء التحميل
    await sound.unloadAsync().catch(() => {})
    return null
  }

  ref.current = sound
  return sound
}
""",
    "utils/gameAudio.js",
)
body("وهكذا يصبح تشغيل ضوضاء الخلفية في أي لعبة سطراً واحداً:")
code(
    """
await playSound(bgSoundRef, scene.sounds[0], {
  loop: true,
  volume: 0.3,
  isStale,
})
""",
    "استخدام الوحدة داخل لعبة",
)

h2("5.3 لعبة صيد الفقاعات")
body(
    "تصعد فقاعات من أسفل الشاشة، بعضها يُصدر صوتاً وبعضها صامت، وعلى الطفل "
    "الضغط على الصوتية فقط. تُولَّد الفقاعات على فترات منتظمة، وتُحرَّك حركتها "
    "بواجهة Animated، ويؤدي الضغط على فقاعة صامتة إلى خطأ. ثلاثة أخطاء تنهي "
    "الجولة."
)
body(
    "الفكرة التدريبية: تمييز وجود الصوت من غيابه وسط مؤثرات بصرية جاذبة، مع "
    "ضوضاء خلفية في المستويات المتقدمة."
)

h2("5.4 لعبة مطابقة الأصوات")
body(
    "تنقسم إلى مرحلتين. في «استكشف وتعلّم» تُختار أربع بطاقات عشوائياً من "
    "مجموعة أكبر، ويضغط الطفل أي بطاقة ليسمع صوتها. ثم في مرحلة التحدي تُشغَّل "
    "الأصوات بالتسلسل وعليه الضغط على البطاقات بالترتيب نفسه — والبطاقات "
    "المعروضة هي التي تعلّمها فقط."
)
code(
    """
const CARD_DECK = [
  {
    id: 'horse',
    name: 'حصان',
    image: require('../../../assets/img/cards/card-horse.png'),
    sound: require('../../../assets/audio/horse-sound.mp3'),
  },
  ...
]

const picked = pickRandom(CARD_DECK, LEARN_COUNT)   // أربع بطاقات عشوائية
""",
    "مجموعة البطاقات قابلة للتوسيع",
)
body(
    "التحقق من الترتيب بسيط: نحتفظ بموضع الخطوة الحالية، وأي بطاقة تخرج عن "
    "الترتيب تُنهي الجولة."
)
code(
    """
const handleCardPress = (card) => {
  if (card.id !== sequence[stepIndex].id) {
    setFeedback('error')
    setScreen('feedback')
    return
  }

  setPickedIds((ids) => [...ids, card.id])

  if (stepIndex + 1 >= sequence.length) {
    setScore((s) => s + 1)
    setFeedback('success')
    setScreen('feedback')
    return
  }

  setStepIndex((i) => i + 1)
}
""",
    "app/(dashboard)/games/LevelThree.jsx",
)

h2("5.5 لعبة من أين يأتي الصوت؟")
body(
    "أصعب لعبة تقنياً. يُطلب من الطفل إغماض عينيه، ثم يُشغَّل صوت من جهة اليمين "
    "أو اليسار، وعليه بعد فتح عينيه تحديد الجهة. تدرّب هذه اللعبة على تحديد "
    "مصدر الصوت، وهي مهارة أساسية للأمان في الحياة اليومية."
)
body(
    "التوجيه يتم بخاصية audioPan التي توزّع الصوت بين القناتين: قيمة ‎-1‎ لليسار "
    "و‎+1‎ لليمين. وقد تطلّب ذلك تحميل المقطع متوقفاً أولاً، ثم ضبط الاتجاه "
    "والتشغيل في خطوة واحدة."
)
code(
    """
const PAN_BY_DIRECTION = { left: -1, right: 1 }

const sound = await playSound(soundRef, source, {
  shouldPlay: false,                        // نحمّله متوقفاً
  androidImplementation: 'MediaPlayer',     // شرط عمل audioPan
  isStale: () => sessionRef.current !== sessionId,
})

await sound.setStatusAsync({
  audioPan: PAN_BY_DIRECTION[direction] ?? 0,
  volume: 1,
  shouldPlay: true,
})
""",
    "app/(dashboard)/games/closeEyes.jsx",
)
note(
    "ملاحظة مهمة: الملفات الصوتية يجب أن تكون ثنائية القناة (Stereo)، وإلا لم "
    "يُسمع فرق بين اليمين واليسار. كما أن خفض أصوات النظام يشوّه التوجيه، لذا "
    "عُطّل في هذه اللعبة تحديداً."
)

h2("5.6 لعبة أين مصدر الصوت؟")
body(
    "يُعرض مشهد فيه عدة كائنات (حديقة أو شارع)، ويُشغَّل صوت أحدها، وعلى الطفل "
    "الضغط على الكائن الصحيح. المشهد يُختار عشوائياً عند بدء المستوى ويبقى "
    "ثابتاً لجولاته."
)
code(
    """
const STREET_SCENE = {
  id: 'street',
  background: require('.../focus-street.png'),
  images: [ /* الخلفية، دراجة نارية، تاكسي، طائرة، دراجة، شرطة */ ],
  sounds: [ /* الصوت المقابل لكل صورة بالترتيب نفسه */ ],
}

const GAME_SCENES = [GARDEN_SCENE, STREET_SCENE]

function pickRandomScene() {
  return GAME_SCENES[Math.floor(Math.random() * GAME_SCENES.length)]
}
""",
    "app/(dashboard)/games/FocusEarGame.jsx",
)
body(
    "تُربط الصور بالأصوات بالفهرس: الصورة رقم 3 يقابلها الصوت رقم 3، والفهرس 0 "
    "محفوظ لضوضاء المكان. وللطفل مهلة محددة للإجابة، وبعدها تُحسب الجولة خطأ."
)
code(
    """
const targetIndex = Math.floor(Math.random() * config.objectsCount) + 1
setTargetObject(targetIndex)

await playSound(objSoundRef, activeSceneRef.current.sounds[targetIndex], {
  isStale,
})

timerRef.current = setTimeout(() => {
  showFeedbackRef.current('error', levelNumber, sessionId)
}, ANSWER_TIMEOUT_MS)
""",
    "اختيار الهدف وتشغيل صوته",
)

h2("5.7 لعبة رحلة الفضاء")
body(
    "صاروخ ينتقل بين الكواكب. ينتظر الطفل إشارة صوتية ثم يضغط بسرعة، فيتقدّم "
    "الصاروخ كوكباً. الضغط قبل الصوت أو التأخّر عنه يُرجعه كوكباً ويُنقص محاولة، "
    "وثلاث محاولات فاشلة تنهي الرحلة."
)
body(
    "تدرّب هذه اللعبة على سرعة الاستجابة وكبح التسرّع: على الطفل الانتظار حتى "
    "يسمع فعلاً، لا التخمين. لذلك يأتي الصوت بعد فترة عشوائية."
)
code(
    """
const delay =
  cfg.waitMin + Math.floor(Math.random() * (cfg.waitMax - cfg.waitMin + 1))

waitT.current = setTimeout(() => {
  fireCue()      // تشغيل الإشارة الصوتية
}, delay)
""",
    "app/(dashboard)/games/SpaceGame.jsx",
)

h2("5.8 التعامل مع الخروج من اللعبة")
body(
    "لو خرج الطفل بزر الرجوع أثناء اللعب لبقيت الأصوات تعمل في الخلفية. لذلك "
    "تعترض كل لعبة زر الرجوع وتسأل قبل الخروج، وتُوقف الأصوات والمؤقتات عند "
    "مغادرة الشاشة."
)
code(
    """
// تنظيف واحد يُستخدم عند تفريغ المكوّن وعند مغادرة الشاشة
const teardown = useCallback(() => {
  isActiveRef.current = false
  sessionIdRef.current += 1
  clearTimer(timerRef)
  clearTimer(nextRoundTimerRef)
  releaseSounds(bgSoundRef, objSoundRef)
}, [])

useEffect(() => {
  configureGameAudio()
  return teardown
}, [teardown])

useFocusEffect(useCallback(() => teardown, [teardown]))
""",
    "إيقاف الصوت عند الخروج",
)

# ---------------------------------------------------------- 6
h1("6. مبادئ التصميم للأطفال")
bullet("خطوة واحدة في كل شاشة: هدف واضح بلا خيارات مشتّتة.")
bullet("أزرار كبيرة وعناوين عالية التباين تناسب الأصابع الصغيرة.")
bullet("تغذية راجعة فورية بعد كل جولة: نجمة ورسالة تشجيع من بيان.")
bullet("صعوبة متدرّجة: تبدأ بلا ضوضاء وتنتهي بمشهد مزدحم.")
bullet("لا عقاب قاسٍ عند الخطأ، بل دعوة للمحاولة مرة أخرى.")
bullet("شخصية «بيان» ترافق الطفل في كل الشاشات لتقوية الارتباط بالتطبيق.")

# ---------------------------------------------------------- 7
h1("7. تنظيم الشيفرة")
body(
    "قُسّم المشروع بحيث تكون لكل مسؤولية جهة واحدة، فيسهل التعديل والتوسعة:"
)
table(
    ["المجلد", "المحتوى"],
    [
        ("app/", "الشاشات والمسارات"),
        ("components/", "مكوّنات واجهة مشتركة"),
        ("constants/", "الألوان وأصول الهوية"),
        ("contexts/", "حالة المستخدم العامة"),
        ("hooks/", "خواطف مساعدة"),
        ("utils/", "دوال مساعدة: الصوت، الملف الشخصي، تشكيل العربية"),
        ("assets/", "الصور والأصوات"),
    ],
)
body(
    "وقد اتُّبعت ثلاث قواعد ثابتة: بيانات الألعاب والمستويات تُعرَّف كمصفوفات "
    "وكائنات لا كشيفرة مكرّرة، والمنطق المتكرر يُستخرج إلى وحدة مشتركة، "
    "والتعليقات تشرح سبب الحل لا وصف السطر."
)

out = Path(__file__).parent / "Bayan-Frontend-Explained.docx"
doc.save(out)
print(f"Saved: {out}")
