# doctor-watcher

Emails you when a sundhed.dk clinic starts accepting new patients.

EventBridge Scheduler (every 2h, 07–21 Europe/Copenhagen) → Lambda (Node 24) →
`GET https://www.sundhed.dk/app/findbehandlerv2/api/v1/findbehandlerv2/klinik/<id>` →
if `AabenForTilgang === true`, publish to an SNS topic with an email subscription.
A CloudWatch alarm also emails the topic if the Lambda keeps failing (API down or changed).

```bash
bun install
bun test            # LIVE=1 bun test also hits the real API
AWS_PROFILE=tomassabol bun run deploy   # region is pinned to eu-west-1
```

Override defaults with context: `-c clinicId=4766 -c notifyEmail=you@example.com`. The schedule lives in `bin/app.ts`.
