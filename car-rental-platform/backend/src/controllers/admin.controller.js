const admin = require('../services/admin.service');

exports.metrics = async (_req, res, next) => {
  try { res.json(await admin.metrics()); } catch (e) { next(e); }
};
