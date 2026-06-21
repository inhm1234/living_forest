/*
 * 오늘의숲 DEV v0.3.2 — 좌표 기반 2.5D 월드 데이터
 *
 * 이 월드는 배경 원본(1448 × 1086)의 실제 픽셀 좌표를 그대로 사용한다.
 * x, y: 배경 안의 지면 좌표(px)
 * z: 언덕·단차처럼 화면에서 위로 들어 올릴 높이(px)
 * 렌더 순서: 나무의 밑동 y값으로 계산한다. 투명도로 원근을 만들지 않는다.
 */
(function attachLivingForestWorld(global) {
  const WORLD_WIDTH = 1448;
  const WORLD_HEIGHT = 1086;

  // 한 구역은 한 사람이 순서대로 키울 네 그루의 자리다.
  // 첫 자리는 현재 나무, 나머지는 30회 기록 이후 열릴 미래 자리다.
  const groves = [
    {
      id: "path-grove",
      name: "돌길 곁 작은 숲",
      camera: { x: 520, y: 520, zoomDesktop: 1.16, zoomMobile: 0.70 },
      slotIds: ["path-01", "path-02", "path-03", "path-04"]
    },
    {
      id: "river-grove",
      name: "개울가 들판",
      camera: { x: 675, y: 465, zoomDesktop: 1.18, zoomMobile: 0.72 },
      slotIds: ["river-01", "river-02", "river-03", "river-04"]
    },
    {
      id: "central-grove",
      name: "햇살 원형 뜰",
      camera: { x: 825, y: 505, zoomDesktop: 1.18, zoomMobile: 0.72 },
      slotIds: ["central-01", "central-02", "central-03", "central-04"]
    },
    {
      id: "swing-grove",
      name: "그네 숲 가장자리",
      camera: { x: 1085, y: 560, zoomDesktop: 1.16, zoomMobile: 0.70 },
      slotIds: ["swing-01", "swing-02", "swing-03", "swing-04"]
    },
    {
      id: "lower-meadow",
      name: "꽃길 아래 들판",
      camera: { x: 360, y: 690, zoomDesktop: 1.14, zoomMobile: 0.68 },
      slotIds: ["meadow-01", "meadow-02", "meadow-03", "meadow-04"]
    },
    {
      id: "flower-grove",
      name: "꽃울타리 뜰",
      camera: { x: 1110, y: 745, zoomDesktop: 1.14, zoomMobile: 0.68 },
      slotIds: ["flower-01", "flower-02", "flower-03", "flower-04"]
    },
    {
      id: "quiet-grove",
      name: "조용한 풀밭",
      camera: { x: 700, y: 735, zoomDesktop: 1.14, zoomMobile: 0.68 },
      slotIds: ["quiet-01", "quiet-02", "quiet-03", "quiet-04"]
    },
    {
      id: "pond-grove",
      name: "폭포 아래 물가",
      camera: { x: 555, y: 410, zoomDesktop: 1.18, zoomMobile: 0.72 },
      slotIds: ["pond-01", "pond-02", "pond-03", "pond-04"]
    }
  ];

  const treeSlots = [
    { id: "path-01", groveId: "path-grove", x: 485, y: 516, z: 0, scale: 0.88, role: "current" },
    { id: "path-02", groveId: "path-grove", x: 560, y: 532, z: 0, scale: 0.91, role: "future" },
    { id: "path-03", groveId: "path-grove", x: 514, y: 458, z: 10, scale: 0.74, role: "future" },
    { id: "path-04", groveId: "path-grove", x: 590, y: 472, z: 10, scale: 0.76, role: "future" },

    { id: "river-01", groveId: "river-grove", x: 622, y: 486, z: 0, scale: 0.86, role: "current" },
    { id: "river-02", groveId: "river-grove", x: 695, y: 500, z: 0, scale: 0.89, role: "future" },
    { id: "river-03", groveId: "river-grove", x: 650, y: 435, z: 9, scale: 0.74, role: "future" },
    { id: "river-04", groveId: "river-grove", x: 722, y: 445, z: 8, scale: 0.76, role: "future" },

    { id: "central-01", groveId: "central-grove", x: 790, y: 500, z: 0, scale: 0.86, role: "current" },
    { id: "central-02", groveId: "central-grove", x: 864, y: 512, z: 0, scale: 0.90, role: "future" },
    { id: "central-03", groveId: "central-grove", x: 818, y: 444, z: 10, scale: 0.73, role: "future" },
    { id: "central-04", groveId: "central-grove", x: 892, y: 455, z: 10, scale: 0.75, role: "future" },

    { id: "swing-01", groveId: "swing-grove", x: 1054, y: 553, z: 0, scale: 0.90, role: "current" },
    { id: "swing-02", groveId: "swing-grove", x: 1127, y: 569, z: 0, scale: 0.93, role: "future" },
    { id: "swing-03", groveId: "swing-grove", x: 1084, y: 494, z: 10, scale: 0.75, role: "future" },
    { id: "swing-04", groveId: "swing-grove", x: 1152, y: 507, z: 8, scale: 0.77, role: "future" },

    { id: "meadow-01", groveId: "lower-meadow", x: 320, y: 674, z: 0, scale: 0.96, role: "current" },
    { id: "meadow-02", groveId: "lower-meadow", x: 400, y: 696, z: 0, scale: 0.99, role: "future" },
    { id: "meadow-03", groveId: "lower-meadow", x: 342, y: 610, z: 8, scale: 0.78, role: "future" },
    { id: "meadow-04", groveId: "lower-meadow", x: 420, y: 625, z: 7, scale: 0.81, role: "future" },

    { id: "flower-01", groveId: "flower-grove", x: 1082, y: 745, z: 0, scale: 0.98, role: "current" },
    { id: "flower-02", groveId: "flower-grove", x: 1164, y: 760, z: 0, scale: 1.01, role: "future" },
    { id: "flower-03", groveId: "flower-grove", x: 1103, y: 678, z: 9, scale: 0.80, role: "future" },
    { id: "flower-04", groveId: "flower-grove", x: 1180, y: 694, z: 8, scale: 0.83, role: "future" },

    { id: "quiet-01", groveId: "quiet-grove", x: 670, y: 735, z: 0, scale: 0.99, role: "current" },
    { id: "quiet-02", groveId: "quiet-grove", x: 752, y: 752, z: 0, scale: 1.02, role: "future" },
    { id: "quiet-03", groveId: "quiet-grove", x: 696, y: 667, z: 7, scale: 0.80, role: "future" },
    { id: "quiet-04", groveId: "quiet-grove", x: 776, y: 683, z: 6, scale: 0.83, role: "future" },

    { id: "pond-01", groveId: "pond-grove", x: 510, y: 434, z: 5, scale: 0.76, role: "current" },
    { id: "pond-02", groveId: "pond-grove", x: 580, y: 447, z: 4, scale: 0.78, role: "future" },
    { id: "pond-03", groveId: "pond-grove", x: 535, y: 390, z: 15, scale: 0.67, role: "future" },
    { id: "pond-04", groveId: "pond-grove", x: 605, y: 401, z: 13, scale: 0.69, role: "future" }
  ];

  // 배경 그림 안의 실제 지형을 가볍게 강조하는 좌표 오브젝트다.
  // 배경을 새로 그리는 것이 아니라, 해당 위치의 물·길·꽃을 더 읽히게 한다.
  const terrainObjects = [
    { id: "water-shimmer", type: "water-shimmer", x: 605, y: 370, z: 0, width: 240, height: 58, depth: 2 },
    { id: "waterfall-mist", type: "waterfall-mist", x: 505, y: 347, z: 18, width: 92, height: 78, depth: 4 },
    { id: "path-highlight", type: "path-highlight", x: 310, y: 530, z: 0, width: 210, height: 280, depth: 5 },
    { id: "flower-left", type: "flower-patch", x: 420, y: 590, z: 0, width: 124, height: 56, depth: 8 },
    { id: "flower-center", type: "flower-patch", x: 740, y: 630, z: 0, width: 138, height: 62, depth: 8 },
    { id: "flower-right", type: "flower-patch", x: 1090, y: 674, z: 0, width: 140, height: 64, depth: 8 },
    { id: "hill-glow", type: "hill-glow", x: 950, y: 410, z: 14, width: 350, height: 190, depth: 2 },
    { id: "rock-right", type: "rock-cluster", x: 1002, y: 431, z: 8, width: 96, height: 55, depth: 9 },
    { id: "grass-front", type: "grass-sweep", x: 730, y: 814, z: 0, width: 820, height: 136, depth: 1 }
  ];

  const friendSeatSlotMap = {
    flower_path: "path-01",
    sunny_spot: "central-01",
    pond_spot: "pond-01",
    swing_spot: "swing-01",
    flower_fence: "flower-01"
  };

  function hashToIndex(value, size) {
    let hash = 0;
    const source = String(value || "living-forest");
    for (let index = 0; index < source.length; index += 1) {
      hash = ((hash << 5) - hash) + source.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash) % size;
  }

  function getGroveForTree(treeId) {
    return groves[hashToIndex(treeId, groves.length)];
  }

  function getReservationForTree(treeId) {
    const grove = getGroveForTree(treeId);
    return {
      groveId: grove.id,
      slotIds: [...grove.slotIds],
      activeSlotId: grove.slotIds[0]
    };
  }

  function getSlotById(slotId) {
    return treeSlots.find((slot) => slot.id === slotId) || null;
  }

  function getGroveById(groveId) {
    return groves.find((grove) => grove.id === groveId) || null;
  }

  global.LivingForestWorld = Object.freeze({
    version: "0.3.2",
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    groves,
    treeSlots,
    terrainObjects,
    friendSeatSlotMap,
    getSlotById,
    getGroveById,
    getReservationForTree
  });
})(window);
