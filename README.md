# CPM (Catering & Packed Meals) Order Monitoring System
**Engineering Code Name:** Project Itadakimasu

A centralized, full-stack order monitoring and catering management platform built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **PostgreSQL**, and **Drizzle ORM**.

---

## 📚 Project Documentation

The project includes complete engineering, requirements, and user story documentation in the [`docs/`](./docs) directory:

* 📋 [**Master Project Plan & Engineering Blueprint**](./docs/project-plan.md): Executive summary, solution architecture, data dictionary, ERD diagrams, 8-state order lifecycle workflow, WBS milestones, and deployment strategy.
* 📝 [**Functional Requirements Specification (FRS)**](./docs/functional-requirements.md): System rules, database check constraints, formulas, API matrices, and non-functional requirements.
* 👥 [**Agile User Stories & Acceptance Criteria**](./docs/user-stories.md): Persona-driven user stories (**Staff**, **Operations Admin**, **Kitchen Lead**, **Finance Officer**) with concrete acceptance criteria across 6 core epics.

---

## 🚀 Quick Start

### 1. Environment Setup
Copy the environment variables template and configure your PostgreSQL database connection:
```bash
cp .env.example .env # or configure .env directly
# DATABASE_URL=postgres://postgres:postgres@localhost:5432/cpm_db
# JWT_SECRET=your-secure-random-secret
```

### 2. Database Migrations & Seeds
Run database migrations and seed default catalogs (users, venues, service types, order statuses, menu items):
```bash
npm run db:migrate
npm run db:seed
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Docker Deployment

To build and run the application in isolated production containers:
```bash
docker compose up --build -d
```
This starts both the PostgreSQL database container and the standalone Next.js production service with persistent volume mounts for uploaded receipts and generated invoice PDFs.

---

## 🛠️ Verification & Quality Checks

```bash
# TypeScript Type Check
npx tsc --noEmit

# Production Build
npm run build
```
