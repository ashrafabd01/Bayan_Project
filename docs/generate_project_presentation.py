from pathlib import Path

from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_AUTO_SHAPE_TYPE, MSO_CONNECTOR
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.xmlchemy import OxmlElement
from pptx.util import Inches, Pt


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
ASSETS = ROOT / "assets" / "img"
OUT = DOCS / "Bayan-Project-Presentation.pptx"

W = Inches(13.333)
H = Inches(7.5)

GREEN = RGBColor(140, 198, 63)
GREEN_DARK = RGBColor(82, 133, 45)
GREEN_SOFT = RGBColor(232, 247, 212)
INK = RGBColor(24, 55, 43)
MUTED = RGBColor(83, 111, 99)
WHITE = RGBColor(255, 255, 255)
OFFWHITE = RGBColor(247, 251, 248)
SKY = RGBColor(107, 203, 238)
YELLOW = RGBColor(255, 193, 7)
CORAL = RGBColor(255, 122, 89)
NAVY = RGBColor(19, 46, 82)
LINE = RGBColor(204, 222, 210)
GRAY = RGBColor(235, 241, 237)


def set_rtl(paragraph):
    paragraph.alignment = PP_ALIGN.RIGHT
    p_pr = paragraph._p.get_or_add_pPr()
    p_pr.set("rtl", "1")


def add_text(
    slide,
    text,
    x,
    y,
    w,
    h,
    size=20,
    color=INK,
    bold=False,
    align=PP_ALIGN.RIGHT,
    rtl=True,
    font="Arial",
    margin=0.05,
):
    box = slide.shapes.add_textbox(x, y, w, h)
    box.text_frame.clear()
    box.text_frame.margin_left = Inches(margin)
    box.text_frame.margin_right = Inches(margin)
    box.text_frame.margin_top = Inches(margin)
    box.text_frame.margin_bottom = Inches(margin)
    box.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = box.text_frame.paragraphs[0]
    p.text = text
    p.alignment = align
    if rtl:
        set_rtl(p)
    run = p.runs[0]
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    return box


def add_bullets(slide, items, x, y, w, h, size=20, color=INK, gap=10):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.margin_left = Inches(0.08)
    tf.margin_right = Inches(0.08)
    for index, item in enumerate(items):
        p = tf.paragraphs[0] if index == 0 else tf.add_paragraph()
        p.text = f"•  {item}"
        set_rtl(p)
        p.space_after = Pt(gap)
        p.line_spacing = 1.05
        run = p.runs[0]
        run.font.name = "Arial"
        run.font.size = Pt(size)
        run.font.color.rgb = color
    return box


def rounded(slide, x, y, w, h, fill=WHITE, line=LINE, radius=True):
    kind = MSO_AUTO_SHAPE_TYPE.ROUNDED_RECTANGLE if radius else MSO_AUTO_SHAPE_TYPE.RECTANGLE
    shape = slide.shapes.add_shape(kind, x, y, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.color.rgb = line
    shape.line.width = Pt(1.2)
    return shape


def circle(slide, x, y, d, fill, line=None):
    shape = slide.shapes.add_shape(MSO_AUTO_SHAPE_TYPE.OVAL, x, y, d, d)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.color.rgb = line or fill
    return shape


def add_image_contain(slide, path, x, y, w, h):
    img = Image.open(path)
    iw, ih = img.size
    scale = min(float(w) / iw, float(h) / ih)
    nw, nh = int(iw * scale), int(ih * scale)
    return slide.shapes.add_picture(str(path), x + (w - nw) // 2, y + (h - nh) // 2, nw, nh)


def add_image_cover(slide, path, x, y, w, h):
    img = Image.open(path)
    iw, ih = img.size
    target = float(w) / float(h)
    current = iw / ih
    if current > target:
        crop_w = int(ih * target)
        left = (iw - crop_w) // 2
        crop = (left, 0, left + crop_w, ih)
    else:
        crop_h = int(iw / target)
        top = (ih - crop_h) // 2
        crop = (0, top, iw, top + crop_h)
    tmp = DOCS / "_presentation_crop.png"
    img.crop(crop).save(tmp)
    return slide.shapes.add_picture(str(tmp), x, y, w, h)


def add_header(slide, title, number):
    add_text(slide, title, Inches(6.2), Inches(0.34), Inches(6.4), Inches(0.55), 26, INK, True)
    line = slide.shapes.add_shape(MSO_AUTO_SHAPE_TYPE.RECTANGLE, Inches(11.65), Inches(1.0), Inches(0.95), Inches(0.07))
    line.fill.solid()
    line.fill.fore_color.rgb = GREEN
    line.line.fill.background()
    add_text(slide, f"{number:02d}", Inches(0.35), Inches(0.28), Inches(0.55), Inches(0.38), 11, MUTED, True, PP_ALIGN.CENTER, False)


def add_footer(slide):
    add_text(slide, "نظام بيان", Inches(11.5), Inches(7.08), Inches(1.25), Inches(0.22), 9, MUTED, True)


def base_slide(prs, title, number):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.background.fill
    bg.solid()
    bg.fore_color.rgb = OFFWHITE
    add_header(slide, title, number)
    add_footer(slide)
    return slide


def card_title(slide, text, x, y, w, color=GREEN_DARK):
    add_text(slide, text, x, y, w, Inches(0.38), 16, color, True)


def add_tag(slide, text, x, y, w, fill=GREEN_SOFT, color=GREEN_DARK):
    rounded(slide, x, y, w, Inches(0.38), fill, fill)
    add_text(slide, text, x, y, w, Inches(0.38), 11, color, True, PP_ALIGN.CENTER)


def add_arrow(slide, x1, y1, x2, y2, color=GREEN_DARK, width=2.2):
    connector = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x1, y1, x2, y2)
    connector.line.color.rgb = color
    connector.line.width = Pt(width)
    connector.line.end_arrowhead = True
    return connector


def add_metric(slide, value, label, x, y, w, accent=GREEN):
    rounded(slide, x, y, w, Inches(1.35), WHITE, LINE)
    circle(slide, x + w - Inches(0.42), y + Inches(0.17), Inches(0.16), accent)
    add_text(slide, value, x + Inches(0.15), y + Inches(0.15), w - Inches(0.35), Inches(0.58), 28, INK, True, PP_ALIGN.CENTER)
    add_text(slide, label, x + Inches(0.12), y + Inches(0.78), w - Inches(0.24), Inches(0.35), 12, MUTED, False, PP_ALIGN.CENTER)


def make_presentation():
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H

    # 1 — title
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = OFFWHITE
    rounded(slide, Inches(0), Inches(0), Inches(4.2), H, GREEN_SOFT, GREEN_SOFT, False)
    add_image_contain(
        slide,
        DOCS / "damascus-university-logo.png",
        Inches(0.18),
        Inches(0.12),
        Inches(0.95),
        Inches(0.95),
    )
    add_text(
        slide,
        "جامعة دمشق  ·  كلية الهندسة الميكانيكية والكهربائية  ·  قسم هندسة الحواسيب",
        Inches(4.7),
        Inches(0.2),
        Inches(7.5),
        Inches(0.4),
        12,
        MUTED,
        True,
        PP_ALIGN.RIGHT,
    )
    title_line = slide.shapes.add_shape(
        MSO_AUTO_SHAPE_TYPE.RECTANGLE,
        Inches(10.95),
        Inches(0.72),
        Inches(1.25),
        Inches(0.06),
    )
    title_line.fill.solid()
    title_line.fill.fore_color.rgb = GREEN
    title_line.line.fill.background()
    add_image_cover(slide, ASSETS / "bayan-icon.png", Inches(0.72), Inches(1.02), Inches(2.78), Inches(2.78))
    add_text(slide, "بيان", Inches(5.1), Inches(1.0), Inches(7.2), Inches(0.9), 38, GREEN_DARK, True)
    add_text(
        slide,
        "نظام دعم علاج السمع وتشخيص اعتلالات النطق\nلدى الأطفال باللغة العربية",
        Inches(4.55),
        Inches(1.82),
        Inches(7.8),
        Inches(1.25),
        25,
        INK,
        True,
    )
    add_text(slide, "مشروع تخرج — قسم هندسة الحواسيب", Inches(5.1), Inches(3.18), Inches(7.2), Inches(0.42), 16, MUTED)
    rounded(slide, Inches(4.62), Inches(4.03), Inches(7.55), Inches(1.5), WHITE, LINE)
    add_text(slide, "إعداد الطلاب", Inches(10.45), Inches(4.18), Inches(1.35), Inches(0.35), 13, GREEN_DARK, True)
    add_text(
        slide,
        "أشرف عبد الهادي  ·  أغيد الصالح  ·  زهير الأورفه لي  ·  محمود الأشقر",
        Inches(4.92),
        Inches(4.58),
        Inches(6.9),
        Inches(0.48),
        16,
        INK,
        True,
        PP_ALIGN.CENTER,
    )
    add_text(slide, "إشراف: الدكتورة هديل الغفري", Inches(6.0), Inches(5.72), Inches(6.15), Inches(0.4), 15, MUTED, True)
    add_text(slide, "جامعة دمشق — 2026", Inches(6.0), Inches(6.23), Inches(6.15), Inches(0.35), 13, MUTED)

    # 2 — agenda
    slide = base_slide(prs, "محتوى العرض", 2)
    agenda = [
        ("01", "المشكلة والأهداف"),
        ("02", "المنهجية والأدوات"),
        ("03", "تحليل النظام والحل"),
        ("04", "التنجيز والذكاء الاصطناعي"),
        ("05", "النتائج والخاتمة"),
    ]
    for i, (num, text) in enumerate(agenda):
        row = i // 3
        col = i % 3
        x = Inches(0.75 + col * 4.15 + (0.0 if row == 0 else 2.05))
        y = Inches(1.45 + row * 2.1)
        rounded(slide, x, y, Inches(3.7), Inches(1.45), WHITE, LINE)
        add_text(slide, num, x + Inches(0.18), y + Inches(0.2), Inches(0.65), Inches(0.45), 17, GREEN_DARK, True, PP_ALIGN.CENTER, False)
        add_text(slide, text, x + Inches(0.72), y + Inches(0.52), Inches(2.65), Inches(0.48), 18, INK, True, PP_ALIGN.CENTER)

    # 3 — problem
    slide = base_slide(prs, "المشكلة والمبررات", 3)
    rounded(slide, Inches(7.25), Inches(1.35), Inches(5.35), Inches(4.95), WHITE, LINE)
    card_title(slide, "الفجوة العلاجية", Inches(8.05), Inches(1.62), Inches(4.15))
    add_bullets(
        slide,
        [
            "نقص الاختصاصيين ومحدودية مراكز التأهيل",
            "ارتفاع كلفة الجلسات وصعوبة تكرارها",
            "قلة الحلول المؤتمتة للعربية الفصحى",
            "الضجيج وضعف ميكروفونات الهواتف",
        ],
        Inches(7.72),
        Inches(2.2),
        Inches(4.45),
        Inches(3.55),
        18,
    )
    add_image_cover(slide, ASSETS / "bayan-listen.png", Inches(0.75), Inches(1.35), Inches(5.8), Inches(4.95))
    add_tag(slide, "تدريب منزلي داعم — لا يستبدل المختص", Inches(1.15), Inches(6.05), Inches(5.0), GREEN_SOFT, GREEN_DARK)

    # 4 — goals
    slide = base_slide(prs, "الأهداف", 4)
    goals = [
        ("01", "دعم علاج السمع والنطق", "تمارين عربية تفاعلية مناسبة للأطفال"),
        ("02", "كشف الخطأ الفونيمي", "تحديد نوع الخطأ وموضعه"),
        ("03", "أتمتة جزء من التأهيل", "تدريب يومي منظم في المنزل"),
        ("04", "متابعة التقدم", "حفظ المستوى والنتائج للمختص"),
    ]
    for i, (num, title, desc) in enumerate(goals):
        x = Inches(0.8 + (i % 2) * 6.05)
        y = Inches(1.45 + (i // 2) * 2.45)
        rounded(slide, x, y, Inches(5.55), Inches(1.95), WHITE, LINE)
        circle(slide, x + Inches(4.68), y + Inches(0.43), Inches(0.52), GREEN_SOFT, GREEN_SOFT)
        add_text(slide, num, x + Inches(4.68), y + Inches(0.43), Inches(0.52), Inches(0.52), 12, GREEN_DARK, True, PP_ALIGN.CENTER, False)
        add_text(slide, title, x + Inches(0.25), y + Inches(0.35), Inches(4.2), Inches(0.42), 18, INK, True)
        add_text(slide, desc, x + Inches(0.25), y + Inches(0.92), Inches(4.75), Inches(0.5), 14, MUTED)

    # 5 — methodology and tools
    slide = base_slide(prs, "المنهجية والأدوات المستخدمة", 5)
    steps = ["جمع المتطلبات", "نموذج أولي", "تغذية راجعة", "تطوير واختبار"]
    for i, label in enumerate(steps):
        x = Inches(7.25 + (3 - i) * 1.45)
        circle(slide, x, Inches(1.45), Inches(0.62), GREEN if i in (0, 3) else SKY)
        add_text(slide, str(i + 1), x, Inches(1.45), Inches(0.62), Inches(0.62), 14, WHITE, True, PP_ALIGN.CENTER, False)
        add_text(slide, label, x - Inches(0.45), Inches(2.12), Inches(1.55), Inches(0.48), 13, INK, True, PP_ALIGN.CENTER)
        if i < 3:
            add_arrow(slide, x - Inches(0.08), Inches(1.76), x - Inches(0.78), Inches(1.76), MUTED, 1.5)
    add_tag(slide, "منهجية النموذج الأولي Prototype", Inches(8.15), Inches(2.82), Inches(3.75), GREEN_SOFT, GREEN_DARK)
    tool_groups = [
        ("الواجهة", "React Native · Expo · JavaScript · Expo Router"),
        ("الصوت والشبكة", "expo-av · Axios · AsyncStorage"),
        ("الخلفية", "ASP.NET · C# · REST API · SQL"),
        ("الذكاء", "Python · Flask · Wav2Vec 2.0 · IPA"),
    ]
    for i, (title, body) in enumerate(tool_groups):
        x = Inches(0.7 + (i % 2) * 3.25)
        y = Inches(1.45 + (i // 2) * 2.18)
        rounded(slide, x, y, Inches(2.9), Inches(1.65), WHITE, LINE)
        add_text(slide, title, x + Inches(0.18), y + Inches(0.2), Inches(2.5), Inches(0.35), 14, GREEN_DARK, True)
        add_text(slide, body, x + Inches(0.18), y + Inches(0.68), Inches(2.5), Inches(0.68), 12, INK, False, PP_ALIGN.CENTER, False)

    # 6 — system analysis
    slide = base_slide(prs, "تحليل النظام باختصار", 6)
    actors = [
        ("الطفل", ["تشغيل الألعاب", "تسجيل النطق", "عرض النتيجة"]),
        ("المختص", ["إدارة الأطفال", "إسناد العلاج", "متابعة التقدم"]),
        ("المدير", ["إدارة المستخدمين", "الأدوار والصلاحيات", "الموارد"]),
    ]
    for i, (actor, uses) in enumerate(actors):
        x = Inches(8.85 - i * 4.08)
        circle(slide, x + Inches(1.25), Inches(1.35), Inches(0.72), [GREEN, SKY, CORAL][i])
        add_text(slide, actor[0], x + Inches(1.25), Inches(1.35), Inches(0.72), Inches(0.72), 17, WHITE, True, PP_ALIGN.CENTER)
        add_text(slide, actor, x + Inches(0.8), Inches(2.12), Inches(1.65), Inches(0.38), 17, INK, True, PP_ALIGN.CENTER)
        rounded(slide, x, Inches(2.75), Inches(3.15), Inches(2.25), WHITE, LINE)
        add_bullets(slide, uses, x + Inches(0.2), Inches(3.05), Inches(2.75), Inches(1.6), 14, INK, 7)
    rounded(slide, Inches(4.1), Inches(5.45), Inches(5.15), Inches(0.82), GREEN_SOFT, GREEN_SOFT)
    add_text(slide, "نظام بيان", Inches(5.6), Inches(5.5), Inches(2.15), Inches(0.34), 17, GREEN_DARK, True, PP_ALIGN.CENTER)
    add_text(
        slide,
        "الألعاب · النتائج · التصحيح · المتابعة",
        Inches(4.55),
        Inches(5.84),
        Inches(4.25),
        Inches(0.25),
        11,
        MUTED,
        False,
        PP_ALIGN.CENTER,
    )
    add_arrow(slide, Inches(10.43), Inches(5.0), Inches(9.05), Inches(5.48), GREEN_DARK, 1.6)
    add_arrow(slide, Inches(6.35), Inches(5.0), Inches(6.65), Inches(5.45), GREEN_DARK, 1.6)
    add_arrow(slide, Inches(2.27), Inches(5.0), Inches(4.3), Inches(5.48), GREEN_DARK, 1.6)

    # 7 — architecture
    slide = base_slide(prs, "الحل المقترح — معمارية النظام", 7)
    blocks = [
        ("تطبيق الطفل", "React Native / Expo", GREEN_SOFT, GREEN_DARK),
        ("واجهة API", "ASP.NET / JSON", RGBColor(224, 243, 250), RGBColor(52, 133, 161)),
        ("منطق الأعمال", "المصادقة والعلاج", RGBColor(255, 245, 211), RGBColor(163, 118, 20)),
        ("قاعدة البيانات", "SQL / سجل التقدم", RGBColor(244, 233, 250), RGBColor(113, 77, 137)),
    ]
    xs = [Inches(9.95), Inches(7.05), Inches(4.15), Inches(1.25)]
    for (title, sub, fill, color), x in zip(blocks, xs):
        rounded(slide, x, Inches(2.0), Inches(2.2), Inches(1.4), fill, fill)
        add_text(slide, title, x + Inches(0.15), Inches(2.18), Inches(1.9), Inches(0.38), 15, color, True, PP_ALIGN.CENTER)
        add_text(slide, sub, x + Inches(0.12), Inches(2.72), Inches(1.95), Inches(0.3), 11, MUTED, False, PP_ALIGN.CENTER, False)
    for i in range(3):
        add_arrow(slide, xs[i] - Inches(0.1), Inches(2.7), xs[i + 1] + Inches(2.3), Inches(2.7), MUTED, 2)
    rounded(slide, Inches(5.05), Inches(4.35), Inches(3.2), Inches(1.25), RGBColor(255, 235, 229), RGBColor(255, 205, 192))
    add_text(slide, "خدمة تصحيح النطق", Inches(5.3), Inches(4.58), Inches(2.7), Inches(0.35), 16, CORAL, True, PP_ALIGN.CENTER)
    add_text(slide, "Flask / Python / AI", Inches(5.3), Inches(5.02), Inches(2.7), Inches(0.28), 12, MUTED, False, PP_ALIGN.CENTER, False)
    add_arrow(slide, Inches(7.85), Inches(3.45), Inches(6.65), Inches(4.3), CORAL, 2)
    add_tag(slide, "JWT · Roles · Hashing · Rate limiting", Inches(3.7), Inches(6.05), Inches(5.85), GRAY, MUTED)

    # 8 — pronunciation pipeline
    slide = base_slide(prs, "الحل المقترح — تدفق تصحيح النطق", 8)
    pipeline = [
        ("1", "تسجيل الطفل"),
        ("2", "تنقية الصوت"),
        ("3", "Wav2Vec 2.0"),
        ("4", "سلسلة IPA"),
        ("5", "Levenshtein"),
        ("6", "نوع وموقع الخطأ"),
    ]
    for i, (num, label) in enumerate(pipeline):
        x = Inches(10.9 - i * 1.95)
        rounded(slide, x, Inches(2.15), Inches(1.55), Inches(1.45), WHITE, LINE)
        circle(slide, x + Inches(0.58), Inches(1.82), Inches(0.38), GREEN if i < 4 else CORAL)
        add_text(slide, num, x + Inches(0.58), Inches(1.82), Inches(0.38), Inches(0.38), 11, WHITE, True, PP_ALIGN.CENTER, False)
        add_text(slide, label, x + Inches(0.12), Inches(2.52), Inches(1.3), Inches(0.55), 13, INK, True, PP_ALIGN.CENTER)
        if i < 5:
            add_arrow(slide, x - Inches(0.05), Inches(2.87), x - Inches(0.35), Inches(2.87), MUTED, 1.6)
    rounded(slide, Inches(2.0), Inches(4.55), Inches(9.3), Inches(1.05), GREEN_SOFT, GREEN_SOFT)
    add_text(
        slide,
        "المخرجات: إدخال · حذف · استبدال · تشويه — على مستوى الفونيم",
        Inches(2.25),
        Inches(4.8),
        Inches(8.8),
        Inches(0.42),
        17,
        GREEN_DARK,
        True,
        PP_ALIGN.CENTER,
    )

    # 9 — implementation
    slide = base_slide(prs, "تنجيز الحل المقترح", 9)
    add_image_cover(slide, ASSETS / "bayan-gamer.png", Inches(0.65), Inches(1.25), Inches(4.05), Inches(4.9))
    rounded(slide, Inches(5.2), Inches(1.25), Inches(7.4), Inches(4.9), WHITE, LINE)
    add_text(slide, "مسار السمعيات", Inches(10.1), Inches(1.58), Inches(2.0), Inches(0.42), 18, GREEN_DARK, True)
    games = [
        "صيد الفقاعات — إدراك الصوت",
        "مطابقة الأصوات — التمييز والذاكرة",
        "رحلة الفضاء — بداية الصوت ونهايته",
        "من أين يأتي الصوت؟ — الاتجاه",
        "أين مصدر الصوت؟ — بيئات ومصادر عشوائية",
    ]
    add_bullets(slide, games, Inches(7.15), Inches(2.05), Inches(4.95), Inches(3.15), 15, INK, 8)
    add_tag(slide, "4 مستويات · أصوات عشوائية · تغذية راجعة", Inches(6.15), Inches(5.45), Inches(5.55), GREEN_SOFT, GREEN_DARK)

    # 10 — AI and data
    slide = base_slide(prs, "نماذج الذكاء ومجموعات المعطيات", 10)
    add_metric(slide, "Wav2Vec 2.0", "Transformer + CTC", Inches(8.85), Inches(1.35), Inches(3.6), SKY)
    add_metric(slide, "Common Voice", "بيانات صوتية متعددة اللغات", Inches(4.9), Inches(1.35), Inches(3.6), GREEN)
    add_metric(slide, "857,161", "كلمة في القاموس الفونيمي العربي", Inches(0.95), Inches(1.35), Inches(3.6), YELLOW)
    rounded(slide, Inches(0.95), Inches(3.2), Inches(11.5), Inches(2.45), WHITE, LINE)
    add_bullets(
        slide,
        [
            "النموذج: wav2vec2-lv-60-espeak-cv-ft",
            "التمثيل: الأبجدية الفونيمية الدولية IPA",
            "المقارنة: مسافة Levenshtein",
            "العينة: أصوات طفل وكلمات صحيحة وأخطاء متعمدة",
        ],
        Inches(2.0),
        Inches(3.58),
        Inches(9.3),
        Inches(1.7),
        16,
        INK,
        7,
    )

    # 11 — UI
    slide = base_slide(prs, "واجهات التطبيق وهوية الاستخدام", 11)
    rounded(slide, Inches(0.55), Inches(1.18), Inches(3.55), Inches(5.55), NAVY, NAVY)
    add_image_contain(slide, ASSETS / "space" / "bayan-rocket.png", Inches(0.82), Inches(1.5), Inches(3.0), Inches(4.85))
    rounded(slide, Inches(4.35), Inches(1.18), Inches(3.55), Inches(5.55), WHITE, LINE)
    add_image_cover(slide, ASSETS / "focus" / "focus-garden.png", Inches(4.6), Inches(1.45), Inches(3.05), Inches(4.8))
    add_tag(slide, "بيئات لعب واضحة", Inches(4.85), Inches(6.05), Inches(2.55), GREEN_SOFT, GREEN_DARK)
    rounded(slide, Inches(8.15), Inches(1.18), Inches(4.55), Inches(5.55), WHITE, LINE)
    add_image_contain(slide, ASSETS / "mockups" / "speech-game-ui.png", Inches(8.65), Inches(1.42), Inches(3.55), Inches(4.95))
    add_tag(slide, "تصحيح بصري محفّز", Inches(9.0), Inches(6.05), Inches(2.85), GREEN_SOFT, GREEN_DARK)

    # 12 — results
    slide = base_slide(prs, "النتائج والمخرجات", 12)
    add_metric(slide, "0.108 ثانية", "متوسط زمن المعالجة التجريبي", Inches(8.85), Inches(1.35), Inches(3.55), GREEN)
    add_metric(slide, "8 / 15", "تمثيل صحيح أو بفارق فونيم غير رئيسي", Inches(4.9), Inches(1.35), Inches(3.55), SKY)
    add_metric(slide, "5 ألعاب", "تدريب سمعي متدرّج", Inches(0.95), Inches(1.35), Inches(3.55), YELLOW)
    rounded(slide, Inches(0.95), Inches(3.25), Inches(11.45), Inches(2.4), WHITE, LINE)
    outputs = [
        "تطبيق أطفال بهوية بصرية موحّدة",
        "واجهة API آمنة وقاعدة بيانات علاجية",
        "محرك أولي لكشف الأخطاء الفونيمية",
        "تخزين مستويات ومحاولات ونتائج العلاج",
    ]
    add_bullets(slide, outputs, Inches(1.65), Inches(3.6), Inches(10.0), Inches(1.65), 17, INK, 8)
    add_text(slide, "القياسات ضمن بيئة اختبارية؛ يضاف زمن نقل الملف في التشغيل الفعلي.", Inches(2.25), Inches(5.85), Inches(8.9), Inches(0.38), 11, MUTED, False, PP_ALIGN.CENTER)

    # 13 — conclusion/future
    slide = base_slide(prs, "الخاتمة والآفاق", 13)
    rounded(slide, Inches(7.0), Inches(1.35), Inches(5.55), Inches(4.85), WHITE, LINE)
    card_title(slide, "الخلاصة", Inches(9.75), Inches(1.65), Inches(2.2))
    add_bullets(
        slide,
        [
            "نظام عربي يجمع التدريب السمعي وتصحيح النطق",
            "يدعم التدريب المنزلي مع إبقاء دور المختص",
            "بنية قابلة للتوسع وإضافة ألعاب وعلاجات",
        ],
        Inches(7.55),
        Inches(2.25),
        Inches(4.4),
        Inches(2.8),
        17,
    )
    rounded(slide, Inches(0.8), Inches(1.35), Inches(5.55), Inches(4.85), GREEN_SOFT, GREEN_SOFT)
    card_title(slide, "الآفاق المستقبلية", Inches(3.25), Inches(1.65), Inches(2.45))
    add_bullets(
        slide,
        [
            "تخصيص المستوى من تخطيط السمع",
            "ربط الفونيم الخاطئ بالحرف المكتوب",
            "تدريب النموذج على أصوات الأطفال",
            "دعم اللهجات وتنويع ألعاب النطق",
        ],
        Inches(1.35),
        Inches(2.25),
        Inches(4.35),
        Inches(3.0),
        16,
    )
    add_text(slide, "شكراً لحسن استماعكم", Inches(3.65), Inches(6.38), Inches(6.0), Inches(0.48), 24, GREEN_DARK, True, PP_ALIGN.CENTER)

    prs.save(OUT)
    crop = DOCS / "_presentation_crop.png"
    if crop.exists():
        crop.unlink()
    print(OUT)


if __name__ == "__main__":
    make_presentation()
