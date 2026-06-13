/**
 * emailTemplate.js — Profesyonel B2B HTML e-posta şablonu
 * Inline CSS kullanır (Gmail uyumluluğu için).
 */

const BRAND_COLOR     = process.env.EMAIL_BRAND_COLOR  || '#1e3a5f';
const BRAND_NAME      = process.env.EMAIL_BRAND_NAME   || 'B2B CRM';
const COMPANY_ADDRESS = process.env.EMAIL_COMPANY_ADDR || 'info@b2b-crm.com';

/**
 * Düz metni paragraflara böler ve HTML'e çevirir.
 * \n\n → yeni paragraf, \n → <br>
 */
function textToHtml(text) {
  return text
    .split(/\n\n+/)
    .map(para => `<p style="margin:0 0 16px 0;line-height:1.7;color:#374151;">${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * Profesyonel HTML e-posta şablonu oluşturur.
 * @param {string} subject  - E-posta konusu
 * @param {string} message  - Düz metin içerik
 * @param {string} senderEmail - Gönderen e-posta adresi
 * @returns {string} HTML string
 */
function buildEmailHtml(subject, message, senderEmail) {
  const year = new Date().getFullYear();
  const bodyHtml = textToHtml(message);

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" style="max-width:600px;" cellspacing="0" cellpadding="0" border="0">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_COLOR} 0%,#2d5282 100%);border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:8px;padding:10px 24px;">
                <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">${BRAND_NAME}</span>
              </div>
              <p style="color:rgba(255,255,255,0.8);margin:12px 0 0 0;font-size:13px;">Profesyonel Seyahat Acentesi Yönetim Platformu</p>
            </td>
          </tr>

          <!-- SUBJECT BANNER -->
          <tr>
            <td style="background:#ffffff;padding:0;">
              <div style="background:#f8fafc;border-left:4px solid ${BRAND_COLOR};margin:0;padding:16px 40px;">
                <p style="margin:0;font-size:18px;font-weight:700;color:${BRAND_COLOR};">${subject}</p>
              </div>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#ffffff;padding:32px 40px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="background:#ffffff;padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;">
            </td>
          </tr>

          <!-- CTA AREA -->
          <tr>
            <td style="background:#ffffff;padding:24px 40px;text-align:center;">
              <a href="mailto:${senderEmail}"
                 style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;
                        padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;
                        letter-spacing:0.5px;">
                ✉&nbsp; Bize Ulaşın
              </a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px 0;color:#64748b;font-size:12px;">
                Bu e-posta <strong>${BRAND_NAME}</strong> platformu üzerinden gönderilmiştir.
              </p>
              <p style="margin:0 0 8px 0;color:#94a3b8;font-size:11px;">
                ${COMPANY_ADDRESS}
              </p>
              <p style="margin:0;color:#cbd5e1;font-size:11px;">
                © ${year} ${BRAND_NAME} — Tüm hakları saklıdır.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = { buildEmailHtml };
