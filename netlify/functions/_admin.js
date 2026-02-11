const admin = require('firebase-admin');

let app;

const getAdminApp = () => {
  if (app) return app;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not set');
  }
  const serviceAccount = JSON.parse(serviceAccountJson);
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  return app;
};

const verifyToken = async (token) => {
  if (!token) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }
  getAdminApp();
  try {
    return await admin.auth().verifyIdToken(token);
  } catch (e) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }
};

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : '';
};

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

module.exports = {
  getAdminApp,
  verifyToken,
  getBearerToken,
  corsHeaders,
};
