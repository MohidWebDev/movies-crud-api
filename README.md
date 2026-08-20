# Movies CRUD API

Backend REST API for the Movies App — built with Express, MongoDB (Mongoose), and Cloudinary for poster image storage.

Frontend repo: [movies-crud-frontend](https://github.com/MohidWebDev/movies-crud-frontend)

## Features

- Full CRUD for movies (Create, Read, Update, Delete)
- Input validation with `express-validator`
- Centralized error handling
- Poster image uploads via Multer, stored on Cloudinary
- Rate limiting and security headers (`express-rate-limit`, `helmet`)
- CORS enabled for frontend communication

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- Cloudinary (image storage)
- Multer (file upload handling)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your own values:

```bash
cp .env.example .env
```

Required variables:
| Variable | Description |
|---|---|
| `PORT` | Port the server runs on (default: 3000) |
| `MONGODB_URI` | Your MongoDB connection string |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

### 3. Run the server

```bash
npm start
```

The API will run at `http://localhost:3000` (or your configured `PORT`).

## API Endpoints

| Method | Endpoint                 | Description                     |
| ------ | ------------------------ | ------------------------------- |
| GET    | `/api/movies`            | Get all movies                  |
| GET    | `/api/movies/:id`        | Get a single movie              |
| POST   | `/api/movies`            | Create a new movie              |
| PUT    | `/api/movies/:id`        | Update a movie (full)           |
| PATCH  | `/api/movies/:id`        | Update a movie (partial)        |
| DELETE | `/api/movies/:id`        | Delete a movie                  |
| POST   | `/api/movies/:id/poster` | Upload/replace a movie's poster |

## Connecting a Frontend

This API has CORS enabled, allowing requests from any origin — including the paired frontend, [movies-crud-frontend](https://github.com/MohidWebDev/movies-crud-frontend), which expects this API to be reachable via a `VITE_API_BASE_URL` environment variable (e.g. `http://localhost:3000` for local development).
