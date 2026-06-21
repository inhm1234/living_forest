/*
 * 오늘의숲 DEV v0.3.1 — 좌표 기반 2.5D 월드 데이터
 * x, y: 월드의 지면 좌표(px)
 * z: 지형의 높이(px). 화면에서는 위로 들어 올려 렌더링한다.
 * renderOrder: 나무 밑동의 y를 기준으로 자동 계산한다.
 * 이 파일은 "배경 위에 나무를 얹는" 용도가 아니라,
 * 고정된 레벨디자인과 나무 슬롯을 가진 실제 공유 월드의 첫 데이터다.
 */
(function attachLivingForestWorld(global) {
  const WORLD_WIDTH = 3200;
  const WORLD_HEIGHT = 1800;

  const groves = [
    {
      id: "river-meadow",
      name: "개울가 들판",
      camera: { x: 1160, y: 1040, zoom: 0.46 },
      slotIds: ["river-01", "river-02", "river-03", "river-04"]
    },
    {
      id: "rainbow-path",
      name: "무지개 길목",
      camera: { x: 1500, y: 980, zoom: 0.47 },
      slotIds: ["rainbow-01", "rainbow-02", "rainbow-03", "rainbow-04"]
    },
    {
      id: "blossom-hill",
      name: "벚꽃 언덕",
      camera: { x: 1900, y: 900, zoom: 0.47 },
      slotIds: ["blossom-01", "blossom-02", "blossom-03", "blossom-04"]
    },
    {
      id: "swing-woods",
      name: "그네 숲 가장자리",
      camera: { x: 2490, y: 980, zoom: 0.45 },
      slotIds: ["swing-01", "swing-02", "swing-03", "swing-04"]
    },
    {
      id: "flower-corner",
      name: "꽃울타리 모퉁이",
      camera: { x: 2280, y: 1330, zoom: 0.45 },
      slotIds: ["flower-01", "flower-02", "flower-03", "flower-04"]
    },
    {
      id: "quiet-field",
      name: "조용한 풀밭",
      camera: { x: 1620, y: 1360, zoom: 0.46 },
      slotIds: ["quiet-01", "quiet-02", "quiet-03", "quiet-04"]
    },
    {
      id: "bridge-garden",
      name: "작은 다리 정원",
      camera: { x: 720, y: 1180, zoom: 0.44 },
      slotIds: ["bridge-01", "bridge-02", "bridge-03", "bridge-04"]
    },
    {
      id: "sunny-grove",
      name: "햇살 숲",
      camera: { x: 2660, y: 760, zoom: 0.43 },
      slotIds: ["sunny-01", "sunny-02", "sunny-03", "sunny-04"]
    }
  ];

  // z는 배경 일러스트의 언덕/단차를 따라 사용자 나무의 밑동을 화면 위로 올리는 값이다.
  const treeSlots = [
    { id: "river-01", groveId: "river-meadow", x: 1020, y: 1070, z: 16, scale: 0.98, role: "current" },
    { id: "river-02", groveId: "river-meadow", x: 1240, y: 1005, z: 22, scale: 0.89, role: "future" },
    { id: "river-03", groveId: "river-meadow", x: 1110, y: 870, z: 44, scale: 0.76, role: "future" },
    { id: "river-04", groveId: "river-meadow", x: 1360, y: 905, z: 39, scale: 0.78, role: "future" },

    { id: "rainbow-01", groveId: "rainbow-path", x: 1460, y: 1000, z: 12, scale: 0.97, role: "current" },
    { id: "rainbow-02", groveId: "rainbow-path", x: 1640, y: 1080, z: 8, scale: 1.00, role: "future" },
    { id: "rainbow-03", groveId: "rainbow-path", x: 1570, y: 842, z: 48, scale: 0.73, role: "future" },
    { id: "rainbow-04", groveId: "rainbow-path", x: 1780, y: 900, z: 38, scale: 0.80, role: "future" },

    { id: "blossom-01", groveId: "blossom-hill", x: 1930, y: 970, z: 44, scale: 0.86, role: "current" },
    { id: "blossom-02", groveId: "blossom-hill", x: 2100, y: 1005, z: 36, scale: 0.89, role: "future" },
    { id: "blossom-03", groveId: "blossom-hill", x: 1980, y: 770, z: 82, scale: 0.67, role: "future" },
    { id: "blossom-04", groveId: "blossom-hill", x: 2170, y: 820, z: 70, scale: 0.71, role: "future" },

    { id: "swing-01", groveId: "swing-woods", x: 2470, y: 1040, z: 18, scale: 0.94, role: "current" },
    { id: "swing-02", groveId: "swing-woods", x: 2670, y: 1085, z: 12, scale: 0.99, role: "future" },
    { id: "swing-03", groveId: "swing-woods", x: 2550, y: 840, z: 62, scale: 0.70, role: "future" },
    { id: "swing-04", groveId: "swing-woods", x: 2770, y: 895, z: 54, scale: 0.75, role: "future" },

    { id: "flower-01", groveId: "flower-corner", x: 2200, y: 1370, z: 8, scale: 1.05, role: "current" },
    { id: "flower-02", groveId: "flower-corner", x: 2410, y: 1435, z: 0, scale: 1.12, role: "future" },
    { id: "flower-03", groveId: "flower-corner", x: 2300, y: 1190, z: 34, scale: 0.83, role: "future" },
    { id: "flower-04", groveId: "flower-corner", x: 2510, y: 1240, z: 28, scale: 0.87, role: "future" },

    { id: "quiet-01", groveId: "quiet-field", x: 1510, y: 1400, z: 4, scale: 1.08, role: "current" },
    { id: "quiet-02", groveId: "quiet-field", x: 1720, y: 1450, z: 0, scale: 1.13, role: "future" },
    { id: "quiet-03", groveId: "quiet-field", x: 1600, y: 1215, z: 26, scale: 0.88, role: "future" },
    { id: "quiet-04", groveId: "quiet-field", x: 1810, y: 1265, z: 18, scale: 0.92, role: "future" },

    { id: "bridge-01", groveId: "bridge-garden", x: 650, y: 1230, z: 12, scale: 1.00, role: "current" },
    { id: "bridge-02", groveId: "bridge-garden", x: 850, y: 1305, z: 5, scale: 1.08, role: "future" },
    { id: "bridge-03", groveId: "bridge-garden", x: 760, y: 1050, z: 30, scale: 0.84, role: "future" },
    { id: "bridge-04", groveId: "bridge-garden", x: 930, y: 1100, z: 25, scale: 0.88, role: "future" },

    { id: "sunny-01", groveId: "sunny-grove", x: 2590, y: 780, z: 68, scale: 0.72, role: "current" },
    { id: "sunny-02", groveId: "sunny-grove", x: 2800, y: 850, z: 55, scale: 0.77, role: "future" },
    { id: "sunny-03", groveId: "sunny-grove", x: 2690, y: 630, z: 108, scale: 0.60, role: "future" },
    { id: "sunny-04", groveId: "sunny-grove", x: 2890, y: 700, z: 92, scale: 0.65, role: "future" }
  ];

  const terrainObjects = [
    { id: "stream-light", type: "water-shimmer", x: 1080, y: 640, z: 0, width: 650, height: 150, depth: 2 },
    { id: "waterfall-mist", type: "waterfall-mist", x: 1140, y: 585, z: 72, width: 190, height: 165, depth: 4 },
    { id: "path-left", type: "path-highlight", x: 630, y: 1170, z: 0, width: 420, height: 520, depth: 5 },
    { id: "hill-blossom", type: "hill-glow", x: 1980, y: 780, z: 96, width: 620, height: 380, depth: 2 },
    { id: "rock-right", type: "rock-cluster", x: 2300, y: 1030, z: 30, width: 160, height: 88, depth: 9 },
    { id: "flowers-left", type: "flower-patch", x: 830, y: 1170, z: 8, width: 190, height: 95, depth: 8 },
    { id: "flowers-center", type: "flower-patch", x: 1740, y: 1190, z: 12, width: 220, height: 102, depth: 8 },
    { id: "flowers-right", type: "flower-patch", x: 2490, y: 1290, z: 5, width: 240, height: 112, depth: 8 },
    { id: "meadow-front", type: "grass-sweep", x: 1620, y: 1540, z: 0, width: 1800, height: 240, depth: 1 },
    { id: "ridge-sunny", type: "hill-glow", x: 2700, y: 640, z: 110, width: 470, height: 260, depth: 1 }
  ];

  const friendSeatSlotMap = {
    flower_path: "bridge-01",
    sunny_spot: "sunny-01",
    pond_spot: "river-03",
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
    version: "0.3.1",
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
