const cars = require('../services/car.service');

exports.list = async (req, res, next) => {
  try { res.json(await cars.listCars(req.query)); } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  try { res.json(await cars.getCarById(req.params.id)); } catch (e) { next(e); }
};

exports.recommend = async (req, res, next) => {
  try {
    const { budget, passengers, luggage, tripType, city } = req.body || {};
    res.json({
      items: await cars.recommend({
        budget: Number(budget) || undefined,
        passengers: Number(passengers) || undefined,
        luggage: Number(luggage) || undefined,
        tripType, city,
      }),
    });
  } catch (e) { next(e); }
};
