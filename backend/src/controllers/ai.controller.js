const ai = require('../ai');
const dispute = require('../services/dispute.service');

exports.assist = async (req, res, next) => {
  try {
    const { type, context } = req.body || {};
    res.json(await ai.assist({ type, context }));
  } catch (e) { next(e); }
};

exports.disputeExplain = async (req, res, next) => {
  try {
    const { bookingId, reason, detail } = req.body || {};
    const analysis = await dispute.analyzeBookingEvidence(bookingId);
    const explanation = await ai.explainDispute({ analysis, reason, detail });
    res.json({
      explanation,
      confidence: analysis.issues.length > 0 ? 'high' : 'medium',
      issues: analysis.issues,
    });
  } catch (e) { next(e); }
};
