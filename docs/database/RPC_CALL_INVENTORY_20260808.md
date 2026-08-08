# TodayForest RPC call inventory · 2026-08-08

- Production JS RPC names: **60**
- RPC names with a matching `CREATE FUNCTION` somewhere in this ZIP: **6**
- Called RPC names without a matching function definition in this ZIP: **54**

> This is a static repository inventory, not a live Supabase schema dump. Overloads and dynamic SQL can affect counts.

## Definitions found in repository

- `add_my_garden_shared_tree_light` — dev/garden-login-test/SQL_SHARED_TREE_LIGHT_BUTTON_V1.sql
- `create_my_garden_shared_tree_invite` — dev/garden-login-test/SQL_SHARED_TREE_SEED_V1.sql
- `list_my_garden_feedback` — dev/garden-login-test/SQL_GARDEN_FEEDBACK_REPLY_V1.sql
- `list_my_garden_shared_tree_invites` — dev/garden-login-test/SQL_SHARED_TREE_SEED_V1.sql
- `list_my_garden_shared_trees` — dev/garden-login-test/SQL_SHARED_TREE_GROWTH_V1.sql, dev/garden-login-test/SQL_SHARED_TREE_SEED_V1.sql, dev/garden-login-test/SQL_SHARED_TREE_LIGHT_BUTTON_V1.sql
- `submit_my_garden_feedback` — dev/garden-login-test/SQL_GARDEN_FEEDBACK_V1.sql

## Called by production JavaScript but definition not found in repository

- `accept_garden_friend_invite`
- `accept_my_garden_shared_tree_invite_v2`
- `add_my_garden_shared_tree_care`
- `begin_my_garden_special_friend_meeting`
- `bootstrap_my_garden_profile`
- `cancel_my_garden_friend_request`
- `claim_garden_dev_found_item`
- `complete_my_garden_special_friend_meeting`
- `consume_my_garden_retention_dev_notices`
- `create_garden_friend_invite`
- `create_garden_friend_request_by_code`
- `dismiss_my_garden_retention_dev_test`
- `enable_my_dev_test_friend`
- `end_garden_friendship_v1`
- `ensure_my_garden_friend_code`
- `exchange_my_garden_decoration_recipe_v1`
- `get_my_garden_friend_view`
- `get_my_garden_letter_body`
- `get_my_garden_shared_tree_v2`
- `get_my_garden_special_friend_letter_body_v1`
- `list_my_garden_friend_dev_found_items`
- `list_my_garden_friend_fruits`
- `list_my_garden_friend_requests`
- `list_my_garden_friends`
- `list_my_garden_retention_dev_tests`
- `list_my_garden_shared_tree_notes`
- `list_my_garden_shared_trees_v2`
- `list_my_garden_special_friend_letters_v1`
- `list_my_sent_garden_letters_v2`
- `list_my_unseen_garden_shared_tree_start_moments`
- `mark_dev_test_garden_letter_read`
- `mark_my_garden_shared_tree_start_moment_seen`
- `mark_my_returned_garden_letters_seen`
- `oot_get_my_acorn_wallet`
- `preview_garden_friend_code`
- `preview_garden_friend_invite`
- `receive_garden_letter`
- `receive_my_garden_special_friend_letter_v1`
- `remove_my_dev_test_friend`
- `respond_to_garden_friend_request`
- `run_my_garden_retention_dev_cleanup`
- `save_garden_record`
- `save_my_garden_dev_found_item_layout_v2`
- `send_dev_test_garden_letter_with_dev_animal_v2`
- `send_garden_letter_with_dev_animal_v2`
- `send_my_garden_special_friend_letter_v1`
- `set_my_garden_record_visibility`
- `set_my_garden_shared_tree_name_piece`
- `set_my_garden_shared_tree_world_choice`
- `set_my_garden_tree_name`
- `setup_my_garden_retention_dev_test`
- `sync_my_garden_dev_animal_visits_v2`
- `sync_my_garden_special_friend_state`
- `upsert_my_garden_shared_tree_note`
