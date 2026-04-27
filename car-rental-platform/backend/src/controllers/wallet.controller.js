const Joi = require('joi');
const { pool, withTx } = require('../db/pool');
const { badRequest, notFound } = require('../utils/errors');

const topupSchema = Joi.object({ amount: Joi.number().integer().min(100).max(1_000_000).required() });

exports.balance = async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT wallet_cents FROM users WHERE id=$1', [req.user.id]);
    if (!rows.length) throw notFound();
    res.json({ walletCents: Number(rows[0].wallet_cents) });
  } catch (e) { next(e); }
};

exports.topup = async (req, res, next) => {
  try {
    const { value, error } = topupSchema.validate(req.body);
    if (error) throw badRequest(error.message);
    const cents = value.amount * 100;
    const result = await withTx(async (c) => {
      await c.query('UPDATE users SET wallet_cents=wallet_cents+$1 WHERE id=$2', [cents, req.user.id]);
      await c.query(
        `INSERT INTO wallet_tx (user_id, amount_cents, kind, note) VALUES ($1,$2,'topup','Mock top-up')`,
        [req.user.id, cents]
      );
      const r = await c.query('SELECT wallet_cents FROM users WHERE id=$1', [req.user.id]);
      return Number(r.rows[0].wallet_cents);
    });
    res.json({ walletCents: result });
  } catch (e) { next(e); }
};
