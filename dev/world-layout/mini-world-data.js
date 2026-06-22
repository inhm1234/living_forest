/*
 * 오늘의숲 · 공동 숲 카메라 검증용 작은 월드 v0.1
 *
 * 목적: 1,024 슬롯 월드에 앞서, 하나의 고정 좌표 월드에서
 * 선택한 나무만 중앙에 보이고 다른 나무가 주변 숲이 되는지 검증한다.
 * 모든 좌표는 이 파일에만 고정되어 있다.
 */
(function attachMiniWorld(global) {
  const WORLD = Object.freeze({
    id: "camera-test-16",
    width: 900,
    height: 760,
    name: "공동 숲 카메라 검증용 작은 월드"
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

  // 실제 서비스 규칙과 같게: 한 사람(한 작은 숲 군락)에게 가까운 4개 슬롯을 예약한다.
  const groves = Object.freeze([
    { id: "grove-northwest", name: "북서 작은 숲 군락", slotIds: ["slot-01", "slot-02", "slot-05", "slot-06"] },
    { id: "grove-northeast", name: "북동 작은 숲 군락", slotIds: ["slot-03", "slot-04", "slot-07", "slot-08"] },
    { id: "grove-southwest", name: "남서 작은 숲 군락", slotIds: ["slot-09", "slot-10", "slot-13", "slot-14"] },
    { id: "grove-southeast", name: "남동 작은 숲 군락", slotIds: ["slot-11", "slot-12", "slot-15", "slot-16"] }
  ]);

  function getSlot(slotId) {
    return slots.find((slot) => slot.id === slotId) || null;
  }

  function getGrove(groveId) {
    return groves.find((grove) => grove.id === groveId) || null;
  }

  global.LivingForestMiniWorld = Object.freeze({
    version: "0.1.0",
    world: WORLD,
    slots,
    groves,
    getSlot,
    getGrove
  });
})(window);
