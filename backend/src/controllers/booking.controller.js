const Joi = require('joi');
const booking = require('../services/booking.service');
const { badRequest } = require('../utils/errors');

const createSchema = Joi.object({
  carId:     Joi.string().uuid().required(),
  startAt:   Joi.date().iso().required(),
  endAt:     Joi.date().iso().greater(Joi.ref('startAt')).required(),
  clientRef: Joi.string().max(64).optional(),
});

exports.create = async (req, res, next) => {
  try {
    const { value, error } = createSchema.validate(req.body);
    if (error) throw badRequest(error.message);
    const result = await booking.createBooking({ ...value, userId: req.user.id });
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.mine = async (req, res, next) => {
  try { res.json({ items: await booking.listForUser(req.user.id) }); } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  try { res.json(await booking.getBookingById(req.params.id)); } catch (e) { next(e); }
};

exports.cancel = async (req, res, next) => {
  try { res.json(await booking.cancel(req.params.id, req.user.id)); } catch (e) { next(e); }
};
