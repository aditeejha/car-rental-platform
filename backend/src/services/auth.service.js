const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/pool');
const config = require('../config');
const { badRequest, unauthorized } = require('../utils/errors');

async function signup({ email, password, fullName, phone, role = 'user' }) {
  const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
  if (existing.rowCount) throw badRequest('Email already registered');
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, phone, role)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, email, full_name, role, trust_score, wallet_cents, kyc_verified`,
    [email, hash, fullName, phone, role]
  );
  return tokenize(rows[0]);
}

async function login({ email, password }) {
  const { rows } = await pool.query(
    `SELECT id, email, full_name, role, password_hash, trust_score, wallet_cents, kyc_verified
       FROM users WHERE email=$1`,
    [email]
  );
  if (!rows.length) throw unauthorized('Invalid credentials');
  const ok = await bcrypt.compare(password, rows[0].password_hash);
  if (!ok) throw unauthorized('Invalid credentials');
  return tokenize(rows[0]);
}

function tokenize(u) {
  const token = jwt.sign(
    { sub: u.id, role: u.role, email: u.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
  return {
    token,
    user: {
      id: u.id, email: u.email, fullName: u.full_name, role: u.role,
      trustScore: Number(u.trust_score), walletCents: Number(u.wallet_cents),
      kycVerified: u.kyc_verified,
    },
  };
}

module.exports = { signup, login };
