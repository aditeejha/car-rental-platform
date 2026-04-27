// Deterministic rule engine — runs before any LLM call.
// AI never makes decisions; these rules do, the LLM only narrates.

const rules = {
  damageGuidance({ phase, missing }) {
    if (missing.length === 0) {
      return { nextStep: phase === 'pre' ? 'start_trip' : 'finish_trip' };
    }
    return { nextStep: 'capture_more_angles' };
  },

  summarizeIssues(issues) {
    if (!issues || issues.length === 0) return '';
    const counts = issues.reduce((m, i) => ({ ...m, [i.code]: (m[i.code] || 0) + 1 }), {});
    return Object.entries(counts)
      .map(([code, n]) => {
        switch (code) {
          case 'MISSING_PRE_IMAGE':   return `${n} missing pre-trip image(s)`;
          case 'MISSING_POST_IMAGE':  return `${n} missing post-trip image(s)`;
          case 'PRE_AFTER_START':     return `${n} pre-trip image(s) captured after the trip began`;
          case 'POST_OUT_OF_WINDOW':  return `${n} post-trip image(s) outside the allowed window`;
          default:                    return `${n} issue(s) of type ${code}`;
        }
      }).join('; ');
  },

  offlineReassurance({ pendingActions }) {
    if (pendingActions === 0) {
      return { message: 'You are offline. The app will keep working — no actions are pending.', nextStep: 'continue' };
    }
    return {
      message: `You are offline. ${pendingActions} action(s) are queued and will sync automatically when you are back online.`,
      nextStep: 'wait_for_sync',
    };
  },
};

module.exports = { rules };
