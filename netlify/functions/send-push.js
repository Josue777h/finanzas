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

    // Enviar por token para diagnosticar y limpiar tokens inválidos sin romper con 500.
    let successCount = 0;
    const failed = [];
    const deleteOps = [];

    for (const tokenValue of tokens) {
      try {
        await admin.messaging().send({
          token: tokenValue,
          notification: { title, body },
        });
        successCount += 1;
      } catch (sendErr) {
        const message = sendErr?.message || '';
        const code = sendErr?.code || 'unknown';
        failed.push({ token: tokenValue, code, message });

        // Limpieza de tokens claramente inválidos o no registrados.
        if (
          message.includes('registration-token-not-registered') ||
          message.includes('invalid-registration-token') ||
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-argument' ||
          message.includes('Requested entity was not found')
        ) {
          deleteOps.push(
            admin.firestore().collection('userTokens').doc(userId).collection('tokens').doc(tokenValue).delete()
          );
        }
      }
    }

    if (deleteOps.length > 0) {
      await Promise.allSettled(deleteOps);
    }

    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        success: true,
        sent: successCount,
        failed: failed.length,
        failures: failed.slice(0, 5),
      }),
    };
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return { statusCode, headers: corsHeaders(origin), body: JSON.stringify({ error: err.message || 'Error interno' }) };
  }
};
