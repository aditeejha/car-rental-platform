const Joi = require('joi');
const dispute = require('../services/dispute.service');
const { badRequest } = require('../utils/errors');

const raiseSchema = Joi.object({
  bookingId: Joi.string().uuid().required(),
  reason:    Joi.string().max(64).required(),
  detail:    Joi.string().max(2000).optional(),
});

exports.raise = async (req, res, next) => {
  try {
    const { value, error } = raiseSchema.validate(req.body);
    if (error) throw badRequest(error.message);
    res.status(201).json(await dispute.raise({ ...value, raisedBy: req.user.id }));
  } catch (e) { next(e); }
};

exports.mine = async (req, res, next) => {
  try { res.json({ items: await dispute.listForUser(req.user.id) }); } catch (e) { next(e); }
};

exports.analyze = async (req, res, next) => {
  try { res.json(await dispute.analyzeBookingEvidence(req.params.bookingId)); } catch (e) { next(e); }
};
