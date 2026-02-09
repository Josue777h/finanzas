const admin = require('firebase-admin');
const { getAdminApp, verifyToken } = require('./_admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await verifyToken(req);
    getAdminApp();

    const { userId, title, body } = req.body || {};
    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const snap = await admin.firestore().collection('userTokens').doc(userId).collection('tokens').get();
    const tokens = snap.docs.map(d => d.id);
    if (tokens.length === 0) {
      return res.json({ success: true, message: 'No hay tokens registrados' });
    }

    const message = {
      notification: { title, body },
      tokens,
    };
    const response = await admin.messaging().sendEachForMulticast(message);
    return res.json({ success: true, results: response.successCount });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ error: err.message || 'Error interno' });
  }
};
