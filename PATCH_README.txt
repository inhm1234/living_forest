TodayForest Sentry Error Monitoring v1

Purpose
- Collect production browser JavaScript errors only.
- Do not enable Session Replay, Tracing, Logs/Metrics, or identified users.
- Do not report localhost/CI or QA-preview pages.
- Do not keep Sentry breadcrumbs (clicks, network, console, navigation).
- Strip user/extra/request query/cookies/data/headers from outgoing error events.

Already configured in Sentry dashboard
- Error Monitoring: ON
- Logging: OFF
- Session Replay: OFF
- Tracing: OFF
- Application Metrics: OFF
- Data Scrubber: ON
- Default Scrubbers: ON
- Prevent Storing of IP Addresses: ON

Upload
1. Copy this ZIP's files to the repository root, preserving folders.
2. Overwrite matching files.
3. Commit to main.
4. GitHub Actions should run build -> verify -> smoke tests -> deploy.
5. After deployment, create one controlled test error to verify Sentry receives it.

The Sentry Loader Script URL contains a browser client key/DSN-style identifier, not a server admin secret.
Do not place Sentry auth tokens in browser code.
