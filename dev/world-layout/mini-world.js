(function bootMiniWorldVisibility() {
  "use strict";

  const data = window.LivingForestMiniWorld;
  if (!data) throw new Error("LivingForestMiniWorld 데이터가 없습니다.");

  const state = {
    selectedSlotId: "slot-07",
    direction: "west"
  };

  const directionAngles = Object.freeze({
    north: 0,
    east: Math.PI / 2,
    south: Math.PI,
    west: -Math.PI / 2
  });

  const directionNames = Object.freeze({
    north: "북쪽",
    east: "동쪽",
    south: "남쪽",
    west: "서쪽"
  });

  const elements = {
    slotSelect: document.querySelector("#slot-select"),
    currentState: document.querySelector("#current-state"),
    visibilityState: document.querySelector("#visibility-state"),
    treeLayer: document.querySelector("#tree-layer"),
    selectedTreeLabel: document.querySelector("#selected-tree-label"),
    worldMap: document.querySelector("#world-map"),
    slotInfo: document.querySelector("#slot-info"),
    directionButtons: Array.from(document.querySelectorAll(".direction-button"))
  };

  function getSelectedSlot() {
    return data.getSlot(state.selectedSlotId);
  }

  function rotateForCamera(point, selected) {
    const angle = directionAngles[state.direction];
    const dx = point.x - selected.x;
    const dy = point.y - selected.y;
    return {
      x: dx * Math.cos(angle) - dy * Math.sin(angle),
      y: dx * Math.sin(angle) + dy * Math.cos(angle)
    };
  }

  function projectPoint(point, selected, options = {}) {
    const rotated = rotateForCamera(point, selected);
    const normalizedDepth = Math.max(-1, Math.min(1, rotated.y / 520));
    const perspective = 0.78 + ((normalizedDepth + 1) * 0.18);
    const z = Number(point.z || 0);
    const baseScale = Number(options.baseScale || point.growth || 1);

    return {
      left: 50 + (rotated.x / 8.4),
      top: 61 + (rotated.y / 14.4) - (z / 5.4),
      depth: rotated.y,
      perspective,
      scale: baseScale * perspective,
      distance: Math.hypot(rotated.x, rotated.y)
    };
  }

  // 개인 화면에서 내 나무 바로 앞 중앙을 가리는지 판별하는 간단한 DEV 규칙.
  // 실제 월드 01에서는 지형 폴리곤·높이 데이터와 충돌 판정으로 더 정교하게 확장한다.
  function isInSightLane(projected, width = 10) {
    return projected.depth > 38
      && projected.top > 60
      && projected.top < 96
      && Math.abs(projected.left - 50) < width;
  }

  function buildVisibilityReport(selected) {
    const treeEntries = data.slots
      .filter((slot) => slot.id !== selected.id)
      .map((slot) => ({ slot, projected: projectPoint(slot, selected) }));

    const sceneryEntries = data.scenery
      .map((item) => ({ item, projected: projectPoint(item, selected, { baseScale: 1 }) }));

    const hiddenTreeIds = treeEntries
      .filter(({ projected }) => isInSightLane(projected, 9))
      .map(({ slot }) => slot.id);

    const softenedSceneryIds = sceneryEntries
      .filter(({ item, projected }) => item.policy === "soften" && isInSightLane(projected, 12))
      .map(({ item }) => item.id);

    const terrainBlocks = sceneryEntries
      .filter(({ item, projected }) => item.policy === "camera" && isInSightLane(projected, 13));

    return {
      treeEntries,
      sceneryEntries,
      hiddenTreeIds,
      softenedSceneryIds,
      terrainBlocks,
      cameraLift: terrainBlocks.length ? 18 : 0
    };
  }

  function createTreeElement(slot, projected) {
    const tree = document.createElement("button");
    tree.type = "button";
    tree.className = "test-tree" + (slot.id === state.selectedSlotId ? " is-current" : "");
    tree.dataset.slotId = slot.id;
    tree.style.left = `${projected.left}%`;
    tree.style.top = `${projected.top}%`;
    tree.style.setProperty("--tree-scale", projected.scale.toFixed(3));
    tree.style.zIndex = String(1000 + Math.round(projected.depth * 10));
    tree.setAttribute(
      "aria-label",
      slot.id === state.selectedSlotId
        ? `${slot.label}, 내 나무. x ${slot.x}, y ${slot.y}, z ${slot.z}`
        : `${slot.label}, 주변 나무. x ${slot.x}, y ${slot.y}, z ${slot.z}`
    );
    tree.innerHTML = `
      <span class="tree-shadow"></span>
      <span class="tree-trunk"></span>
      <span class="tree-canopy tree-canopy-left"></span>
      <span class="tree-canopy tree-canopy-right"></span>
      <span class="tree-canopy tree-canopy-top"></span>
      <span class="tree-slot-number">${slot.id.replace("slot-", "")}</span>
    `;
    tree.addEventListener("click", () => setSelectedSlot(slot.id));
    return tree;
  }

  function createSceneryElement(item, projected, report) {
    if (item.policy === "low") return null;

    const element = document.createElement("div");
    const isSoftened = report.softenedSceneryIds.includes(item.id);
    const isTerrainLifted = item.policy === "camera" && report.terrainBlocks.some(({ item: block }) => block.id === item.id);

    element.className = `scene-object scene-object-${item.kind}`
      + (isSoftened ? " is-softened" : "")
      + (isTerrainLifted ? " is-camera-lifted" : "");
    element.style.left = `${projected.left}%`;
    element.style.top = `${projected.top + (isTerrainLifted ? report.cameraLift : 0)}%`;
    element.style.zIndex = String(1000 + Math.round(projected.depth * 10));
    element.style.setProperty("--scene-scale", projected.perspective.toFixed(3));

    if (item.kind === "rock") {
      element.style.setProperty("--scene-width", `${item.width}px`);
      element.style.setProperty("--scene-height", `${item.height}px`);
      element.innerHTML = `<span class="scene-object-label">${isSoftened ? "바위 · 시야 약화" : item.label}</span>`;
    } else {
      element.style.setProperty("--scene-width", `${item.width}px`);
      element.style.setProperty("--scene-height", `${item.height}px`);
      element.innerHTML = `<span class="scene-object-label">${isTerrainLifted ? "능선 · 카메라 보정" : item.label}</span>`;
    }

    return element;
  }

  function renderCamera() {
    const selected = getSelectedSlot();
    if (!selected) return;

    const report = buildVisibilityReport(selected);
    const hiddenTreeSet = new Set(report.hiddenTreeIds);
    const stageItems = [];

    data.slots.forEach((slot) => {
      const projected = projectPoint(slot, selected);
      if (slot.id !== selected.id && hiddenTreeSet.has(slot.id)) return;
      stageItems.push({ type: "tree", slot, projected, depth: projected.depth });
    });

    report.sceneryEntries.forEach(({ item, projected }) => {
      const element = createSceneryElement(item, projected, report);
      if (element) stageItems.push({ type: "scenery", item, projected, element, depth: projected.depth });
    });

    stageItems.sort((a, b) => a.depth - b.depth);
    elements.treeLayer.replaceChildren();
    stageItems.forEach((entry) => {
      const element = entry.type === "tree"
        ? createTreeElement(entry.slot, entry.projected)
        : entry.element;
      elements.treeLayer.append(element);
    });

    elements.selectedTreeLabel.textContent = `${selected.label} · 내 나무`;
    elements.currentState.textContent = `${selected.label}을 중심으로 ${directionNames[state.direction]}쪽을 보는 중`;

    const messages = [];
    if (report.hiddenTreeIds.length) messages.push(`앞 나무 ${report.hiddenTreeIds.length}그루 숨김`);
    if (report.softenedSceneryIds.length) messages.push(`바위 ${report.softenedSceneryIds.length}개 약화`);
    if (report.terrainBlocks.length) messages.push("능선 카메라 높이 보정");
    elements.visibilityState.textContent = messages.length
      ? `시야 보정 적용 · ${messages.join(" · ")}`
      : "시야 통로 확보 · 추가 보정 없음";

    return report;
  }

  function renderMap() {
    const selected = getSelectedSlot();
    const svg = elements.worldMap;
    const ns = "http://www.w3.org/2000/svg";
    svg.replaceChildren();

    function svgElement(name, attrs = {}) {
      const element = document.createElementNS(ns, name);
      Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, String(value)));
      return element;
    }

    const title = svgElement("title");
    title.textContent = "공동 숲 개인 시야 검증용 16개 고정 슬롯과 지형지물 지도";
    svg.append(title);

    const description = svgElement("desc");
    description.textContent = "모든 점과 지형지물은 고정된 좌표입니다. 개인 화면에서만 내 나무 시야를 확보하는 표현 규칙이 적용됩니다.";
    svg.append(description);

    const terrain = svgElement("g", { class: "map-terrain" });
    terrain.append(
      svgElement("path", { d: "M0 0H900V170C740 135 584 170 420 132C262 96 128 145 0 118Z", class: "terrain-high" }),
      svgElement("path", { d: "M0 125C140 160 216 115 354 152C494 190 708 128 900 188V430C706 388 615 465 444 411C254 351 109 438 0 390Z", class: "terrain-mid" }),
      svgElement("path", { d: "M0 385C180 427 300 380 474 433C647 485 771 413 900 447V760H0Z", class: "terrain-low" }),
      svgElement("path", { d: "M188 0C246 102 208 168 287 248C352 314 326 411 426 508C488 568 486 669 536 760", class: "map-stream" }),
      svgElement("path", { d: "M0 537C179 474 342 505 472 548C642 605 761 572 900 524", class: "map-path" }),
      svgElement("path", { d: "M380 490C408 517 444 530 472 548", class: "map-bridge" })
    );
    svg.append(terrain);

    const scenery = svgElement("g", { class: "map-scenery" });
    data.scenery.filter((item) => item.kind !== "stream" && item.kind !== "path").forEach((item) => {
      if (item.kind === "terrain") {
        scenery.append(svgElement("ellipse", {
          cx: item.x,
          cy: item.y - item.z * 0.45,
          rx: item.width / 2.2,
          ry: item.height / 3.2,
          class: "map-ridge"
        }));
      } else {
        scenery.append(svgElement("circle", {
          cx: item.x,
          cy: item.y - item.z * 0.6,
          r: 19,
          class: "map-rock"
        }));
      }
    });
    svg.append(scenery);

    const labels = svgElement("g", { class: "map-labels" });
    [
      { text: "북쪽 능선", x: 450, y: 58 },
      { text: "작은 개울", x: 254, y: 310 },
      { text: "열린 숲", x: 654, y: 350 },
      { text: "남쪽 평지", x: 478, y: 710 }
    ].forEach((item) => {
      const text = svgElement("text", { x: item.x, y: item.y, "text-anchor": "middle" });
      text.textContent = item.text;
      labels.append(text);
    });
    svg.append(labels);

    const angle = directionAngles[state.direction];
    const endX = selected.x + Math.sin(angle) * 78;
    const endY = selected.y - Math.cos(angle) * 78;
    const cameraLines = svgElement("g", { class: "map-camera-lines" });
    cameraLines.append(
      svgElement("circle", { cx: selected.x, cy: selected.y, r: 44, class: "camera-ring" }),
      svgElement("line", { x1: selected.x, y1: selected.y, x2: endX, y2: endY, class: "camera-arrow" })
    );
    svg.append(cameraLines);

    const slotsGroup = svgElement("g", { class: "map-slots" });
    data.slots.forEach((slot) => {
      const group = svgElement("g", {
        class: `map-slot${slot.id === selected.id ? " is-current" : ""}`,
        role: "button",
        tabindex: "0",
        "aria-label": `${slot.label} 선택`
      });
      group.append(
        svgElement("circle", { cx: slot.x, cy: slot.y - slot.z * 0.6, r: slot.id === selected.id ? 14 : 10, class: "map-slot-halo" }),
        svgElement("circle", { cx: slot.x, cy: slot.y - slot.z * 0.6, r: slot.id === selected.id ? 7 : 5, class: "map-slot-dot" })
      );
      const text = svgElement("text", { x: slot.x + 14, y: slot.y - slot.z * 0.6 - 11, class: "map-slot-id" });
      text.textContent = slot.id.replace("slot-", "");
      group.append(text);
      group.addEventListener("click", () => setSelectedSlot(slot.id));
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setSelectedSlot(slot.id);
        }
      });
      slotsGroup.append(group);
    });
    svg.append(slotsGroup);
  }

  function renderSlotInfo() {
    const selected = getSelectedSlot();
    const grove = data.getGrove(selected.groveId);
    const report = buildVisibilityReport(selected);
    const otherGroveSlots = grove ? grove.slotIds.filter((slotId) => slotId !== selected.id) : [];
    const terrainMessage = report.terrainBlocks.length
      ? `능선 보정 필요: ${report.terrainBlocks.map(({ item }) => item.label).join(", ")}`
      : "현재 방향에서는 큰 지형 보정 없음";

    elements.slotInfo.innerHTML = `
      <div class="slot-info-kicker">선택한 내 나무 · 개인 시야 규칙</div>
      <div class="slot-info-main"><strong>${selected.label}</strong><span>${grove ? grove.name : "테스트 군락"}</span></div>
      <dl>
        <div><dt>x</dt><dd>${selected.x}</dd></div>
        <div><dt>y</dt><dd>${selected.y}</dd></div>
        <div><dt>z</dt><dd>${selected.z}</dd></div>
        <div><dt>군락</dt><dd>${grove ? grove.id : selected.groveId}</dd></div>
      </dl>
      <p>같은 군락의 다른 자리: ${otherGroveSlots.map((slotId) => data.getSlot(slotId).label).join(", ") || "없음"}</p>
      <p class="visibility-detail"><b>${terrainMessage}</b> · 앞 나무 ${report.hiddenTreeIds.length}그루 숨김 · 앞 바위 ${report.softenedSceneryIds.length}개 약화</p>
    `;
  }

  function syncControls() {
    elements.slotSelect.value = state.selectedSlotId;
    elements.directionButtons.forEach((button) => {
      const active = button.dataset.direction === state.direction;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function render() {
    syncControls();
    renderCamera();
    renderMap();
    renderSlotInfo();
  }

  function setSelectedSlot(slotId) {
    if (!data.getSlot(slotId)) return;
    state.selectedSlotId = slotId;
    render();
  }

  function setupEvents() {
    elements.slotSelect.addEventListener("change", (event) => setSelectedSlot(event.target.value));
    elements.directionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.direction = button.dataset.direction;
        render();
      });
    });
  }

  function populateSlots() {
    data.slots.forEach((slot) => {
      const option = document.createElement("option");
      option.value = slot.id;
      option.textContent = `${slot.label} · x ${slot.x} / y ${slot.y} / z ${slot.z}`;
      elements.slotSelect.append(option);
    });
  }

  populateSlots();
  setupEvents();
  render();
})();
