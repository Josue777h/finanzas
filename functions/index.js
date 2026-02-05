const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const https = require('https');

admin.initializeApp();

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@finanzasapp.com';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

exports.sendEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
  }
  if (!SENDGRID_API_KEY) {
    throw new functions.https.HttpsError('failed-precondition', 'SendGrid no configurado');
  }

  const { to, subject, body } = data || {};
  if (!to || !subject || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan campos requeridos');
  }

  const msg = {
    to,
    from: EMAIL_FROM,
    subject,
    text: body
  };

  await sgMail.send(msg);
  return { success: true };
});

exports.sendPushToUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
  }

  const { userId, title, body } = data || {};
  if (!userId || !title || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan campos requeridos');
  }

  const snap = await admin.firestore().collection('userTokens').doc(userId).collection('tokens').get();
  const tokens = snap.docs.map(d => d.id);

  if (tokens.length === 0) {
    return { success: true, message: 'No hay tokens registrados' };
  }

  const message = {
    notification: { title, body },
    tokens
  };

  const response = await admin.messaging().sendEachForMulticast(message);
  return { success: true, results: response.successCount };
});

exports.getGeoCurrency = functions.https.onCall(async (data, context) => {
  return new Promise((resolve) => {
    https.get('https://ipapi.co/json/', (resp) => {
      let data = '';
      resp.on('data', (chunk) => (data += chunk));
      resp.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ currency: json.currency || 'USD', country: json.country_name || '' });
        } catch (err) {
          resolve({ currency: 'USD', country: '' });
        }
      });
    }).on('error', () => resolve({ currency: 'USD', country: '' }));
  });
});
