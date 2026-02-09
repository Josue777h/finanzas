const sgMail = require('@sendgrid/mail');
const { verifyToken, getBearerToken, corsHeaders } = require('./_admin');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

exports.handler = async (event) => {
  const origin = event.headers.origin || '';
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  try {
    const token = getBearerToken(event);
    await verifyToken(token);

    if (!SENDGRID_API_KEY || !EMAIL_FROM) {
      return { statusCode: 412, headers: corsHeaders(origin), body: JSON.stringify({ error: 'SendGrid no configurado' }) };
    }

    const { to, subject, body } = JSON.parse(event.body || '{}');
    if (!to || !subject || !body) {
      return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Faltan campos requeridos' }) };
    }

    await sgMail.send({
      to,
      from: EMAIL_FROM,
      subject,
      text: body,
    });

    return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ success: true }) };
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return { statusCode, headers: corsHeaders(origin), body: JSON.stringify({ error: err.message || 'Error interno' }) };
  }
};
