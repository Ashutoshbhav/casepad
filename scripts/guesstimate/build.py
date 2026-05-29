"""
Build Ash's Guesstimate Assignment PDF.

Structure (per Ash's spec):
  Case 1 (Mumbai petrol pumps):
    - Page 1-2: handwritten sheets (scaled to A4)
    - Page 3: typed metadata — description, source, administered by, reflection
  Case 2 (Movie screens in India):
    - Page 4-5: handwritten sheets (already A4)
    - Page 6: typed metadata — description, source, administered by, reflection

Output:
  C:/Users/Ashutosh Bhavale/Downloads/Guesstimate_Assignment_Ashutosh.pdf
"""

import os
from pypdf import PdfReader, PdfWriter, Transformation, PageObject
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph

DOWNLOADS = r"C:\Users\Ashutosh Bhavale\Downloads"
SHEET_1 = os.path.join(DOWNLOADS, "Number of pumps in mumbai.pdf")
SHEET_2 = os.path.join(DOWNLOADS, "number of movie screens in India..pdf")
OUT = os.path.join(DOWNLOADS, "Guesstimate_Assignment_Ashutosh.pdf")

BUILD_DIR = os.path.dirname(os.path.abspath(__file__))
META_1 = os.path.join(BUILD_DIR, "_meta_case1.pdf")
META_2 = os.path.join(BUILD_DIR, "_meta_case2.pdf")

CASE_1 = {
    "title": "Case 1 — Number of Petrol Pumps in Mumbai",
    "description": (
        "Estimate the total number of petrol pumps operating in Greater "
        "Mumbai. A demand-side guesstimate combining city population, "
        "vehicle penetration, daily fuel consumption per vehicle, and "
        "average per-pump throughput."
    ),
    "source_book": "IIM Ahmedabad Consult Club Casebook",
    "source_year": "2022-23",
    "source_page": "Page ~115 (Guesstimates section)",
    "administered_by": "Aditya Geda",
    "reflection": (
        "I approached this case using a demand-side framework, segmenting "
        "vehicles by type and estimating daily fuel consumption before "
        "working backward to pump capacity. My structure was MECE and the "
        "final answer of ~1,500 pumps was directionally accurate against "
        "real-world data of ~1,400&#8211;1,700 pumps. Key assumption I'd "
        "refine: commercial vehicle CNG penetration significantly impacts "
        "total demand and deserves more precision. I was comfortable with "
        "the math but need to improve speed on penetration rate "
        "assumptions. I second-guessed myself there. Overall, a clean "
        "solve with a defensible structure and a well-calibrated "
        "final number."
    ),
}

CASE_2 = {
    "title": "Case 2 — Number of Movie Screens in India",
    "description": (
        "Estimate the total number of movie screens operating in India. "
        "A supply-side guesstimate using city-tier segmentation (Tier 1 / "
        "Tier 2 / Tier 3) and screen density assumptions per lakh "
        "population, anchored on the structural insight that India is "
        "underscreened relative to its population."
    ),
    "source_book": "IIM Calcutta Consulting Club Casebook",
    "source_year": "2022",
    "source_page": "Market Sizing section",
    "administered_by": "Aditya Geda",
    "reflection": (
        "I used a supply-side, geography-based framework segmenting India "
        "into Tier 1, Tier 2, and Tier 3 populations and applying screen "
        "density assumptions per lakh population. The critical insight "
        "was that India is significantly underscreened relative to its "
        "population, a structural observation that adds depth beyond "
        "just the number. My raw calculation came to ~22,250 screens, "
        "but recognising that Tier 3 screen density would be meaningfully "
        "lower than my initial assumption, I rounded down to ~20,000, "
        "which lands inside the actual range of ~17,500&#8211;20,000. "
        "Next time I'd stress-test density assumptions earlier by "
        "anchoring to known cities before extrapolating nationally. "
        "Overall, a structured and defensible solve."
    ),
}


def build_meta_page(case: dict, output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=2.2 * cm,
        rightMargin=2.2 * cm,
        topMargin=2.4 * cm,
        bottomMargin=2.4 * cm,
        title=case["title"],
        author="Ashutosh Bhavale",
    )

    styles = getSampleStyleSheet()
    INK = HexColor("#1f1e1d")
    ACCENT = HexColor("#d97757")
    MUTED = HexColor("#6b6863")

    title_style = ParagraphStyle(
        "T", parent=styles["Title"], fontName="Helvetica-Bold",
        fontSize=18, leading=22, textColor=INK, spaceAfter=14,
        alignment=TA_LEFT,
    )
    label_style = ParagraphStyle(
        "L", parent=styles["Normal"], fontName="Helvetica-Bold",
        fontSize=9, leading=12, textColor=ACCENT,
        spaceAfter=4, spaceBefore=16,
    )
    body_style = ParagraphStyle(
        "B", parent=styles["BodyText"], fontName="Helvetica",
        fontSize=11, leading=16, textColor=INK,
        alignment=TA_JUSTIFY, spaceAfter=4,
    )
    meta_style = ParagraphStyle(
        "M", parent=styles["Normal"], fontName="Helvetica",
        fontSize=10, leading=14, textColor=MUTED, spaceAfter=2,
    )

    flowables = [
        Paragraph(case["title"], title_style),
        Paragraph("DESCRIPTION", label_style),
        Paragraph(case["description"], body_style),
        Paragraph("SOURCE", label_style),
        Paragraph(
            f"<b>{case['source_book']}</b>, {case['source_year']}<br/>"
            f"{case['source_page']}",
            meta_style,
        ),
        Paragraph("ADMINISTERED BY", label_style),
        Paragraph(case["administered_by"], meta_style),
        Paragraph("SELF-REFLECTION", label_style),
        Paragraph(case["reflection"], body_style),
    ]

    def add_footer(canv, _doc):
        canv.saveState()
        canv.setFont("Helvetica", 7.5)
        canv.setFillColor(MUTED)
        canv.drawString(
            2.2 * cm, 1.5 * cm,
            "Ashutosh Bhavale  ·  Guesstimate Assignment  ·  May 2026"
        )
        canv.drawRightString(
            A4[0] - 2.2 * cm, 1.5 * cm,
            case["title"]
        )
        canv.restoreState()

    doc.build(flowables, onFirstPage=add_footer, onLaterPages=add_footer)


def scale_page_to_a4(page: PageObject) -> PageObject:
    """Return a fresh A4 page that fits the original scaled & centered."""
    A4_W, A4_H = A4

    src_w = float(page.mediabox.width)
    src_h = float(page.mediabox.height)

    scale = min(A4_W / src_w, A4_H / src_h)

    new_w = src_w * scale
    new_h = src_h * scale
    tx = (A4_W - new_w) / 2
    ty = (A4_H - new_h) / 2

    blank = PageObject.create_blank_page(width=A4_W, height=A4_H)
    transform = Transformation().scale(sx=scale, sy=scale).translate(tx, ty)
    blank.merge_transformed_page(page, transform)
    return blank


def main():
    print("Building metadata pages …")
    build_meta_page(CASE_1, META_1)
    build_meta_page(CASE_2, META_2)
    print(f"  meta1 -> {META_1}")
    print(f"  meta2 -> {META_2}")

    writer = PdfWriter()

    print("\nMerging Case 1 …")
    sheet1 = PdfReader(SHEET_1)
    for i, p in enumerate(sheet1.pages):
        normalized = scale_page_to_a4(p)
        writer.add_page(normalized)
        print(f"  + Case 1 sheet page {i+1} (scaled to A4)")

    meta1_pdf = PdfReader(META_1)
    for p in meta1_pdf.pages:
        writer.add_page(p)
    print("  + Case 1 metadata page")

    print("\nMerging Case 2 …")
    sheet2 = PdfReader(SHEET_2)
    for i, p in enumerate(sheet2.pages):
        normalized = scale_page_to_a4(p)
        writer.add_page(normalized)
        print(f"  + Case 2 sheet page {i+1}")

    meta2_pdf = PdfReader(META_2)
    for p in meta2_pdf.pages:
        writer.add_page(p)
    print("  + Case 2 metadata page")

    writer.add_metadata({
        "/Title": "Guesstimate Assignment - Ashutosh Bhavale",
        "/Author": "Ashutosh Bhavale",
        "/Subject": "B-school Guesstimates: Mumbai Petrol Pumps + India Movie Screens",
        "/Creator": "CasePad",
    })

    with open(OUT, "wb") as f:
        writer.write(f)

    final_size_kb = os.path.getsize(OUT) / 1024
    final_pages = len(writer.pages)
    print(f"\n[OK] Wrote {OUT}")
    print(f"  {final_pages} pages  -  {final_size_kb:.1f} KB")


if __name__ == "__main__":
    main()
