const sync = require('../services/sync.service');

exports.process = async (req, res, next) => {
  try {
    const { actions } = req.body || {};
    res.json(await sync.processBatch({ userId: req.user.id, actions }));
  } catch (e) { next(e); }
};
