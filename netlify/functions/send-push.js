const admin = require('firebase-admin');
const { getAdminApp, verifyToken, getBearerToken, corsHeaders } = require('./_admin');

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
    getAdminApp();

    const { userId, title, body } = JSON.parse(event.body || '{}');
    if (!userId || !title || !body) {
      return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Faltan campos requeridos' }) };
    }

    const snap = await admin.firestore().collection('userTokens').doc(userId).collection('tokens').get();
    const tokens = snap.docs.map(d => d.id);
    if (tokens.length === 0) {
      return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ success: true, message: 'No hay tokens registrados' }) };
    }

    const message = {
      notification: { title, body },
      tokens,
    };
    const response = await admin.messaging().sendEachForMulticast(message);
    return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ success: true, results: response.successCount }) };
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return { statusCode, headers: corsHeaders(origin), body: JSON.stringify({ error: err.message || 'Error interno' }) };
  }
};
