# EMF Logger — Developer Guide

## Project overview

Containerized RF spectrum monitoring platform. Runs on Synology DS920+ with an RTL-SDR USB dongle.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend API | FastAPI (async, uvicorn) |
| Task queue | Celery + Celery Beat |
| Message broker | Redis |
| Database | TimescaleDB (PostgreSQL 15) |
| Capture engine | `rtl_power` subprocess |

## Quick start

```bash
cp .env.example .env          # set DB creds + optional OPENAI_API_KEY
docker compose up --build
# Frontend → http://localhost:3000
# API docs → http://localhost:8000/docs
```

## Development (without Docker)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Celery worker (separate terminal)
celery -A tasks.celery_app worker --loglevel=info

# Celery beat (separate terminal)
celery -A tasks.celery_app beat --loglevel=info

# Frontend
cd frontend
npm install
npm run dev        # → http://localhost:5173 (proxies /api + /ws to :8000)
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DB_USER` | `emf` | PostgreSQL username |
| `DB_PASS` | `emfpass` | PostgreSQL password |
| `DB_NAME` | `emfdb` | PostgreSQL database |
| `FRONTEND_PORT` | `3000` | Host port for the UI |
| `BACKEND_PORT` | `8000` | Host port for the API |
| `OPENAI_API_KEY` | *(empty)* | Enables AI analysis feature |
| `AI_ENDPOINT` | OpenAI v1 | Compatible endpoint URL |
| `AI_MODEL` | `gpt-4o` | Model to use for analysis |

## Key paths

```
/app/captures/{job_id}/
    raw.csv          # full rtl_power output
    metadata.json    # job config snapshot at start time
```

## API reference

Full interactive docs: `http://localhost:8000/docs`

| Endpoint | Description |
|---|---|
| `GET /api/devices/scan` | Detect RTL-SDR devices |
| `GET/POST /api/devices/profiles` | Manage device profiles |
| `GET/POST /api/jobs` | List / create scan jobs |
| `POST /api/jobs/{id}/start` | Start a job immediately |
| `POST /api/jobs/{id}/stop` | Signal job to stop |
| `GET /api/data/jobs/{id}/readings` | Query spectrum readings |
| `GET /api/data/jobs/{id}/download` | Download CSV or JSON |
| `POST /api/analysis` | Submit AI analysis request |
| `WS /ws/jobs/{id}` | Live spectrum stream |

## Synology / Docker notes

The `docker-compose.yml` sets `privileged: true` and maps `/dev/bus/usb` so the RTL-SDR dongle is accessible inside the worker and backend containers. DSM 7 does not require any extra kernel modules for RTL-SDR.

## Extending

- **New AI prompt templates**: add to `PROMPT_TEMPLATES` in `backend/routers/analysis.py` and `TEMPLATE_LABELS` in `frontend/src/pages/AIAnalysis.jsx`.
- **Alternative capture backend**: `services/rtlsdr.py` → `parse_rtl_power_line()` accepts any CSV that matches the `rtl_power` format. Swap `build_rtl_power_command()` to use `rtl_power_fftw` or another tool.
- **pyrtlsdr (IQ / narrowband)**: add a second capture path in `services/capture.py` that uses `pyrtlsdr` for modes where `rtl_power` sweep is unnecessary.
