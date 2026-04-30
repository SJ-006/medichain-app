# Medichain Access

Medichain Access is a split frontend/backend app for secure medical record sharing with OTP login, role-based access, encrypted record storage, and location-based doctor access checks.

## Project Layout

The repository is organized as a small monorepo:

- Frontend app in `frontend/`.
- Backend API and data services in `backend/`.
- Generated runtime data such as uploads, logs, and the SQLite database are ignored from source control.

## Setup

1. Install dependencies in both app roots.
2. Copy `frontend/.env.example` to `frontend/.env`.
3. Copy `backend/.env.example` to `backend/.env`.
4. Fill in the required secret values before running the app.

## Required Environment Variables

Frontend:

- `VITE_GEMINI_API_KEY`
- `VITE_API_URL`

Backend:

- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `FAST2SMS_API_KEY`
- `HOSPITAL_LAT`
- `HOSPITAL_LNG`
- `PORT`

## Notes

- Do not commit `.env` files, database files, uploads, or logs.
- The backend OTP flow writes temporary test logs under `backend/logs/` for local verification only.
