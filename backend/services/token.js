const jwt = require('jsonwebtoken');
const { COOKIE_NAME } = require('../middleware/auth');

const isProd = process.env.NODE_ENV === 'production';

const signToken = (id, tokenVersion) =>
  jwt.sign({ id, v: tokenVersion ?? 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
    issuer: 'heartconnect',
    audience: 'heartconnect-api',
  });

const signTempToken = (id) =>
  jwt.sign({ id, requires2FA: true }, process.env.JWT_SECRET, {
    expiresIn: '5m',
    issuer: 'heartconnect',
    audience: 'heartconnect-api',
  });

function setTokenCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearTokenCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
}

module.exports = { signToken, signTempToken, setTokenCookie, clearTokenCookie, isProd };
