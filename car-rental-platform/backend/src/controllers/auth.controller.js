const Joi = require('joi');
const auth = require('../services/auth.service');
const { badRequest } = require('../utils/errors');

const signupSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  fullName: Joi.string().min(2).max(120).required(),
  phone:    Joi.string().max(32).optional(),
  role:     Joi.string().valid('user', 'owner').default('user'),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

exports.signup = async (req, res, next) => {
  try {
    const { value, error } = signupSchema.validate(req.body);
    if (error) throw badRequest(error.message);
    res.status(201).json(await auth.signup(value));
  } catch (e) { next(e); }
};

exports.login = async (req, res, next) => {
  try {
    const { value, error } = loginSchema.validate(req.body);
    if (error) throw badRequest(error.message);
    res.json(await auth.login(value));
  } catch (e) { next(e); }
};

exports.me = (req, res) => res.json({ user: req.user });
