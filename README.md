# SwarVani

SwarVani is a voice-first visit-register prototype for ASHA workers. It accepts synthetic visit notes, extracts a fixed visit schema, checks phrases against a deterministic danger-sign list, reads the record back for confirmation, and saves confirmed visits with follow-ups.

## Hackathon stack

- **STT:** Gnani Prisma v3.0 through a backend WebSocket. The browser streams mono 16 kHz PCM to FastAPI; the API key stays on the backend.
- **TTS:** Gnani Timbre v3.0 through its realtime WebSocket endpoint.
- **LLM:** OpenAI-compatible endpoint, selected with `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL`. Qwen is the example default; it is not required.
- **Orchestration:** custom FastAPI session state machine. No telephony, phone numbers, or hosted end-to-end agent platform.
- **Safety:** deterministic phrase matcher runs before LLM extraction; it does not diagnose or give treatment advice.

The demo mode uses browser speech recognition and the local rules extractor. It avoids external model calls so the interface can be tried before credentials are configured.

## Run locally on Windows

1. Install Python 3.11 or newer and Node.js 20 or newer.
2. In one PowerShell terminal:

   ```powershell
   cd backend
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   if (!(Test-Path .env)) { Copy-Item .env.example .env }
   python -m uvicorn app.main:app --reload --port 8000
   ```

3. In a second terminal:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

4. Open the Vite URL shown in the frontend terminal (normally `http://localhost:5173`). The frontend proxies `/api` and `/ws` to the local FastAPI service.

## Run with Docker Compose

If `backend/.env` does not exist, copy `backend/.env.example` to that name, then start the stack:

```powershell
docker compose up --build
```

Open `http://localhost:8080`. NGINX serves the built frontend and proxies API and WebSocket traffic to FastAPI. SQLite data persists in a Docker volume. Configure the Gnani and LLM environment values in `backend/.env` before switching to live mode.

## Enable the required Gnani models

Create an API key in the Gnani API Platform. In `backend/.env`, set:

```dotenv
SV_DEMO_MODE=false
GNANI_API_KEY=your_key
GNANI_LANGUAGE=hi-IN
GNANI_TTS_VOICE=Shivani
```

The default endpoint values in `.env.example` point to Gnani Prisma v3.0 and Timbre v3.0 streaming endpoints. Keep the key private and never put it in a `VITE_` variable or frontend file. Use a browser served over HTTPS when testing microphone access outside localhost.

## Choose an LLM

Set an OpenAI-compatible chat-completions base URL, key, and model in `backend/.env`:

```dotenv
LLM_BASE_URL=https://your-provider.example/v1
LLM_API_KEY=your_key
LLM_MODEL=your-structured-output-model
```

The extractor requests JSON and validates values against the visit schema. If the LLM settings are blank or the provider returns an error, it falls back to the local rules extractor. Danger-sign detection never depends on the LLM.

## Storage and transcript retention

SQLite is stored under `backend/.data/` by default. Generate an encryption key and set it as `SV_DB_KEY` before using non-demo configurations:

```powershell
cd backend
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

The `/api/health` response reports whether database encryption is enabled. `/api/purge-transcripts` removes stored transcript text while retaining structured records. Trigger it after the judging period if transcript retention is no longer needed. Use synthetic data only; this prototype is not approved for real patient information or clinical decisions.

## Guideline references for the prototype matcher

The phrase list is a software prototype based on these public NHM/MoHFW materials. It requires review by a qualified health authority before any field use:

- [ASHA Training Module 7, Newborn Health, p. 55](https://hbnc-hbyc.mohfw.gov.in/assets/document/ASHA_Training_Module_7.pdf)
- [Comprehensive Emergency Obstetric and Newborn Care Curriculum 2024, Part 2, p. 70](https://nhm.gov.in/images/pdf/programmes/maternal-health/guidelines/Revised_CEmONC_curriculum_2024-Part_2.pdf)
- [NHM Pregnancy Care, p. 238](https://www.nhm.gov.in/images/pdf/guidelines/nrhm-guidelines/stg/pregnancy-care.pdf)

## Build and run the flow check

```powershell
cd frontend
npm run build
cd ..\backend
python -m scripts.smoke
python -m unittest scripts.test_regressions -v
```

## Deployment notes

Deploy the FastAPI backend on a host that supports persistent WebSocket connections and outbound WebSockets to Gnani. Deploy the Vite `frontend/dist` directory as a static HTTPS site, set `VITE_API_BASE` to the backend HTTPS origin at build time, and set `SV_ALLOWED_ORIGINS` on the backend to the exact frontend origin. Set `SV_DEMO_MODE=false`, API credentials, and an encryption key on the backend host only. Do not deploy with default demo credentials or use this prototype for real patient data.
