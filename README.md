# Nashik Headlines

A full-stack local news publishing platform designed to streamline the workflow from news ingestion and processing to AI-assisted article preparation, editorial management, publishing, and SEO-friendly public delivery.

## Live Demo

**Website:** https://nashik-headlines.vercel.app

> The public site and backend services may depend on external environment variables and third-party services configured for the deployment.

## What the Project Does

Nashik Headlines combines a public news website with an editorial/admin workflow.

- Ingests news from configured sources and feeds
- Processes and manages article content through a backend API
- Provides an authenticated admin panel for editorial operations
- Uses AI-assisted services for parts of the article workflow
- Supports image processing/storage through Cloudinary
- Provides publishing and article-management APIs
- Includes SEO-related functionality such as sitemap/robots support
- Separates the public-facing application from editorial/admin functionality

## Architecture

```text
                         ┌─────────────────────────┐
                         │   News / Feed Sources   │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │  Express Backend API    │
                         │                         │
                         │  Auth / Scraping        │
                         │  Processing / Articles  │
                         │  AI / Publishing / SEO  │
                         └───────┬─────────┬───────┘
                                 │         │
                    ┌────────────┘         └──────────────┐
                    ▼                                     ▼
          ┌──────────────────┐                   ┌─────────────────┐
          │ PostgreSQL / DB  │                   │   Cloudinary    │
          │ Articles / Data  │                   │     Images      │
          └──────────────────┘                   └─────────────────┘
                    │
                    ▼
          ┌──────────────────┐
          │ Admin Panel      │
          │ Editorial UI     │
          └──────────────────┘

                    │ Published content
                    ▼
          ┌──────────────────┐
          │ Next.js Website  │
          │ Public News UI   │
          └──────────────────┘
```

## Repository Structure

```text
nashik-headlines/
├── Admin_panel/       # Editorial/admin frontend
├── backend/           # Express API, services, routes and AI pipeline
├── database/          # Database-related project assets
├── next-app/          # Public Next.js application
└── nginx.conf         # Reverse-proxy configuration
```

### Backend

The Express backend is organized around route modules and service modules rather than placing application logic in a single server file. Major areas include authentication, scraping, processing, articles, statistics, AI, publishing, SEO, and the pipeline workflow.

### Admin Panel

The admin application provides the editorial interface for authenticated users to manage articles, review generated content, handle images, and monitor workflow-related information.

### Public Website

The Next.js application serves the public-facing news experience and includes article routes plus SEO-related metadata endpoints such as sitemap and robots handling.

## Technology Stack

| Layer | Technology |
|---|---|
| Public frontend | Next.js, React, JavaScript |
| Admin frontend | React, Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL-compatible backend |
| Authentication | JWT, bcrypt |
| News ingestion | Axios, Cheerio, RSS Parser |
| AI services | External LLM/API integrations |
| Image storage | Cloudinary |
| Deployment | Vercel / Railway-compatible configuration |
| Reverse proxy | Nginx |

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/Kaivalya-2005/nashik-headlines.git
cd nashik-headlines
```

### 2. Configure environment variables

Create environment files for the services you want to run. Use the repository's `.env.example` files as a starting point and never commit real credentials.

### 3. Start the backend

```bash
cd backend
npm install
npm start
```

The Express server defaults to port `5000` unless `PORT` is configured.

### 4. Start the public application

```bash
cd next-app
npm install
npm run dev
```

### 5. Start the admin panel

```bash
cd Admin_panel/frontend
npm install
npm run dev
```

## Environment Variables

Credentials and service URLs are intentionally not committed. Typical deployments require configuration for the database, authentication, frontend/backend URLs, CORS, AI provider credentials, and image storage provider.

See the example environment files in the repository for the exact variables required by each application component.

## Engineering Highlights

- Modular Express routing and service-layer organization
- Authenticated editorial/admin workflow
- AI-assisted content processing pipeline
- Automated news ingestion from external sources
- Cloud-based image storage
- SEO-aware public content delivery
- Separate public and administrative applications
- Health-check and deployment-oriented backend configuration

## Security Notes

- Do not commit `.env` files or API credentials.
- Configure production CORS origins explicitly.
- Keep admin credentials and signing secrets outside source control.
- Use deployment-provider secret management for production credentials.

## Project Status

This repository represents an internship project and is actively maintained as the system evolves. Some integrations depend on external services and deployment-specific configuration.
