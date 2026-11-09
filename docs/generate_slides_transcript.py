import re
from pathlib import Path

import arabic_reshaper
import matplotlib.pyplot as plt
from bidi.algorithm import get_display
from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from matplotlib.patches import Polygon, Rectangle


ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "slides-transcript"
DOC_PATH = ROOT / "تفريغ-شريحتي-تسلسل-الرسائل.docx"

NAVY = "#1F4E79"
BLUE = "#2E75B6"
BOX_FILL = "#F4F8FC"
BOX_EDGE = "#1F4E79"
PROC_FILL = "#F3F7FB"
ARROW = "#2B5C8A"
TEXT_DARK = "#1A1A1A"
MUTED = "#5A6A7A"
PASS_FILL = "#EAF6EE"
PASS_EDGE = "#2E7D4F"
FAIL_FILL = "#FDECEC"
FAIL_EDGE = "#C0392B"
DEC_FILL = "#FFF8E8"
DEC_EDGE = "#C48A00"


def t(text):
    lines = []
    for line in text.split("\n"):
        if re.search(r"[\u0600-\u06FF]", line):
            lines.append(get_display(arabic_reshaper.reshape(line)))
        else:
            lines.append(line)
    return "\n".join(lines)


class Box:
    def __init__(self, x, y, w, h):
        self.x, self.y, self.w, self.h = x, y, w, h

    @property
    def top(self):
        return self.y + self.h / 2

    @property
    def bottom(self):
        return self.y - self.h / 2

    @property
    def left(self):
        return self.x - self.w / 2

    @property
    def right(self):
        return self.x + self.w / 2


def setup_slide(width=16.4, height=11.0, ymax=11.0):
    plt.rcParams["font.family"] = "Arial"
    plt.rcParams["axes.unicode_minus"] = False
    fig, ax = plt.subplots(figsize=(width, height), dpi=220)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    ax.set_xlim(0, 16)
    ax.set_ylim(0, ymax)
    ax.axis("off")
    fig.subplots_adjust(left=0.045, right=0.955, top=0.96, bottom=0.045)
    return fig, ax


def rounded(ax, box, fill, edge, lw=1.2, z=4):
    ax.add_patch(
        Rectangle(
            (box.left, box.bottom),
            box.w,
            box.h,
            facecolor=fill,
            edgecolor=edge,
            linewidth=lw,
            zorder=z,
            joinstyle="miter",
            clip_on=False,
        )
    )


def header_bar(ax, box, text):
    rounded(ax, box, NAVY, NAVY, lw=0.6, z=4)
    ax.text(
        box.x,
        box.y,
        t(text),
        ha="center",
        va="center",
        color="white",
        fontsize=12.5,
        fontweight="bold",
        zorder=6,
        clip_on=False,
    )


def label_box(ax, box, text, fill=BOX_FILL, edge=BOX_EDGE, size=11):
    rounded(ax, box, fill, edge, lw=1.15, z=4)
    ax.text(
        box.x,
        box.y,
        t(text),
        ha="center",
        va="center",
        color=TEXT_DARK,
        fontsize=size,
        zorder=6,
        linespacing=1.25,
        clip_on=False,
    )
    return box


def diamond(ax, x, y, w, h, text):
    points = [(x, y + h / 2), (x + w / 2, y), (x, y - h / 2), (x - w / 2, y)]
    ax.add_patch(Polygon(points, closed=True, facecolor=DEC_FILL, edgecolor=DEC_EDGE, lw=1.2, zorder=4, clip_on=False))
    ax.text(x, y, t(text), ha="center", va="center", color=TEXT_DARK, fontsize=10.5, zorder=6, clip_on=False)
    return Box(x, y, w, h)


def full_h_arrow(ax, x_from, x_to, y, color=ARROW, head=0.28):
    direction = 1 if x_to >= x_from else -1
    shaft_end = x_to - direction * head
    ax.plot([x_from, shaft_end], [y, y], color=color, lw=1.45, solid_capstyle="butt", zorder=2, clip_on=False)
    wing = head * 0.42
    ax.add_patch(
        Polygon(
            [(x_to, y), (shaft_end, y + wing), (shaft_end, y - wing)],
            closed=True,
            facecolor=color,
            edgecolor=color,
            lw=0,
            zorder=2,
            clip_on=False,
        )
    )


def v_line(ax, x, y_from, y_to, color=ARROW):
    ax.plot([x, x], [y_from, y_to], color=color, lw=1.2, solid_capstyle="butt", zorder=2, clip_on=False)


def v_connect(ax, x, y_from, y_to, color=ARROW, head=0.22):
    direction = 1 if y_to >= y_from else -1
    shaft_end = y_to - direction * head
    ax.plot([x, x], [y_from, shaft_end], color=color, lw=1.2, solid_capstyle="butt", zorder=2, clip_on=False)
    wing = head * 0.42
    ax.add_patch(
        Polygon(
            [(x, y_to), (x - wing, shaft_end), (x + wing, shaft_end)],
            closed=True,
            facecolor=color,
            edgecolor=color,
            lw=0,
            zorder=2,
            clip_on=False,
        )
    )


def message_arrow(ax, x_from, x_to, y, text, box_w, box_h=0.58, fill=BOX_FILL, edge=BOX_EDGE, size=11, color=ARROW):
    full_h_arrow(ax, x_from, x_to, y, color)
    mid = (x_from + x_to) / 2
    gap = 0.34
    box = Box(mid, y + gap + box_h / 2, box_w, box_h)
    return label_box(ax, box, text, fill=fill, edge=edge, size=size)


def lifeline(ax, x, y_top, y_bottom):
    ax.plot([x, x], [y_top, y_bottom], color="#C5D0DA", lw=1.05, ls=(0, (5, 4)), zorder=1, solid_capstyle="butt", clip_on=False)


def save_fig(fig, name):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    fig.savefig(path, dpi=220, facecolor="white")
    plt.close(fig)
    return path


def slide_title(ax, y_top):
    ax.text(
        8,
        y_top,
        t("هذه الشريحة تستعرض التسلسل الدقيق للرسائل عبر الشبكة"),
        ha="center",
        va="center",
        color=NAVY,
        fontsize=13,
        fontweight="bold",
        zorder=5,
    )
    ax.text(
        8,
        y_top - 0.42,
        t("بين العميل، وخادم الواجهة الخلفية (Backend Server)"),
        ha="center",
        va="center",
        color=MUTED,
        fontsize=11,
        zorder=5,
    )


def slide_login():
    ymax = 12.6
    fig, ax = setup_slide(height=12.6, ymax=ymax)
    slide_title(ax, ymax - 0.32)

    bx, cx = 3.4, 12.6
    hw, hh = 4.2, 0.7
    header_y = ymax - 1.18
    left_h = Box(bx, header_y, hw, hh)
    right_h = Box(cx, header_y, hw, hh)
    header_bar(ax, left_h, "خادم الواجهة الخلفية (Backend)")
    header_bar(ax, right_h, "التطبيق (Client)")
    lifeline(ax, bx, left_h.bottom, 0.4)
    lifeline(ax, cx, right_h.bottom, 0.4)

    proc_w, proc_h = 4.0, 0.9
    msg_w, msg_h = 5.2, 0.58

    y1 = 9.75
    message_arrow(ax, cx, bx, y1, "1.  POST /login  (Credentials)", msg_w, msg_h)

    p2 = Box(bx, 8.15, proc_w, proc_h)
    v_connect(ax, bx, y1, p2.top)
    label_box(ax, p2, "2. التحقق من كلمة المرور\n(Bcrypt)", fill=PROC_FILL, size=10.5)

    y3 = 6.45
    v_line(ax, bx, p2.bottom, y3)
    message_arrow(ax, bx, cx, y3, "3.  Return Access + Refresh Token", msg_w, msg_h)

    y4 = 4.85
    message_arrow(ax, cx, bx, y4, "4.  GET /api/data  (Bearer Token)", msg_w, msg_h)

    p5 = Box(bx, 3.25, proc_w, proc_h)
    v_connect(ax, bx, y4, p5.top)
    label_box(ax, p5, "5. التحقق من التوقيع والتاريخ\nlocal", fill=PROC_FILL, size=10.5)

    y6 = 1.65
    v_line(ax, bx, p5.bottom, y6)
    message_arrow(
        ax,
        bx,
        cx,
        y6,
        "6.  OK (Protected Data)  200",
        msg_w,
        msg_h,
        fill=PASS_FILL,
        edge=PASS_EDGE,
        color=PASS_EDGE,
    )

    return save_fig(fig, "slide-1-login-white.png")


def slide_permissions():
    ymax = 15.2
    fig, ax = setup_slide(height=15.2, ymax=ymax)
    slide_title(ax, ymax - 0.32)

    bx, cx = 3.4, 12.6
    hw, hh = 4.2, 0.7
    header_y = ymax - 1.18
    left_h = Box(bx, header_y, hw, hh)
    right_h = Box(cx, header_y, hw, hh)
    header_bar(ax, left_h, "خادم الواجهة الخلفية (Backend)")
    header_bar(ax, right_h, "التطبيق (Client)")
    lifeline(ax, bx, left_h.bottom, 0.35)
    lifeline(ax, cx, right_h.bottom, 0.35)

    proc_w, proc_h = 4.0, 0.9
    client_w, client_h = 4.0, 0.9

    y1 = 12.15
    message_arrow(
        ax,
        cx,
        bx,
        y1,
        "1.  POST /request/action\n(Bearer Token + Permissions)",
        box_w=5.5,
        box_h=0.78,
        size=10.5,
    )

    p2 = Box(bx, 10.55, proc_w, proc_h)
    v_connect(ax, bx, y1, p2.top)
    label_box(ax, p2, "2. التحقق من صحة التوقيع\n(Local Signature Verify)", fill=PROC_FILL, size=10)

    p2b = Box(bx, 9.05, proc_w, 0.82)
    v_connect(ax, bx, p2.bottom, p2b.top)
    label_box(ax, p2b, "تحديد هوية المستخدم ومستواه", fill=PROC_FILL, size=10.5)

    p3 = Box(bx, 7.55, proc_w, proc_h)
    v_connect(ax, bx, p2b.bottom, p3.top)
    label_box(ax, p3, "3. التحقق من الصلاحيات\nالمطلوبة للعملية", fill=PROC_FILL, size=10.5)

    dy = 5.7
    dw, dh = 3.2, 1.2
    v_connect(ax, bx, p3.bottom, dy + dh / 2)
    dec = diamond(ax, bx, dy, dw, dh, "صلاحيات كافية؟")

    pass_box = Box(cx, dy, client_w, client_h)
    mid_pass_x = (dec.right + pass_box.left) / 2
    ax.text(
        mid_pass_x,
        dy + 0.14,
        "Pass",
        color=PASS_EDGE,
        fontsize=10,
        fontweight="bold",
        ha="center",
        va="bottom",
        zorder=6,
        clip_on=False,
    )
    full_h_arrow(ax, dec.right, pass_box.left, dy, PASS_EDGE)
    label_box(ax, pass_box, "السماح بالوصول\nوتنفيذ العملية", fill=PASS_FILL, edge=PASS_EDGE, size=10.5)

    p4 = Box(bx, 3.45, proc_w, 0.82)
    no_y = (dec.bottom + p4.top) / 2
    ax.text(bx + 0.5, no_y, "No", color=FAIL_EDGE, fontsize=10, fontweight="bold", ha="left", va="center", zorder=6, clip_on=False)
    v_connect(ax, bx, dec.bottom, p4.top, FAIL_EDGE)
    label_box(ax, p4, "4. محاولة الوصول المرفوضة", fill=FAIL_FILL, edge=FAIL_EDGE, size=10.5)

    err_y = 1.55
    err_box = Box(cx, err_y, client_w, 0.78)
    v_line(ax, bx, p4.bottom, err_y, FAIL_EDGE)
    full_h_arrow(ax, bx, err_box.left, err_y, FAIL_EDGE)
    label_box(ax, err_box, "5.  Error: 403 Forbidden", fill=FAIL_FILL, edge=FAIL_EDGE, size=10.5)

    return save_fig(fig, "slide-2-permissions-white.png")


def set_run_font(run, name="Arial", size=13, bold=False, color=None):
    run.bold = bold
    run.font.name = name
    run.font.size = Pt(size)
    if color:
        run.font.color.rgb = color
    r_pr = run._element.get_or_add_rPr()
    r_fonts = r_pr.find(qn("w:rFonts"))
    if r_fonts is None:
        r_fonts = OxmlElement("w:rFonts")
        r_pr.append(r_fonts)
    r_fonts.set(qn("w:ascii"), name)
    r_fonts.set(qn("w:hAnsi"), name)
    r_fonts.set(qn("w:cs"), name)
    r_fonts.set(qn("w:eastAsia"), name)


def set_rtl(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_pr = paragraph._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    bidi.set(qn("w:val"), "1")
    p_pr.append(bidi)


def add_text(doc, text, size=13, bold=False, center=False, space_after=6, color=None):
    p = doc.add_paragraph()
    set_rtl(p)
    if center:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    run = p.add_run(text)
    set_run_font(run, size=size, bold=bold, color=color)
    return p


def set_cell_shading(cell, hex_color):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), hex_color)
    shd.set(qn("w:val"), "clear")
    tc_pr.append(shd)


def set_cell_rtl(cell, text, size=12, bold=False, fill=None, white=False):
    cell.text = ""
    if fill:
        set_cell_shading(cell, fill)
    p = cell.paragraphs[0]
    set_rtl(p)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    color = RGBColor(255, 255, 255) if white else None
    set_run_font(run, size=size, bold=bold, color=color)
    cell.vertical_alignment = 1


def shade_paragraph(paragraph, hex_color):
    p_pr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:fill"), hex_color)
    p_pr.append(shd)


def add_step(doc, number, actor, direction, text, note=None):
    p = doc.add_paragraph()
    set_rtl(p)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.left_indent = Cm(0.4)

    run_num = p.add_run(f"{number}.  ")
    set_run_font(run_num, size=13, bold=True, color=RGBColor(0, 82, 147))

    run_actor = p.add_run(f"[{actor}] ")
    set_run_font(run_actor, size=12, bold=True, color=RGBColor(70, 70, 70))

    if direction:
        run_dir = p.add_run(f"{direction}  ")
        set_run_font(run_dir, size=12, bold=False, color=RGBColor(0, 82, 147))

    run_body = p.add_run(text)
    set_run_font(run_body, size=13, bold=False)

    if note:
        n = doc.add_paragraph()
        set_rtl(n)
        n.paragraph_format.space_after = Pt(2)
        n.paragraph_format.right_indent = Cm(1.0)
        run_n = n.add_run(note)
        set_run_font(run_n, size=11, color=RGBColor(90, 90, 90))


def enable_section_rtl(section):
    sect_pr = section._sectPr
    bidi = OxmlElement("w:bidi")
    bidi.set(qn("w:val"), "1")
    sect_pr.append(bidi)


def add_horizontal_line(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(10)
    p_pr = p._p.get_or_add_pPr()
    p_bdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "12")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "005293")
    p_bdr.append(bottom)
    p_pr.append(p_bdr)


def build_document(slide1_path, slide2_path):
    doc = Document()
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(1.8)
    section.bottom_margin = Cm(1.8)
    section.left_margin = Cm(2.0)
    section.right_margin = Cm(2.0)
    enable_section_rtl(section)

    add_text(
        doc,
        "تفريغ محتوى الشرائح",
        size=20,
        bold=True,
        center=True,
        space_after=4,
        color=RGBColor(0, 82, 147),
    )
    add_text(
        doc,
        "تسلسل الرسائل عبر الشبكة بين العميل وخادم الواجهة الخلفية",
        size=13,
        center=True,
        space_after=14,
        color=RGBColor(80, 80, 80),
    )
    add_horizontal_line(doc)

    # ---------- Slide 1 ----------
    add_text(doc, "الشريحة الأولى: تسجيل الدخول وجلب البيانات المحمية", size=16, bold=True, space_after=8)

    add_text(
        doc,
        "عنوان الشريحة:",
        size=13,
        bold=True,
        space_after=2,
        color=RGBColor(0, 82, 147),
    )
    add_text(
        doc,
        "هذه الشريحة تستعرض التسلسل الدقيق للرسائل عبر الشبكة بين العميل، وخادم الواجهة الخلفية (Backend Server):",
        size=13,
        space_after=10,
    )

    add_text(doc, "أطراف الاتصال:", size=13, bold=True, space_after=4, color=RGBColor(0, 82, 147))

    parties = doc.add_table(rows=1, cols=2)
    parties.autofit = True
    set_cell_rtl(parties.cell(0, 0), "خادم الواجهة الخلفية (Backend)", size=12, bold=True, fill="1F4E79", white=True)
    set_cell_rtl(parties.cell(0, 1), "التطبيق (Client)", size=12, bold=True, fill="2E75B6", white=True)

    add_text(doc, "تسلسل الرسائل:", size=13, bold=True, space_after=2, color=RGBColor(0, 82, 147))

    add_step(
        doc,
        "1",
        "العميل",
        "← الخادم",
        "POST /login (Credentials)",
        "يرسل التطبيق طلب تسجيل الدخول مع بيانات الاعتماد (اسم المستخدم/البريد وكلمة المرور).",
    )
    add_step(
        doc,
        "2",
        "الخادم (معالجة داخلية)",
        "",
        "التحقق من كلمة المرور (Bcrypt)",
        "يتحقق الخادم محلياً من صحة كلمة المرور باستخدام خوارزمية Bcrypt.",
    )
    add_step(
        doc,
        "3",
        "الخادم",
        "← العميل",
        "Return Access + Refresh Token",
        "يعيد الخادم رمز الوصول (Access Token) ورمز التحديث (Refresh Token) إلى التطبيق.",
    )
    add_step(
        doc,
        "4",
        "العميل",
        "← الخادم",
        "GET /api/data (Bearer Token)",
        "يرسل التطبيق طلباً لجلب البيانات المحمية مع إرفاق رمز الوصول في ترويسة Bearer Token.",
    )
    add_step(
        doc,
        "5",
        "الخادم (معالجة داخلية)",
        "",
        "التحقق من التوقيع والتاريخ local",
        "يتحقق الخادم محلياً من صحة توقيع الرمز وصلاحية التاريخ (انتهاء الصلاحية).",
    )
    add_step(
        doc,
        "6",
        "الخادم",
        "← العميل",
        "OK (Protected Data) 200",
        "يعيد الخادم البيانات المحمية مع رمز الحالة 200.",
    )

    add_horizontal_line(doc)

    # ---------- Slide 2 ----------
    add_text(doc, "الشريحة الثانية: التحقق من الصلاحيات وتنفيذ العملية", size=16, bold=True, space_after=8)

    add_text(
        doc,
        "عنوان الشريحة:",
        size=13,
        bold=True,
        space_after=2,
        color=RGBColor(0, 82, 147),
    )
    add_text(
        doc,
        "هذه الشريحة تستعرض التسلسل الدقيق للرسائل عبر الشبكة بين العميل، وخادم الواجهة الخلفية (Backend Server):",
        size=13,
        space_after=10,
    )

    add_text(doc, "أطراف الاتصال:", size=13, bold=True, space_after=4, color=RGBColor(0, 82, 147))

    parties2 = doc.add_table(rows=1, cols=2)
    parties2.autofit = True
    set_cell_rtl(parties2.cell(0, 0), "خادم الواجهة الخلفية (Backend)", size=12, bold=True, fill="1F4E79", white=True)
    set_cell_rtl(parties2.cell(0, 1), "التطبيق (Client)", size=12, bold=True, fill="2E75B6", white=True)

    add_text(doc, "تسلسل الرسائل:", size=13, bold=True, space_after=2, color=RGBColor(0, 82, 147))

    add_step(
        doc,
        "1",
        "العميل",
        "← الخادم",
        "POST /request/action (Bearer Token + Permissions)",
        "يرسل التطبيق طلب تنفيذ عملية مع رمز الوصول (Bearer Token) والصلاحيات المطلوبة.",
    )
    add_step(
        doc,
        "2",
        "الخادم (معالجة داخلية)",
        "",
        "التحقق من صحة التوقيع (Local Signature Verify)",
        "يتحقق الخادم محلياً من صحة توقيع الرمز.",
    )
    add_step(
        doc,
        "2",
        "الخادم (معالجة داخلية)",
        "",
        "تحديد هوية المستخدم ومستواه",
        "يستخرج الخادم هوية المستخدم ومستواه من الرمز بعد التحقق.",
    )
    add_step(
        doc,
        "3",
        "الخادم (معالجة داخلية)",
        "",
        "التحقق من الصلاحيات المطلوبة للعملية",
        "يتحقق الخادم مما إذا كان المستخدم يملك الصلاحيات اللازمة لتنفيذ العملية المطلوبة.",
    )

    add_text(doc, "نقطة القرار:", size=13, bold=True, space_after=4, color=RGBColor(0, 82, 147))

    add_step(
        doc,
        "مسار Pass",
        "الخادم",
        "← العميل",
        "السماح بالوصول وتنفيذ العملية",
        "إذا اجتاز المستخدم التحقق من الصلاحيات، يُسمح بالوصول وتُنفَّذ العملية.",
    )
    add_step(
        doc,
        "مسار No",
        "الخادم (معالجة داخلية)",
        "",
        "4. محاولة الوصول المرفوضة",
        "إذا لم يملك المستخدم الصلاحيات المطلوبة، تُسجَّل محاولة الوصول المرفوضة.",
    )
    add_step(
        doc,
        "5",
        "الخادم",
        "← العميل",
        "Error: 403 Forbidden",
        "يعيد الخادم خطأ 403 Forbidden إلى التطبيق (رفض الوصول).",
    )

    add_horizontal_line(doc)

    add_text(doc, "ملخص منطقي للتدفق", size=16, bold=True, space_after=8)

    add_text(
        doc,
        "الشريحة الأولى: يسجّل العميل دخوله ببيانات الاعتماد، فيتحقق الخادم من كلمة المرور بـ Bcrypt ثم يعيد رمزي Access وRefresh. بعد ذلك يطلب العميل بيانات محمية باستخدام Bearer Token، فيتحقق الخادم محلياً من التوقيع والتاريخ ويعيد البيانات برمز 200.",
        size=12,
        space_after=8,
    )
    add_text(
        doc,
        "الشريحة الثانية: يرسل العميل طلب تنفيذ عملية مع الرمز والصلاحيات. يتحقق الخادم من التوقيع، ثم يحدد هوية المستخدم ومستواه، ثم يفحص الصلاحيات المطلوبة. عند النجاح يُسمح بالوصول وتُنفَّذ العملية، وعند الفشل تُرفض المحاولة ويُعاد خطأ 403 Forbidden.",
        size=12,
        space_after=4,
    )

    add_diagram_pages(doc, slide1_path, slide2_path)
    try:
        doc.save(DOC_PATH)
        return DOC_PATH
    except PermissionError:
        alt = ROOT / "slides-sequence-white.docx"
        doc.save(alt)
        return alt


def add_diagram_pages(doc, slide1_path, slide2_path):
    def landscape_section():
        section = doc.add_section(WD_SECTION.NEW_PAGE)
        section.orientation = WD_ORIENT.LANDSCAPE
        section.page_width = Cm(29.7)
        section.page_height = Cm(21.0)
        section.top_margin = Cm(1.2)
        section.bottom_margin = Cm(1.0)
        section.left_margin = Cm(1.4)
        section.right_margin = Cm(1.4)
        enable_section_rtl(section)
        return section

    landscape_section()
    add_text(
        doc,
        "الشريحة الأولى — تسلسل الرسائل (خلفية بيضاء)",
        size=16,
        bold=True,
        center=True,
        space_after=8,
        color=RGBColor(0, 82, 147),
    )
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(slide1_path), width=Cm(26.4))

    landscape_section()
    add_text(
        doc,
        "الشريحة الثانية — تسلسل الرسائل (خلفية بيضاء)",
        size=16,
        bold=True,
        center=True,
        space_after=8,
        color=RGBColor(0, 82, 147),
    )
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(slide2_path), width=Cm(26.4))


if __name__ == "__main__":
    slide1 = slide_login()
    slide2 = slide_permissions()
    path = build_document(slide1, slide2)
    print(str(path))
