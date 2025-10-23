const { TokenModel } = require('../database/models');

const tokenModel = new TokenModel();

async function authMiddleware(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return { userId: null };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const tokenDoc = await tokenModel.findByToken(token);
    
    if (!tokenDoc) {
      return { userId: null };
    }

    // Check if token is active
    if (!tokenDoc.active) {
      return { userId: null };
    }

    // Check if token has expiry and is expired
    if (tokenDoc.expiresAt && new Date() > new Date(tokenDoc.expiresAt)) {
      return { userId: null };
    }

    return { userId: tokenDoc.userId };
  } catch (error) {
    console.error('Authentication error:', error);
    return { userId: null };
  }
}

module.exports = authMiddleware;