(() => {
  "use strict";

  let renderSequence = 0;

  async function render(element, options) {
    if (!window.TodayForestTreeGrowth || !window.TodayForestTreeAtlas) {
      throw new Error("tree-growth-stage-map.js and tree-growth-atlas.js must be loaded first");
    }

    const {
      growthCount,
      mapUrl = "./assets/garden/tree_growth_v2/tree_growth_stage_map_v1.json",
      assetBaseUrl = "./assets/garden/tree_growth_v2/",
      displaySize = null,
    } = options || {};

    const renderToken = String(++renderSequence);
    element.dataset.treeGrowthRenderToken = renderToken;

    const config = await window.TodayForestTreeGrowth.loadConfig(mapUrl);
    if (element.dataset.treeGrowthRenderToken !== renderToken) return null;

    const state = window.TodayForestTreeGrowth.resolveFromConfig(config, growthCount);
    const group = config.atlasGroups[state.atlas];
    if (!group) throw new Error(`Unknown tree atlas group: ${state.atlas}`);

    const manifestUrl = new URL(group.manifest, new URL(assetBaseUrl, location.href)).href;
    await window.TodayForestTreeAtlas.apply(element, {
      manifestUrl,
      stage: state.stage,
      displaySize,
      renderToken,
    });
    if (element.dataset.treeGrowthRenderToken !== renderToken) return null;

    element.dataset.treeGrowthCount = String(state.growthCount);
    element.dataset.treeGrowthStage = String(state.stage);
    element.setAttribute("aria-label", state.label);
    if (element instanceof HTMLImageElement) element.alt = state.label;
    return state;
  }

  window.TodayForestTreeRenderer = Object.freeze({ render });
})();
