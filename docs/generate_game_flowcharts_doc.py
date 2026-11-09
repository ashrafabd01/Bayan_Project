from pathlib import Path

import arabic_reshaper
import matplotlib.pyplot as plt
from bidi.algorithm import get_display
from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt
from matplotlib.patches import FancyBboxPatch, Polygon, Rectangle


ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "game-flowcharts"
DOC_PATH = ROOT / "Bayan-Remaining-Games-Flowcharts.docx"

GRAY = "#8d8d8d"
LINE = "#111111"
TEXT = "#ffffff"


def ar(text):
    return get_display(arabic_reshaper.reshape(text))


def setup_axis(height=22):
    fig, ax = plt.subplots(figsize=(7, 11), dpi=220)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, height)
    ax.axis("off")
    return fig, ax


def process(ax, x, y, text, w=4.7, h=1.0):
    ax.add_patch(Rectangle((x - w / 2, y - h / 2), w, h, facecolor=GRAY, edgecolor=LINE, lw=1))
    ax.text(x, y, text, ha="center", va="center", color=TEXT, fontsize=9)


def terminal(ax, x, y, text, w=3.0, h=1.2):
    ax.add_patch(
        FancyBboxPatch(
            (x - w / 2, y - h / 2),
            w,
            h,
            boxstyle=f"round,pad=0.03,rounding_size={h / 2}",
            facecolor=GRAY,
            edgecolor=LINE,
            lw=1,
        )
    )
    ax.text(x, y, text, ha="center", va="center", color=TEXT, fontsize=10)


def decision(ax, x, y, text, w=4.0, h=1.5):
    points = [(x, y + h / 2), (x + w / 2, y), (x, y - h / 2), (x - w / 2, y)]
    ax.add_patch(Polygon(points, closed=True, facecolor=GRAY, edgecolor=LINE, lw=1))
    ax.text(x, y, text, ha="center", va="center", color=TEXT, fontsize=8.5)


def arrow(ax, start, end, label=None, curve=0.0):
    ax.annotate(
        "",
        xy=end,
        xytext=start,
        arrowprops=dict(
            arrowstyle="-|>",
            color=LINE,
            lw=1,
            shrinkA=0,
            shrinkB=0,
            connectionstyle=f"arc3,rad={curve}",
        ),
    )
    if label:
        mx = (start[0] + end[0]) / 2
        my = (start[1] + end[1]) / 2
        ax.text(mx + 0.12, my + 0.12, label, fontsize=8, color=LINE, ha="left", va="bottom")


def frame(ax, height):
    ax.add_patch(Rectangle((0.45, 0.35), 9.1, height - 0.7, fill=False, edgecolor=LINE, lw=1))


def direction_chart():
    fig, ax = setup_axis(23)
    frame(ax, 23)
    terminal(ax, 5, 21.7, "START")
    process(ax, 5, 20.0, "N = 5\nScore = 0")
    process(ax, 5, 18.3, "D = random (Left, Right, Both)")
    process(ax, 5, 16.7, "Child closes eyes\nT = 3")
    process(ax, 5, 15.1, "T = T - 1")
    decision(ax, 5, 13.5, "T = 0?")
    process(ax, 5, 11.7, "Play directional sound")
    decision(ax, 5, 9.8, "Direction selected?")
    decision(ax, 5, 7.8, "Answer = D?")
    process(ax, 3.0, 5.9, "Score = Score + 1", w=3.4)
    process(ax, 5, 4.3, "N = N - 1")
    decision(ax, 5, 2.7, "N = 0?")
    terminal(ax, 5, 1.15, "END")

    arrow(ax, (5, 21.1), (5, 20.5))
    arrow(ax, (5, 19.5), (5, 18.8))
    arrow(ax, (5, 17.8), (5, 17.2))
    arrow(ax, (5, 16.2), (5, 15.6))
    arrow(ax, (5, 14.6), (5, 14.25))
    arrow(ax, (5, 12.75), (5, 12.2), "YES")
    arrow(ax, (5, 11.2), (5, 10.55))
    arrow(ax, (5, 9.05), (5, 8.55), "YES")
    arrow(ax, (3.3, 7.25), (3.0, 6.4), "YES")
    arrow(ax, (3.0, 5.4), (4.45, 4.8))
    arrow(ax, (5.8, 7.15), (5.4, 4.8), "NO")
    arrow(ax, (5, 3.8), (5, 3.45))
    arrow(ax, (5, 1.95), (5, 1.75), "YES")

    arrow(ax, (7.0, 13.5), (8.5, 13.5), "NO")
    arrow(ax, (8.5, 13.5), (8.5, 15.1))
    arrow(ax, (8.5, 15.1), (7.35, 15.1))
    arrow(ax, (3.0, 9.8), (1.35, 9.8), "NO")
    arrow(ax, (1.35, 9.8), (1.35, 11.7))
    arrow(ax, (1.35, 11.7), (2.65, 11.7))
    arrow(ax, (3.0, 2.7), (1.15, 2.7), "NO")
    arrow(ax, (1.15, 2.7), (1.15, 18.3))
    arrow(ax, (1.15, 18.3), (2.65, 18.3))

    path = OUT_DIR / "flowchart-sound-direction.png"
    fig.savefig(path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return path


def matching_chart():
    fig, ax = setup_axis(23)
    frame(ax, 23)
    terminal(ax, 5, 21.7, "START")
    process(ax, 5, 20.0, "Select 4 random cards\nLearn their sounds")
    process(ax, 5, 18.3, "Score = 0\nL = sequence length")
    process(ax, 5, 16.6, "Seq = random cards (L)")
    process(ax, 5, 14.9, "Play Seq sounds")
    process(ax, 5, 13.2, "i = 0")
    decision(ax, 5, 11.4, "Card pressed?")
    decision(ax, 5, 9.3, "Card = Seq[i]?")
    process(ax, 2.7, 7.3, "Replay same Seq", w=3.3)
    process(ax, 6.8, 7.3, "i = i + 1", w=3.0)
    decision(ax, 6.8, 5.4, "i = L?", w=3.3)
    process(ax, 6.8, 3.6, "Score = Score + 1", w=3.5)
    decision(ax, 5, 2.0, "Continue?")
    terminal(ax, 5, 0.8, "END")

    arrow(ax, (5, 21.1), (5, 20.5))
    arrow(ax, (5, 19.5), (5, 18.8))
    arrow(ax, (5, 17.8), (5, 17.1))
    arrow(ax, (5, 16.1), (5, 15.4))
    arrow(ax, (5, 14.4), (5, 13.7))
    arrow(ax, (5, 12.7), (5, 12.15))
    arrow(ax, (5, 10.65), (5, 10.05), "YES")
    arrow(ax, (3.45, 8.8), (2.7, 7.8), "NO")
    arrow(ax, (6.55, 8.8), (6.8, 7.8), "YES")
    arrow(ax, (6.8, 6.8), (6.8, 6.15))
    arrow(ax, (6.8, 4.65), (6.8, 4.1), "YES")
    arrow(ax, (6.2, 3.1), (5.5, 2.65))
    arrow(ax, (5, 1.25), (5, 1.4), "NO")

    arrow(ax, (3.0, 11.4), (1.25, 11.4), "NO")
    arrow(ax, (1.25, 11.4), (1.25, 13.2))
    arrow(ax, (1.25, 13.2), (2.65, 13.2))
    arrow(ax, (2.7, 6.8), (1.15, 6.8))
    arrow(ax, (1.15, 6.8), (1.15, 14.9))
    arrow(ax, (1.15, 14.9), (2.65, 14.9))
    arrow(ax, (5.15, 5.4), (3.3, 5.4), "NO")
    arrow(ax, (3.3, 5.4), (3.3, 11.4))
    arrow(ax, (3.3, 11.4), (3.0, 11.4))
    arrow(ax, (3.0, 2.0), (1.0, 2.0), "YES")
    arrow(ax, (1.0, 2.0), (1.0, 16.6))
    arrow(ax, (1.0, 16.6), (2.65, 16.6))

    path = OUT_DIR / "flowchart-sound-matching.png"
    fig.savefig(path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return path


def space_chart():
    fig, ax = setup_axis(25)
    frame(ax, 25)
    terminal(ax, 5, 23.7, "START")
    process(ax, 5, 22.0, "Lives = 3, S = 0\nN = Number of planets")
    process(ax, 5, 20.2, "T1 = random wait")
    decision(ax, 5, 18.3, "Pressed before cue?")
    decision(ax, 5, 16.2, "T1 finished?")
    process(ax, 5, 14.3, "Rocket makes sound\nT2 = 5")
    process(ax, 5, 12.6, "Wait 1 second")
    decision(ax, 5, 10.7, "Button pressed?")
    process(ax, 7.2, 8.6, "S = S + 1", w=3.0)
    decision(ax, 7.2, 6.7, "S = N?", w=3.2)
    process(ax, 3.0, 8.6, "T2 = T2 - 1", w=3.0)
    decision(ax, 3.0, 6.7, "T2 = 0?", w=3.2)
    process(ax, 5, 4.7, "Lives = Lives - 1\nS = max(0, S - 1)")
    decision(ax, 5, 2.7, "Lives = 0?")
    terminal(ax, 5, 1.0, "END")

    arrow(ax, (5, 23.1), (5, 22.5))
    arrow(ax, (5, 21.5), (5, 20.7))
    arrow(ax, (5, 19.7), (5, 19.05))
    arrow(ax, (5, 17.55), (5, 16.95), "NO")
    arrow(ax, (5, 15.45), (5, 14.8), "YES")
    arrow(ax, (5, 13.8), (5, 13.1))
    arrow(ax, (5, 12.1), (5, 11.45))
    arrow(ax, (6.55, 10.15), (7.2, 9.1), "YES")
    arrow(ax, (7.2, 8.1), (7.2, 7.45))
    arrow(ax, (3.45, 10.15), (3.0, 9.1), "NO")
    arrow(ax, (3.0, 8.1), (3.0, 7.45))
    arrow(ax, (4.6, 6.15), (4.6, 5.2), "YES")
    arrow(ax, (5, 4.2), (5, 3.45))
    arrow(ax, (5, 1.95), (5, 1.6), "YES")
    arrow(ax, (7.2, 5.95), (7.2, 5.15), "YES")
    arrow(ax, (7.2, 5.15), (5.8, 1.6))

    arrow(ax, (7.0, 18.3), (8.8, 18.3), "YES")
    arrow(ax, (8.8, 18.3), (8.8, 4.7))
    arrow(ax, (8.8, 4.7), (7.35, 4.7))
    arrow(ax, (3.0, 16.2), (1.2, 16.2), "NO")
    arrow(ax, (1.2, 16.2), (1.2, 18.3))
    arrow(ax, (1.2, 18.3), (3.0, 18.3))
    arrow(ax, (3.0, 5.95), (1.1, 5.95), "NO")
    arrow(ax, (1.1, 5.95), (1.1, 12.6))
    arrow(ax, (1.1, 12.6), (2.65, 12.6))
    arrow(ax, (3.0, 2.7), (0.85, 2.7), "NO")
    arrow(ax, (0.85, 2.7), (0.85, 20.2))
    arrow(ax, (0.85, 20.2), (2.65, 20.2))
    arrow(ax, (8.8, 6.7), (9.15, 6.7), "NO")
    arrow(ax, (9.15, 6.7), (9.15, 20.2))
    arrow(ax, (9.15, 20.2), (7.35, 20.2))

    path = OUT_DIR / "flowchart-space-journey.png"
    fig.savefig(path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return path


def set_rtl(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_pr = paragraph._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    bidi.set(qn("w:val"), "1")
    p_pr.append(bidi)


def add_arabic_text(paragraph, text, size=13, bold=False):
    set_rtl(paragraph)
    run = paragraph.add_run(text)
    run.bold = bold
    run.font.name = "Arial"
    run.font.size = Pt(size)
    r_pr = run._element.get_or_add_rPr()
    r_fonts = r_pr.rFonts
    r_fonts.set(qn("w:cs"), "Arial")
    return run


def add_picture_cell(cell, path, caption):
    cell.vertical_alignment = 1
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(path), width=Cm(11.7))
    cp = cell.add_paragraph()
    cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_arabic_text(cp, caption, size=10)


def build_document(direction, matching, space):
    doc = Document()
    section = doc.sections[0]
    section.orientation = WD_ORIENT.LANDSCAPE
    section.page_width = Cm(29.7)
    section.page_height = Cm(21.0)
    section.top_margin = Cm(1.0)
    section.bottom_margin = Cm(1.0)
    section.left_margin = Cm(1.2)
    section.right_margin = Cm(1.2)

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_arabic_text(title, "المخططات التدفقية لباقي الألعاب في نظام بيان", size=16, bold=True)

    table = doc.add_table(rows=1, cols=2)
    table.autofit = False
    add_picture_cell(table.cell(0, 0), direction, "الشكل (3-3): المخطط التدفقي للعبة من أين يأتي الصوت؟")
    add_picture_cell(table.cell(0, 1), matching, "الشكل (3-4): المخطط التدفقي للعبة مطابقة الأصوات")

    doc.add_page_break()
    title2 = doc.add_paragraph()
    title2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_arabic_text(title2, "المخطط التدفقي للعبة رحلة الفضاء", size=16, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(space), height=Cm(15.8))
    caption = doc.add_paragraph()
    caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_arabic_text(caption, "الشكل (3-5): المخطط التدفقي للعبة رحلة الفضاء", size=10)

    note = doc.add_paragraph()
    add_arabic_text(
        note,
        "ملاحظة: لم يُضف مخطط لاختبار النطق لأنه ما يزال واجهة تجريبية ولا يحتوي حالياً على جولات أو نظام تقييم فعلي.",
        size=10,
    )
    doc.save(DOC_PATH)


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    direction_path = direction_chart()
    matching_path = matching_chart()
    space_path = space_chart()
    build_document(direction_path, matching_path, space_path)
    print(DOC_PATH)
