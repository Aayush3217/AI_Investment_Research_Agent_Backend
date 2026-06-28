# AI Investment Research Agent - Backend

## Overview

The backend powers the AI Investment Research Agent by providing secure authentication, AI-powered company analysis, and persistent storage of research reports.

It exposes REST APIs for user authentication and Server-Sent Events (SSE) for streaming live research progress while the AI agent analyzes a company.

---

# Features

* User Registration & Login (JWT Authentication)
* Password Hashing using bcrypt
* AI-powered Investment Research
* Multi-step Research Workflow
* Live Progress Streaming using SSE
* PostgreSQL (Neon) Database
* Rate Limiting
* CORS Support
* Environment Variable Configuration

---

# Tech Stack

* Node.js
* Express.js
* LangChain
* Groq (Llama 3.3 70B)
* PostgreSQL (Neon)
* JWT Authentication
* bcryptjs
* Axios
* express-rate-limit
* dotenv

---

# Project Structure

```
backend/
│
├── agent.js
├── authMiddleware.js
├── authRoutes.js
├── db.js
├── index.js
├── researchRoutes.js
├── package.json
├── .env.example
└── README.md
```

---

# Installation

Clone the repository

```bash
git clone <repository-url>
cd backend
```

Install dependencies

```bash
npm install
```

---

# Environment Variables

Create a `.env` file in the project root.

Example:

```env
PORT=5000

DATABASE_URL=postgresql://username:password@host/database?sslmode=require

GROQ_API_KEY=your_groq_api_key

JWT_SECRET=your_jwt_secret

SERPER_API_KEY=your_serper_api_key
```

**Notes**

* `SERPER_API_KEY` is optional.
* Do **not** commit your `.env` file to GitHub.

---

# Running the Project

Development

```bash
npm start
```

Server starts on

```
http://localhost:5000
```

---

# API Endpoints

## Authentication

### Register

```
POST /api/auth/register
```

Request

```json
{
  "name": "John",
  "email": "john@example.com",
  "password": "password123"
}
```

---

### Login

```
POST /api/auth/login
```

Returns

* JWT Token
* User Details

---

### Current User

```
GET /api/auth/me
```

Requires Authorization Header

```
Bearer <JWT_TOKEN>
```

---

## Research APIs

### Start Research

```
GET /api/research/stream?company=Apple
```

Streams research progress using Server-Sent Events.

Returns

* Business Analysis
* Financial Analysis
* Market Sentiment
* Final Investment Verdict

---

### Research History

```
GET /api/research/history
```

Returns the authenticated user's previous research reports.

---

### Get Report

```
GET /api/research/:id
```

Returns a complete saved research report.

---

### Delete Report

```
DELETE /api/research/:id
```

Deletes a stored research report.

---

# Database Schema

## Users

| Column        | Type      |
| ------------- | --------- |
| id            | SERIAL    |
| name          | VARCHAR   |
| email         | VARCHAR   |
| password_hash | TEXT      |
| created_at    | TIMESTAMP |

---

## Research Reports

| Column       | Type      |
| ------------ | --------- |
| id           | SERIAL    |
| user_id      | INTEGER   |
| company_name | VARCHAR   |
| verdict      | VARCHAR   |
| confidence   | INTEGER   |
| summary      | TEXT      |
| full_report  | TEXT      |
| created_at   | TIMESTAMP |

---

# AI Research Workflow

The backend performs the following sequence:

1. Authenticate the user.
2. Receive the company name.
3. Retrieve optional web search results using Serper.
4. Generate:

   * Business Analysis
   * Financial Analysis
   * Market Sentiment
5. Produce a final investment recommendation.
6. Store the report in PostgreSQL.
7. Stream progress updates to the client using Server-Sent Events.

---

# Architecture

```
Frontend (React)
        │
        ▼
Express Backend
        │
        ▼
JWT Authentication
        │
        ▼
LangChain
        │
        ▼
Groq Llama 3.3 70B
        │
        ▼
Neon PostgreSQL
```

---

# Security

* Passwords are hashed using bcrypt.
* JWT is used for authentication.
* Environment variables store secrets.
* Rate limiting prevents abuse.
* CORS is enabled for frontend communication.

---

# Deployment

Backend deployed on Render.

Database hosted on Neon PostgreSQL.

---

# Future Improvements

* Real-time stock price integration
* Financial ratio calculations
* PDF report generation
* Portfolio management
* Email reports
* Docker support
* Unit & Integration Tests
* Multi-agent architecture
* Redis caching
* OpenTelemetry monitoring

---

# Author

**Aayush Pal**

AI Investment Research Agent Backend

Built using Express.js, LangChain, Groq, and PostgreSQL.
