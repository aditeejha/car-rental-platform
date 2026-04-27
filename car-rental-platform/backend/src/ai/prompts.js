// Per-spec prompt template:
//
//   ROLE:        You are a trust assistant for a car rental platform.
//   CONTEXT:     {structured system data}
//   TASK:        {specific instruction}
//   CONSTRAINTS: be concise, be neutral, avoid assumptions

const SYSTEM = `You are a trust assistant for a car rental platform.
You explain what the system already decided. You do NOT make decisions,
you do NOT promise refunds, and you do NOT speculate beyond the data.
Always be concise (<= 60 words), neutral, and grounded in the provided context.`;

function renderPrompt({ task, context }) {
  const userMsg = [
    'CONTEXT:',
    JSON.stringify(context, null, 2),
    '',
    'TASK:',
    task,
    '',
    'CONSTRAINTS:',
    '- Be concise (<= 60 words).',
    '- Be neutral, never accusatory.',
    '- Avoid assumptions beyond the CONTEXT.',
    '- Never invent facts about images, GPS, or timestamps you were not given.',
  ].join('\n');
  return { system: SYSTEM, user: userMsg };
}

module.exports = { renderPrompt, SYSTEM };
