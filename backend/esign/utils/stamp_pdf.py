import io
import base64
from pypdf import PdfReader, PdfWriter
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


def _decode_data_url(data_url: str) -> bytes:
    if not data_url or "," not in data_url:
        raise ValueError("Invalid signature data URL")
    return base64.b64decode(data_url.split(",", 1)[1])


def _prepare_signature_image(signature_bytes: bytes, target_width: int = 800, target_height: int = 400) -> io.BytesIO:
    img = Image.open(io.BytesIO(signature_bytes))
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    img.thumbnail((target_width, target_height), Image.Resampling.LANCZOS)
    output = io.BytesIO()
    img.save(output, format="PNG", optimize=True)
    output.seek(0)
    return output


def stamp_signature_on_pdf(
    original_pdf_bytes: bytes,
    signature_data_url: str,
    page_number: int = 1,
    x: float = 0.0,
    y: float = 0.0,
    width: float = 1800.0,
    height: float = 450.0,
) -> bytes:
    sig_raw = _decode_data_url(signature_data_url)
    sig_buffer = _prepare_signature_image(sig_raw)

    reader = PdfReader(io.BytesIO(original_pdf_bytes))
    writer = PdfWriter()

    total_pages = len(reader.pages)
    if page_number < 1 or page_number > total_pages:
        raise ValueError(f"Invalid page_number {page_number}. PDF has {total_pages} pages.")

    for page in reader.pages:
        writer.add_page(page)

    target_page = writer.pages[page_number - 1]
    page_width = float(target_page.mediabox.width)
    page_height = float(target_page.mediabox.height)

    # 10000-basis from editor; legacy pixel fallback if old rows still exist
    is_legacy = width <= 1000 and width > 2
    if is_legacy:
        w_frac, h_frac = width / 900.0, height / 1200.0
        x_frac, y_frac = x / 900.0, y / 1200.0
    else:
        w_frac, h_frac = width / 10000.0, height / 10000.0
        x_frac, y_frac = x / 10000.0, y / 10000.0

    w_frac = max(0.01, min(w_frac, 1.0))
    h_frac = max(0.01, min(h_frac, 1.0))
    x_frac = max(0.0, min(x_frac, 1.0 - w_frac))
    y_frac = max(0.0, min(y_frac, 1.0 - h_frac))

    sig_w = w_frac * page_width
    sig_h = h_frac * page_height
    sig_x = x_frac * page_width
    # Frontend top-left → PDF bottom-left
    sig_y = page_height - (y_frac * page_height) - sig_h

    print(f"✅ [STAMP] Page {page_number}/{total_pages}  X={sig_x:.1f} Y={sig_y:.1f} W={sig_w:.1f} H={sig_h:.1f}")

    overlay_buffer = io.BytesIO()
    c = canvas.Canvas(overlay_buffer, pagesize=(page_width, page_height))
    c.drawImage(
        ImageReader(sig_buffer),
        sig_x,
        sig_y,
        width=sig_w,
        height=sig_h,
        mask="auto",  # keep PNG transparency; remove if your build washes out ink
        preserveAspectRatio=True,
        anchor="c",
    )
    c.save()

    overlay_buffer.seek(0)
    target_page.merge_page(PdfReader(overlay_buffer).pages[0])

    out = io.BytesIO()
    writer.write(out)
    out.seek(0)
    return out.getvalue()