"""Build docs/HUONG-DAN-HE-THONG.pdf from markdown source."""
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
MD = ROOT / "docs" / "HUONG-DAN-HE-THONG.md"
PDF = ROOT / "docs" / "HUONG-DAN-HE-THONG.pdf"

FONT = Path(r"C:\Windows\Fonts\arial.ttf")
if not FONT.exists():
    FONT = Path(r"C:\Windows\Fonts\segoeui.ttf")


class GuidePDF(FPDF):
    def footer(self):
        self.set_y(-12)
        self.set_font("VN", size=8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"Knowledge Platform - trang {self.page_no()}", align="C")


def write_line(pdf: GuidePDF, text: str, h: float = 6):
    text = text.strip()
    if not text or text == "---":
        return
    if text.startswith("|") and set(text.replace("|", "").replace(" ", "")) <= {"-", ":"}:
        return
    # Bo ky tu ve diagram ASCII gay loi font/layout
    if any(c in text for c in "─│└┌┐┘▼►"):
        text = text.replace("─", "-").replace("│", "|").replace("▼", "v").replace("►", ">")
    w = pdf.epw
    pdf.set_x(pdf.l_margin)
    try:
        pdf.multi_cell(w, h, text)
    except Exception:
        pdf.multi_cell(w, h, text.encode("ascii", "replace").decode())


def main():
    lines = MD.read_text(encoding="utf-8").splitlines()
    pdf = GuidePDF()
    pdf.set_margins(18, 18, 18)
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_font("VN", "", str(FONT))
    pdf.add_font("VN", "B", str(FONT))
    pdf.add_page()
    pdf.set_font("VN", size=10)
    in_code = False

    for raw in lines:
        line = raw.rstrip()
        if line.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            pdf.set_font("VN", size=8)
            write_line(pdf, line, 5)
            pdf.set_font("VN", size=10)
            continue
        if not line:
            pdf.ln(3)
            continue
        if line.startswith("# "):
            pdf.ln(5)
            pdf.set_font("VN", "B", 15)
            write_line(pdf, line[2:], 9)
            pdf.set_font("VN", size=10)
            continue
        if line.startswith("## "):
            pdf.ln(4)
            pdf.set_font("VN", "B", 12)
            write_line(pdf, line[3:], 8)
            pdf.set_font("VN", size=10)
            continue
        if line.startswith("### "):
            pdf.ln(2)
            pdf.set_font("VN", "B", 11)
            write_line(pdf, line[4:], 7)
            pdf.set_font("VN", size=10)
            continue
        clean = line.replace("**", "").replace("`", "")
        if clean.startswith("- "):
            clean = "- " + clean[2:]
        if clean.startswith("|"):
            clean = clean.replace("|", " ").strip()
        write_line(pdf, clean)

    pdf.output(str(PDF))
    print(f"OK: {PDF}")


if __name__ == "__main__":
    main()
