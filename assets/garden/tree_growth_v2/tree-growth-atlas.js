(() => {
  "use strict";

  const manifestCache = new Map();
  const elementState = new WeakMap();
  const transparentPixel = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E";

  const resizeObserver = "ResizeObserver" in window
    ? new ResizeObserver((entries) => {
        entries.forEach((entry) => syncElement(entry.target));
      })
    : null;

  async function loadManifest(url) {
    const absoluteUrl = new URL(url, location.href).href;
    if (!manifestCache.has(absoluteUrl)) {
      manifestCache.set(
        absoluteUrl,
        fetch(absoluteUrl, { cache: "force-cache" }).then((response) => {
          if (!response.ok) {
            throw new Error(`Tree atlas manifest load failed: ${response.status}`);
          }
          return response.json();
        })
      );
    }
    return manifestCache.get(absoluteUrl);
  }

  function syncElement(element) {
    const state = elementState.get(element);
    if (!state) return;

    const { manifest, sprite, imageUrl, fallbackDisplaySize } = state;
    const bounds = element.getBoundingClientRect();
    const displayWidth = bounds.width || fallbackDisplaySize || manifest.artWidth;
    if (!(displayWidth > 0)) return;

    const scale = displayWidth / manifest.artWidth;
    element.style.backgroundImage = `url("${imageUrl}")`;
    element.style.backgroundRepeat = "no-repeat";
    element.style.backgroundSize = `${manifest.atlasWidth * scale}px ${manifest.atlasHeight * scale}px`;
    element.style.backgroundPosition = `${-sprite.x * scale}px ${-sprite.y * scale}px`;
  }

  async function applyTreeAtlasSprite(element, options) {
    if (!(element instanceof HTMLElement)) {
      throw new TypeError("element must be an HTMLElement");
    }

    const {
      manifestUrl,
      stage,
      displaySize = null,
      renderToken = "",
    } = options || {};

    if (!manifestUrl) throw new Error("manifestUrl is required");
    if (!Number.isFinite(Number(stage))) throw new Error("stage is required");

    const absoluteManifestUrl = new URL(manifestUrl, location.href).href;
    const manifest = await loadManifest(absoluteManifestUrl);
    if (renderToken && element.dataset.treeGrowthRenderToken !== renderToken) return false;
    const sprite = manifest.sprites[String(stage)];
    if (!sprite) throw new Error(`Stage ${stage} does not exist in the atlas`);

    const imageUrl = new URL(manifest.image, absoluteManifestUrl).href;
    elementState.set(element, {
      manifest,
      sprite,
      imageUrl,
      fallbackDisplaySize: Number(displaySize) || manifest.artWidth,
    });

    if (element instanceof HTMLImageElement) {
      if (!element.dataset.treeAtlasFallbackSrc) {
        element.dataset.treeAtlasFallbackSrc = element.getAttribute("src") || "";
      }
      element.src = transparentPixel;
      element.decoding = "async";
      element.draggable = false;
    }

    element.classList.add("uses-tree-atlas");
    element.style.setProperty("--tree-stage", String(stage));
    element.dataset.treeAtlasStage = String(stage);
    element.style.aspectRatio = `${manifest.artWidth} / ${manifest.artHeight}`;

    syncElement(element);
    window.requestAnimationFrame(() => syncElement(element));
    resizeObserver?.observe(element);
    return true;
  }

  window.TodayForestTreeAtlas = Object.freeze({
    loadManifest,
    apply: applyTreeAtlasSprite,
    sync: syncElement,
  });
})();
