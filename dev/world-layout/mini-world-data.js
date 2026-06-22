/*
 * 오늘의숲 · 개인 화면 시야 검증용 작은 월드 v0.2
 *
 * 목적: 같은 고정 좌표 월드에서, 내 나무가 앞쪽 나무·바위·능선에
 * 가려지지 않도록 개인 화면의 시야 규칙을 검토한다.
 */
(function attachMiniWorld(global) {
  const WORLD = Object.freeze({
    id: "visibility-test-16",
    width: 900,
    height: 760,
    name: "공동 숲 개인 시야 검증용 작은 월드"
  });

  const slots = Object.freeze([
    { id: "slot-01", label: "슬롯 01", x: 130, y: 110, z: 22, groveId: "grove-northwest", growth: 0.78 },
    { id: "slot-02", label: "슬롯 02", x: 338, y: 96, z: 20, groveId: "grove-northwest", growth: 0.88 },
    { id: "slot-03", label: "슬롯 03", x: 548, y: 121, z: 17, groveId: "grove-northeast", growth: 0.82 },
    { id: "slot-04", label: "슬롯 04", x: 778, y: 104, z: 27, groveId: "grove-northeast", growth: 0.92 },

    { id: "slot-05", label: "슬롯 05", x: 118, y: 292, z: 12, groveId: "grove-northwest", growth: 0.96 },
    { id: "slot-06", label: "슬롯 06", x: 344, y: 266, z: 10, groveId: "grove-northwest", growth: 1.00 },
    { id: "slot-07", label: "슬롯 07", x: 570, y: 286, z: 8, groveId: "grove-northeast", growth: 0.86 },
    { id: "slot-08", label: "슬롯 08", x: 796, y: 260, z: 14, groveId: "grove-northeast", growth: 1.02 },

    { id: "slot-09", label: "슬롯 09", x: 104, y: 462, z: 4, groveId: "grove-southwest", growth: 0.84 },
    { id: "slot-10", label: "슬롯 10", x: 340, y: 475, z: 4, groveId: "grove-southwest", growth: 0.94 },
    { id: "slot-11", label: "슬롯 11", x: 562, y: 452, z: 6, groveId: "grove-southeast", growth: 1.04 },
    { id: "slot-12", label: "슬롯 12", x: 808, y: 468, z: 8, groveId: "grove-southeast", growth: 0.90 },

    { id: "slot-13", label: "슬롯 13", x: 133, y: 652, z: 0, groveId: "grove-southwest", growth: 0.98 },
    { id: "slot-14", label: "슬롯 14", x: 352, y: 648, z: 0, groveId: "grove-southwest", growth: 0.80 },
    { id: "slot-15", label: "슬롯 15", x: 583, y: 664, z: 2, groveId: "grove-southeast", growth: 0.92 },
    { id: "slot-16", label: "슬롯 16", x: 786, y: 642, z: 2, groveId: "grove-southeast", growth: 1.06 }
  ]);

  const groves = Object.freeze([
    { id: "grove-northwest", name: "북서 작은 숲 군락", slotIds: ["slot-01", "slot-02", "slot-05", "slot-06"] },
    { id: "grove-northeast", name: "북동 작은 숲 군락", slotIds: ["slot-03", "slot-04", "slot-07", "slot-08"] },
    { id: "grove-southwest", name: "남서 작은 숲 군락", slotIds: ["slot-09", "slot-10", "slot-13", "slot-14"] },
    { id: "grove-southeast", name: "남동 작은 숲 군락", slotIds: ["slot-11", "slot-12", "slot-15", "slot-16"] }
  ]);

  // 지형지물도 고정 좌표를 가진다.
  // policy: tree=숨김, soften=약화, camera=카메라 보정, low=그대로 유지
  const scenery = Object.freeze([
    { id: "ridge-west", label: "낮은 능선", kind: "terrain", policy: "camera", x: 450, y: 330, z: 20, width: 300, height: 118 },
    { id: "ridge-east", label: "완만한 둔덕", kind: "terrain", policy: "camera", x: 688, y: 520, z: 14, width: 250, height: 86 },
    { id: "rock-west", label: "큰 바위", kind: "rock", policy: "soften", x: 352, y: 354, z: 12, width: 82, height: 70 },
    { id: "rock-south", label: "큰 바위", kind: "rock", policy: "soften", x: 510, y: 515, z: 8, width: 78, height: 62 },
    { id: "stream", label: "작은 개울", kind: "stream", policy: "low", x: 286, y: 360, z: 0 },
    { id: "path", label: "숲길", kind: "path", policy: "low", x: 470, y: 545, z: 0 }
  ]);

  function getSlot(slotId) {
    return slots.find((slot) => slot.id === slotId) || null;
  }

  function getGrove(groveId) {
    return groves.find((grove) => grove.id === groveId) || null;
  }

  global.LivingForestMiniWorld = Object.freeze({
    version: "0.2.0",
    world: WORLD,
    slots,
    groves,
    scenery,
    getSlot,
    getGrove
  });
})(window);
