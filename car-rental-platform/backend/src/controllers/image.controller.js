const Joi = require('joi');
const image = require('../services/image.service');
const { badRequest } = require('../utils/errors');

exports.presign = async (req, res, next) => {
  try {
    const { contentType } = req.body || {};
    res.json(await image.presignUpload({ contentType }));
  } catch (e) { next(e); }
};

const attachSchema = Joi.object({
  bookingId:  Joi.string().uuid().required(),
  phase:      Joi.string().valid('pre', 'post').required(),
  angle:      Joi.string().valid('front', 'rear', 'left', 'right', 'odometer', 'interior').required(),
  imageUrl:   Joi.string().uri().required(),
  capturedAt: Joi.date().iso().required(),
  lat:        Joi.number().optional(),
  lng:        Joi.number().optional(),
  hash:       Joi.string().max(128).optional(),
  meta:       Joi.object().optional(),
});

exports.attach = async (req, res, next) => {
  try {
    const { value, error } = attachSchema.validate(req.body);
    if (error) throw badRequest(error.message);
    const row = await image.attachTripImage({ ...value, uploaderId: req.user.id });
    res.status(201).json(row);
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try { res.json({ items: await image.listForBooking(req.params.bookingId) }); } catch (e) { next(e); }
};
