# Forex Factory - Backend

## Quick start

1. Copy the example environment file:
   `cp .env.example .env`
2. Install dependencies:
   `npm install`
3. Start the backend:
   `npm run dev`

## Environment variables

The following variables are expected in [.env.example](.env.example):
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `PORT`
- `FRONTEND_URL`

The server listens on port `8000` by default and exposes the API under `/api`.