const { OAuth2Client } = require('google-auth-library');
const dotenv = require('dotenv');

dotenv.config();

const client = new OAuth2Client('597032685964-tstm86dpp6ds4j9qiknm8enhiigt6j6r.apps.googleusercontent.com');

const verifyGoogleToken = async (token) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: '597032685964-tstm86dpp6ds4j9qiknm8enhiigt6j6r.apps.googleusercontent.com',
    });

    return ticket.getPayload();
  } catch (error) {
    console.error('Error verifying Google token:', error);
    throw new Error('Invalid or expired Google token');
  }
};

module.exports = { verifyGoogleToken };
