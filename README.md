# AI Call Assistant

`ai-call-assistant` is a full-stack starter that demonstrates how to build a real-time AI phone agent using Twilio, streaming speech-to-text, LLM reasoning, and speech synthesis. It runs locally in mock mode without any paid APIs and can be upgraded to production Twilio/OpenAI/Google/ElevenLabs services by filling in environment variables.

## Features

- Twilio Programmable Voice + Media Streams integration (mockable)
- Live speech recognition with OpenAI Whisper or Google STT providers
- Conversational reasoning loop with OpenAI GPT models and deterministic mock timeline
- Real-time text-to-speech streaming via ElevenLabs or Google TTS
- WebSocket bridge to a React dashboard that shows call status, transcripts, and summary
- SQLite persistence for call metadata and transcripts, including redaction utilities
- Dockerized local dev environment with graceful shutdown, retries, and backpressure guards
- Jest unit tests plus an end-to-end dry run that validates the offline flow

## Architecture Overview

```
+---------------------------+      +------------------+      +--------------------+
| React Dashboard (Vite)    | <--->| Backend WS Hub    |<---->| Twilio Media Stream |
| - Start call form         |      | - Live transcript |      | - PCM audio chunks   |
| - Status + transcript     |      | - Status updates  |      | - Bidirectional audio|
+---------------------------+      +------------------+      +--------------------+
            |                                    ^
            |  REST /api/call                    |
            v                                    |
+---------------------------+      +------------------+      +---------------------+
| Express API               |----->| LLM/STT/TTS      |----->| External Providers   |
| - Twilio webhooks         |      | abstractions     |      | (OpenAI, Google, etc)|
| - Rate limiting           |      | (mockable)       |      |                     |
+---------------------------+      +------------------+      +---------------------+
```

## Docker Quick Start

```bash
cp backend/.env.example backend/.env
# set USE_MOCK=true to try offline first
make up
```

Once containers settle, the frontend is available at [http://localhost:5173](http://localhost:5173) and the backend API at [http://localhost:5000](http://localhost:5000).

### Local scripts

- `make down` – Stop containers and remove volumes.
- `make logs` – Tail combined container logs.
- `make test` – Execute backend unit tests inside Docker.
- `make e2e` – Run the offline end-to-end dry run.

## Manual (non-Docker) workflow

```bash
npm run install:all
cp backend/.env.example backend/.env
# update secrets or set USE_MOCK=true
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) to use the dashboard.

## Environment flags

| Variable | Description | Default |
| --- | --- | --- |
| `USE_MOCK` | Enable offline simulator and deterministic providers | `false` |
| `MOCK_IVR_PROFILE` | Mock script profile (currently `telecom-basic`) | `telecom-basic` |
| `CALL_MAX_MINUTES` | Maximum live call length in minutes | `10` |
| `WS_HEARTBEAT_MS` | Browser websocket heartbeat interval | `10000` |
| `AUDIO_CHUNK_MS` | Media stream batching window for STT ingestion | `200` |
| `PUBLIC_BASE_URL` | Public URL used for Twilio webhooks | `http://localhost:5000` |
| `PUBLIC_WS_ORIGIN` | Allowed frontend origin for CORS | `http://localhost:5173` |

See `backend/.env.example` for the full list including provider API keys.

## Offline workflow

- Toggle mock mode in the UI or set `USE_MOCK=true` in `backend/.env`.
- Trigger the deterministic telecom scenario via CLI:
  ```bash
  npm --prefix backend run mock:call -- --task "Check account balance" --profile telecom-basic
  ```
- Validate end-to-end behaviour:
  ```bash
  make e2e
  ```
  The script boots the backend in mock mode, places a simulated call, waits for completion over WebSocket, and asserts that transcripts and summaries are stored under `backend/data/`.

## Production setup

1. [Create a Twilio account](https://www.twilio.com/try-twilio), buy/verify a phone number, and enable Voice.
2. [Create an OpenAI API key](https://platform.openai.com/). Optionally configure Google Cloud Speech-to-Text and Text-to-Speech or ElevenLabs APIs.
3. Expose your local backend using [ngrok](https://ngrok.com/) or a similar tunnel. Point Twilio Voice webhook URLs to `https://<tunnel>/twilio/voice` and the media stream websocket to `wss://<tunnel>/twilio/media`.
4. Update `backend/.env` with your secrets and set `USE_MOCK=false`.

### ngrok instructions

```bash
ngrok http 5000
```

Configure your Twilio phone number Voice webhook to `https://<ngrok-domain>/twilio/voice` using HTTP POST.

## Cost controls

- Use mock mode for development to avoid per-minute charges.
- Set `CALL_MAX_MINUTES` to restrict call duration.
- The backend emits warnings when running in mock mode and logs retry attempts for external APIs.
- Redaction utilities mask PII before persisting transcripts.

## Repository scripts

- `npm run install:all` – Install dependencies for root, backend, and frontend packages.
- `npm run dev` – Launch backend and frontend together via `scripts/dev.sh`.
- `npm run typecheck` – Run TypeScript checks in both backend and frontend.
- `npm run test` – Run backend Jest unit tests.
- `make e2e` – Execute the offline end-to-end dry run.

## Contributing

1. Fork and clone the repo.
2. Create a branch for your feature/fix.
3. Run tests (`npm run test`) and type checks (`npm run typecheck`).
4. Commit and open a pull request.

## License

MIT
