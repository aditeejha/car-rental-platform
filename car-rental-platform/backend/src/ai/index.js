// =====================================================================
// AI Trust Assistant
// ---------------------------------------------------------------------
// Architecture (per spec):
//   1. Context Builder      -> assembles structured system data
//   2. Rule Engine          -> deterministic logic, runs first
//   3. Prompt Generator     -> renders the trust-assistant template
//   4. LLM Client           -> calls OpenAI (or returns offline fallback)
//   5. Response Formatter   -> normalizes to {message, next_step}
//
// IMPORTANT: AI does NOT make decisions. It explains the rule-engine
// output to users. If OPENAI_API_KEY is unset, deterministic templates
// are returned, so the system stays useful offline / in CI.
// =====================================================================

const config = require('../config');
const { rules } = require('./rules');
const { renderPrompt } = require('./prompts');

let client = null;
if (config.openai.apiKey) {
  // Lazy-require so the package is optional.
  // eslint-disable-next-line global-require
  const OpenAI = require('openai');
  client = new OpenAI({ apiKey: config.openai.apiKey });
}

async function callLLM({ system, user }) {
  if (!client) return null;
  const resp = await client.chat.completions.create({
    model: config.openai.model,
    temperature: 0.2,
    max_tokens: 350,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  return resp.choices?.[0]?.message?.content?.trim() || null;
}

// ---- Use case 1: Damage reporting guidance --------------------------
async function damageGuidance({ booking, capturedAngles = [], phase = 'pre' }) {
  const required = ['front', 'rear', 'left', 'right', 'odometer'];
  const missing = required.filter((a) => !capturedAngles.includes(a));
  const ruled = rules.damageGuidance({ phase, missing });

  const offlineMessage =
    missing.length === 0
      ? `Great — your ${phase}-trip set looks complete. Tap "Submit" to lock these images.`
      : `For ${phase}-trip evidence, please also capture: ${missing.join(', ')}. ` +
        `Use bright, clear shots from ~2 meters away.`;

  const prompt = renderPrompt({
    task: `User is uploading ${phase}-trip car images. Missing angles: ${missing.join(', ') || 'none'}.`,
    context: { bookingId: booking?.id, capturedAngles, missing, phase },
  });

  const llm = await callLLM(prompt).catch(() => null);
  return {
    message: llm || offlineMessage,
    next_step: ruled.nextStep,
    missing,
  };
}

// ---- Use case 2: Dispute explanation --------------------------------
async function explainDispute({ analysis, reason, detail }) {
  const summary = rules.summarizeIssues(analysis.issues || []);
  const offline =
    `This dispute was filed for "${reason}". ` +
    `Our trust system found: ${summary || 'no automated red flags — manual review will follow.'}`;

  const prompt = renderPrompt({
    task: 'Explain to the user, neutrally, why a dispute was raised. Cite which rules triggered.',
    context: {
      reason,
      detail: detail || null,
      issues: analysis.issues,
      completeness: analysis.completeness,
    },
  });

  const llm = await callLLM(prompt).catch(() => null);
  return llm || offline;
}

// ---- Use case 3: Offline guidance -----------------------------------
async function offlineGuidance({ pendingActions = 0 }) {
  const ruled = rules.offlineReassurance({ pendingActions });
  const prompt = renderPrompt({
    task: 'Reassure the user about offline behavior, explain that queued actions sync automatically.',
    context: { pendingActions },
  });
  const llm = await callLLM(prompt).catch(() => null);
  return {
    message: llm || ruled.message,
    next_step: ruled.nextStep,
  };
}

// Top-level dispatcher used by /api/ai/assist.
async function assist({ type, context = {} }) {
  switch (type) {
    case 'damage_guidance':  return damageGuidance(context);
    case 'offline_guidance': return offlineGuidance(context);
    default:
      throw Object.assign(new Error('Unsupported assist type'), { status: 400, code: 'BAD_REQUEST' });
  }
}

module.exports = { assist, damageGuidance, offlineGuidance, explainDispute };
