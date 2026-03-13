# Healcode Architecture

## System Overview

```
👤 User
    ↓ :5173
🔧 Admin → Frontend (React + Vite)
    ↓ :5173/admin
📡 Monitoring → POST /api/*
    ↓
HTTP → API Layer (Future: Express.js)
    ↓
SQL → PostgreSQL (Future database)
    ↓
SMTP → Email (Future: Nodemailer)
    ↓
HTTP POST → Webhooks (Future: Subscribers)
```

## Frontend Component Architecture

```
Entry Point
└── main.jsx (React StrictMode wrapper)

Views (Pages)
├── LandingPage.jsx (Public scan interface)
└── ProblemSolutionPage.jsx (Detailed problem view)

Reusable Components
├── App.jsx (Main application wrapper)
├── LandingPage.css (Styling for landing page)
└── ProblemSolutionPage.css (Styling for problem details)

Data & Mock
└── mockScanResults.js (Mock data for development)

Assets
└── react.svg (React logo)

Data Flow:
main.jsx → App.jsx → LandingPage.jsx
LandingPage.jsx → LandingPage.css
LandingPage.jsx → mockScanResults.js
ProblemSolutionPage.jsx → ProblemSolutionPage.css
ProblemSolutionPage.jsx → mockScanResults.js
```

## Current Technology Stack

### Frontend
- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.3.1
- **Styling**: CSS modules (no Tailwind - pure CSS)
- **Language**: JavaScript (ES6+)
- **Package Manager**: npm

### Development Tools
- **Linting**: ESLint with React Hooks plugin
- **Container**: Docker with Node.js 22-alpine
- **Orchestration**: Docker Compose
- **Port**: 5173 (Vite dev server)

### Future Architecture Components
- **Backend**: Express.js with JWT authentication
- **Database**: PostgreSQL 16
- **Monitoring**: Prometheus integration
- **Email**: Nodemailer for notifications
- **Webhooks**: Custom webhook system

## Component Structure

### LandingPage.jsx
- Main user interface for website scanning
- Problem categorization (Visual Accessibility, Structure and Semantics, Multi-media)
- PDF download functionality (placeholder)
- URL validation and scanning workflow

### ProblemSolutionPage.jsx
- Detailed view of individual accessibility problems
- Root cause analysis
- Suggested solutions
- Code snippets for reference

### Mock Data Structure
- Comprehensive accessibility issue examples
- Categorized problem types
- Solution steps and code examples
- "What's Good" positive feedback

## Development Workflow

1. **Local Development**: `docker compose up --build`
2. **Code Style**: ESLint with React rules
3. **Build Process**: Vite for fast development and production builds
4. **Container Strategy**: Docker for consistent development environment

## Future Enhancements

- **Backend Integration**: RESTful API endpoints
- **Database Schema**: PostgreSQL with proper relationships
- **Authentication**: JWT-based user management
- **Real-time Updates**: WebSocket for live monitoring
- **Advanced Analytics**: Detailed accessibility metrics
- **Team Collaboration**: Multi-user support and permissions