# Backend Service

The backend is a Node.js (TypeScript) service that exposes REST endpoints, handles Twilio webhooks, manages live media streams, and communicates with LLM/STT/TTS providers. It is designed to run in two modes:

- **Mock mode** (`USE_MOCK=true`): fully local simulation without Twilio or paid APIs.
- **Live mode** (`USE_MOCK=false`): integrates with Twilio, OpenAI, Google Cloud, or ElevenLabs.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Health and metrics (uptime, active calls). |
| POST | `/api/call` | Initiate a new outbound call. Body is validated with Zod. |
| POST | `/twilio/voice` | Twilio webhook that returns TwiML instructions. Signature must be valid. |
| POST | `/twilio/status` | Twilio status callback receiver. Signature must be valid. |
| WS | `/twilio/media` | Twilio Media Stream websocket endpoint. |
| WS | `/ws` | Browser websocket hub for live transcript + status. |

## Webhook verification

Twilio requests are validated by `verifyTwilioSignature` middleware. Invalid signatures return `401` and log only the route metadata. When running in mock mode the middleware is bypassed.

## Provider matrix

| Capability | Mock | OpenAI | Google | ElevenLabs |
| --- | --- | --- | --- | --- |
| Speech-to-text | `MockTimelineSttProvider` | Whisper (`OPENAI_STT_MODEL`) | Placeholder streaming STT | – |
| Text-to-speech | Deterministic tone generator | – | Google TTS (`GOOGLE_API_KEY`) | ElevenLabs (`ELEVENLABS_API_KEY`) |
| LLM reasoning | Timeline-based stub | Chat Completions (`OPENAI_CHAT_MODEL`) | – | – |
| Summaries | Uses same provider selection | – | – | – |

Switch providers by editing `backend/.env` or passing overrides in the `/api/call` payload (`providers` field).

## Configuration highlights

See `.env.example` for the full list. Important flags:

- `USE_MOCK` – Force mock mode regardless of request payload.
- `MOCK_IVR_PROFILE` – Selects the mock IVR script (`telecom-basic`).
- `CALL_MAX_MINUTES` – Hard limit before a call auto-terminates.
- `WS_HEARTBEAT_MS` – Interval for browser websocket pings.
- `AUDIO_CHUNK_MS` – Ingest batch size for STT buffering.

## Reliability features

- Exponential backoff on OpenAI, Google, ElevenLabs, and Twilio REST requests.
- Bounded audio queue to avoid runaway memory usage during media streams.
- Graceful shutdown closes websockets, Twilio media bridges, and the SQLite connection.
- Deterministic mock timeline with transcript fixtures for offline testing.

## Testing

Run backend unit tests with:

```bash
npm test
```

Tests cover environment parsing, LLM memory trimming, and Twilio signature verification.

## Real-time audio notes

- The Media Stream websocket (`/twilio/media`) ingests 8 kHz PCM from Twilio.
- Audio is buffered (~`AUDIO_CHUNK_MS`) before dispatching to the speech-to-text provider.
- Assistant responses are synthesized and streamed back over the same websocket with backpressure when speech is playing.
- Voice Activity Detection heuristics pause playback while the remote party speaks to avoid overlap.

## Database

SQLite is used via `better-sqlite3`. Tables are created automatically on startup. Database files live under `backend/data/`.

## Development tips

- Use mock mode for iterative development (`npm --prefix backend run mock:call`).
- When integrating with Twilio, expose your local server using ngrok and update webhook URLs accordingly.
- Logs include a request ID, and text is redacted for PII before storage.
