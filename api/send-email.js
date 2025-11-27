// api/send-email.js

const ALLOWED_ORIGINS = [
  'https://mik-mondragon.webflow.io',   // tu Webflow actual
  // añade aquí tu dominio final si luego publicas en uno propio:
  // 'https://www.tudominio.com',
  'https://gsbindex.com/',
  'http://127.0.0.1:5500/',
  'http://localhost:3000'
];

function setCors(res, origin) {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  setCors(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // preflight
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, pdfBase64, filename = 'resultado.pdf' } = req.body || {};
    if (!to || !subject || !pdfBase64) {
      return res.status(400).json({ error: 'Missing fields: to, subject, pdfBase64' });
    }

    // límite rápido (opcional): ~7.5MB base64 aprox
    if (pdfBase64.length > 10_000_000) {
      return res.status(413).json({ error: 'Attachment too large' });
    }

    const rsp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Resultados <noreply@treseiscero.app>', // cambia por tu remitente verificado en Resend
        to: [to],
        subject,
        html: html || '<p>Te envío el PDF adjunto.</p>',
        attachments: [
          { filename, content: pdfBase64 } // base64 sin "data:..."
        ]
      })
    });

    const data = await rsp.json();
    if (!rsp.ok) return res.status(400).json(data);

    return res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
