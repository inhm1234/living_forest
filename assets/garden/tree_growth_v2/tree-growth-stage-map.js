(() => {
  "use strict";

  const configCache = new Map();

  async function loadConfig(url) {
    if (!configCache.has(url)) {
      configCache.set(
        url,
        fetch(url, { cache: "force-cache" }).then((response) => {
          if (!response.ok) {
            throw new Error(`Tree growth stage map load failed: ${response.status}`);
          }
          return response.json();
        })
      );
    }
    return configCache.get(url);
  }

  function normalizeGrowthCount(value) {
    const count = Number(value);
    if (!Number.isFinite(count)) return 0;
    return Math.max(0, Math.floor(count));
  }

  function resolveFromConfig(config, value) {
    const count = normalizeGrowthCount(value);
    const isZeroState = count === 0;
    const lookupCount = isZeroState ? 1 : count;

    const rule = config.stages.find((stage) => {
      const withinMinimum = lookupCount >= stage.min;
      const withinMaximum = stage.max === null || lookupCount <= stage.max;
      return withinMinimum && withinMaximum;
    });

    if (!rule) {
      throw new Error(`No tree growth stage rule found for growth_count=${count}`);
    }

    const nextRule = config.stages.find((stage) => stage.stage === rule.stage + 1) || null;
    const displayLabel = isZeroState ? config.zeroCount.label : rule.label;
    const rangeSize = rule.max === null ? null : rule.max - rule.min + 1;
    const rangePosition = isZeroState ? 0 : lookupCount - rule.min + 1;
    const progress = rangeSize === null ? 1 : Math.min(1, Math.max(0, rangePosition / rangeSize));

    return Object.freeze({
      growthCount: count,
      isZeroState,
      stage: rule.stage,
      key: rule.key,
      label: displayLabel,
      shortLabel: isZeroState ? config.zeroCount.label : rule.shortLabel,
      min: rule.min,
      max: rule.max,
      atlas: rule.atlas,
      column: rule.column,
      row: rule.row,
      progress,
      nextStage: nextRule ? nextRule.stage : null,
      nextAt: nextRule ? nextRule.min : null,
      remainingToNext: nextRule ? Math.max(0, nextRule.min - count) : null,
      milestone: config.specialMilestones.find((item) => item.count === count) || null,
    });
  }

  async function resolve(url, growthCount) {
    const config = await loadConfig(url);
    return resolveFromConfig(config, growthCount);
  }

  function crossedStage(config, previousValue, currentValue) {
    const previous = resolveFromConfig(config, previousValue);
    const current = resolveFromConfig(config, currentValue);
    return current.stage > previous.stage
      ? Object.freeze({ crossed: true, previous, current })
      : Object.freeze({ crossed: false, previous, current });
  }

  window.TodayForestTreeGrowth = Object.freeze({
    loadConfig,
    normalizeGrowthCount,
    resolveFromConfig,
    resolve,
    crossedStage,
  });
})();
