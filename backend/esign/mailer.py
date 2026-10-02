"""
mailer.py - SMTP email sender for the E-Signature service.
Handles signing request emails, OTP codes, and completion notifications.
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_FROM = os.getenv("SMTP_FROM", f"DraftMate <{SMTP_USER}>")


def send_email(to: str, subject: str, html_body: str, text_body: str = None) -> bool:
    """
    Sends an email via SMTP. Returns True on success, False on failure.
    Never raises — logs the error so a failed email doesn't crash the API.
    """
    if not SMTP_USER or not SMTP_PASS:
        print("[E-SIGN MAILER] ❌ SMTP not configured — email skipped")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to

        # Plain-text fallback (spam-filter friendly)
        if not text_body:
            # Naive HTML → text strip
            import re
            text_body = re.sub(r"<[^>]+>", "", html_body).strip()

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, [to], msg.as_string())

        print(f"[E-SIGN MAILER] ✅ Email sent to {to} — {subject}")
        return True

    except Exception as e:
        print(f"[E-SIGN MAILER] ❌ Failed to send to {to}: {e}")
        return False


# =====================================================
# EMAIL TEMPLATES — Modify freely to match your brand
# =====================================================

def _wrap_template(inner_html: str) -> str:
    """Wraps content in a branded DraftMate email shell."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#2563EB 0%,#4F46E5 100%);padding:24px 32px;">
                  <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:600;">DraftMate</h1>
                  <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Your AI Assistant in Law</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:32px;color:#0F172A;font-size:15px;line-height:1.6;">
                  {inner_html}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:20px 32px;background:#F8FAFC;border-top:1px solid #E2E8F0;color:#64748B;font-size:12px;text-align:center;">
                  Powered by DraftMate · <a href="https://draftmate.in" style="color:#2563EB;text-decoration:none;">draftmate.in</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """


def send_signing_request(to: str, signer_name: str, document_name: str,
                         sender_name: str, signing_link: str,
                         custom_message: str = None) -> bool:
    """Email sent when a document is 'sent for signature'."""
    inner = f"""
      <p style="margin:0 0 16px;">Hi <strong>{signer_name}</strong>,</p>
      <p style="margin:0 0 16px;">
        <strong>{sender_name}</strong> has requested your signature on the document:
      </p>
      <p style="margin:0 0 24px;padding:12px 16px;background:#F1F5F9;border-radius:8px;font-weight:500;">
        📄 {document_name}
      </p>
      {f'<p style="margin:0 0 24px;padding:16px;background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:6px;font-style:italic;color:#78350F;">"{custom_message}"</p>' if custom_message else ''}
      <div style="text-align:center;margin:32px 0;">
        <a href="{signing_link}"
           style="display:inline-block;padding:14px 32px;background:#2563EB;color:#FFFFFF;
                  text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          Review & Sign
        </a>
      </div>
      <p style="margin:24px 0 0;color:#64748B;font-size:13px;">
        This link is unique to you. Please do not forward this email.<br>
        You'll be asked to verify your identity with a one-time code before signing.
      </p>
    """
    return send_email(
        to=to,
        subject=f"Signature requested: {document_name}",
        html_body=_wrap_template(inner),
    )


def send_otp(to: str, signer_name: str, document_name: str, otp_code: str,
             expiry_minutes: int = 10) -> bool:
    """Email with the 6-digit OTP for identity verification."""
    inner = f"""
      <p style="margin:0 0 16px;">Hi <strong>{signer_name}</strong>,</p>
      <p style="margin:0 0 20px;">
        Please use the code below to verify your identity and sign
        <strong>{document_name}</strong>:
      </p>
      <div style="text-align:center;margin:32px 0;">
        <div style="display:inline-block;padding:20px 40px;background:#EFF6FF;
                    border:2px solid #2563EB;border-radius:12px;">
          <span style="font-size:36px;letter-spacing:8px;color:#1D4ED8;
                       font-weight:700;font-family:monospace;">
            {otp_code}
          </span>
        </div>
      </div>
      <p style="margin:0;color:#64748B;font-size:13px;text-align:center;">
        This code will expire in {expiry_minutes} minutes.
      </p>
      <p style="margin:16px 0 0;color:#DC2626;font-size:12px;text-align:center;">
        🔒 Never share this code with anyone.
      </p>
    """
    return send_email(
        to=to,
        subject=f"Your verification code: {otp_code}",
        html_body=_wrap_template(inner),
    )


def send_completion_notice(to: str, signer_name: str, document_name: str,
                            download_link: str) -> bool:
    """Email sent to the signer after they successfully sign."""
    inner = f"""
      <p style="margin:0 0 16px;">Hi <strong>{signer_name}</strong>,</p>
      <p style="margin:0 0 20px;">
        ✅ You've successfully signed <strong>{document_name}</strong>.
      </p>
      <p style="margin:0 0 24px;">
        A copy of the fully signed document is available for download below:
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="{download_link}"
           style="display:inline-block;padding:14px 32px;background:#10B981;color:#FFFFFF;
                  text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          Download Signed PDF
        </a>
      </div>
      <p style="margin:24px 0 0;color:#64748B;font-size:13px;">
        This document is electronically signed and legally valid under
        Section 5 of the Information Technology Act, 2000.
      </p>
    """
    return send_email(
        to=to,
        subject=f"Signed: {document_name}",
        html_body=_wrap_template(inner),
    )


def send_reminder(to: str, signer_name: str, document_name: str,
                  signing_link: str) -> bool:
    """Reminder email for pending signers."""
    inner = f"""
      <p style="margin:0 0 16px;">Hi <strong>{signer_name}</strong>,</p>
      <p style="margin:0 0 20px;">
        🔔 This is a friendly reminder that <strong>{document_name}</strong>
        is still waiting for your signature.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="{signing_link}"
           style="display:inline-block;padding:14px 32px;background:#2563EB;color:#FFFFFF;
                  text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          Review & Sign
        </a>
      </div>
    """
    return send_email(
        to=to,
        subject=f"Reminder: {document_name} awaits your signature",
        html_body=_wrap_template(inner),
    )