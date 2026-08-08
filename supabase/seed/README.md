# TodayForest Seed Baseline — 2026-08-08

This snapshot contains reference/catalog data required by the decoration crafting system.

- `garden_decoration_items`: 15 rows
- `garden_decoration_recipes`: 3 rows

## Usage

Do **not** run this against the current production database just to "sync" it.
Store it in Git as recovery material.

For a new/rebuilt database:

1. Apply the DB baseline/schema first.
2. Apply this seed SQL.
3. Configure runtime secrets separately.

The seed is idempotent: it uses `ON CONFLICT ... DO UPDATE` and does not delete rows.

## Secret safety

No service-role key, webhook secret, VAPID private key, or user data is included.
