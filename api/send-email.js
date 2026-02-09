const sgMail = require('@sendgrid/mail');
const { verifyToken } = require('./_admin');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await verifyToken(req);

    if (!SENDGRID_API_KEY || !EMAIL_FROM) {
      return res.status(412).json({ error: 'SendGrid no configurado' });
    }

    const { to, subject, body } = req.body || {};
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    await sgMail.send({
      to,
      from: EMAIL_FROM,
      subject,
      text: body,
    });

    return res.json({ success: true });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ error: err.message || 'Error interno' });
  }
};
