// TODAYFOREST DECORATION RECIPES V1
// 화면에 표시할 레시피와 특별장식 메타데이터를 앱 본체에서 분리합니다.
// 새 레시피는 이 목록과 SQL의 garden_decoration_recipes 데이터만 추가하면 됩니다.

export const BASIC_DECORATION_ITEM_KEYS = Object.freeze([
  "pink_wildflower",
  "white_daisies",
  "mushroom_pair",
  "mossy_round_rock",
  "amber_mushroom",
  "leafy_pile",
  "tiny_hedgehog",
  "tiny_squirrel",
  "branch_letter",
  "forest_ribbon",
  "firefly_jar",
  "little_sign",
]);

export const DECORATION_RECIPE_CATALOG = Object.freeze([
  Object.freeze({
    key: "flower_meadow_v1",
    name: "꽃빛 작은 들판",
    description: "들꽃과 데이지가 모여 정원 한편에 작은 꽃길을 만들어요.",
    result: Object.freeze({
      itemKey: "crafted_flower_meadow",
      name: "꽃빛 작은 들판",
      detail: "여러 날 모은 꽃들이 작은 들판으로 피어났어요.",
      asset: "assets/decorations/trade-flower-meadow.png",
    }),
    ingredients: Object.freeze([
      Object.freeze({ itemKey: "pink_wildflower", quantity: 1 }),
      Object.freeze({ itemKey: "white_daisies", quantity: 1 }),
    ]),
    flexible: Object.freeze({ quantity: 1, allowedItemKeys: BASIC_DECORATION_ITEM_KEYS }),
    enabled: true,
    sortOrder: 10,
  }),
  Object.freeze({
    key: "moonlit_mushroom_lamp_v1",
    name: "달빛 버섯등",
    description: "두 종류의 버섯이 은은한 숲빛을 머금은 특별장식이 돼요.",
    result: Object.freeze({
      itemKey: "crafted_moonlit_mushroom_lamp",
      name: "달빛 버섯등",
      detail: "달빛을 머금은 버섯들이 밤의 정원을 조용히 밝혀줘요.",
      asset: "assets/decorations/trade-moonlit-mushroom-lamp.png",
    }),
    ingredients: Object.freeze([
      Object.freeze({ itemKey: "mushroom_pair", quantity: 1 }),
      Object.freeze({ itemKey: "amber_mushroom", quantity: 1 }),
    ]),
    flexible: Object.freeze({ quantity: 1, allowedItemKeys: BASIC_DECORATION_ITEM_KEYS }),
    enabled: true,
    sortOrder: 20,
  }),
  Object.freeze({
    key: "mossy_path_v1",
    name: "이끼꽃 숲길",
    description: "둥근 돌과 낙엽이 포근한 숲길로 이어져요.",
    result: Object.freeze({
      itemKey: "crafted_mossy_path",
      name: "이끼꽃 숲길",
      detail: "이끼와 작은 꽃 사이로 이어지는 숲길이 생겼어요.",
      asset: "assets/decorations/trade-mossy-path.png",
    }),
    ingredients: Object.freeze([
      Object.freeze({ itemKey: "mossy_round_rock", quantity: 1 }),
      Object.freeze({ itemKey: "leafy_pile", quantity: 1 }),
    ]),
    flexible: Object.freeze({ quantity: 1, allowedItemKeys: BASIC_DECORATION_ITEM_KEYS }),
    enabled: true,
    sortOrder: 30,
  }),
]);

export function decorationRecipeByKey(recipeKey) {
  return DECORATION_RECIPE_CATALOG.find((recipe) => recipe.key === recipeKey) || null;
}

export function decorationRecipeResultCatalog() {
  return Object.fromEntries(
    DECORATION_RECIPE_CATALOG.map((recipe) => [recipe.result.itemKey, {
      name: recipe.result.name,
      detail: recipe.result.detail,
      asset: recipe.result.asset,
      isSpecialRecipeResult: true,
    }])
  );
}
