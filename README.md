# Healcode

An accessibility-focused web application that helps make the web more inclusive for everyone.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js (optional, for local development)

### Running the Application

**Option 1: Using Docker (Recommended)**
```bash
# Clone the repository
git clone https://github.com/codrlabs/healcode.git
cd healcode

# Start the application
docker compose up --build
```

**Option 2: Local Development**
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
healcode/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── landingPage.jsx           # Main landing page
│   │   ├── components/
│   │   │   └── ProblemSolutionPage.jsx  # Detailed problem view
│   │   ├── data/
│   │   │   └── mockScanResults.js    # Mock accessibility data
│   │   ├── styles/
│   │   │   ├── LandingPage.css       # Landing page styles
│   │   │   └── ProblemSolutionPage.css # Problem page styles
│   │   └── main.jsx                  # Application entry point
│   ├── package.json                  # Dependencies and scripts
│   ├── vite.config.js               # Vite configuration
│   └── Dockerfile                   # Docker container setup
├── docker-compose.yml               # Docker orchestration
├── docs/                           # Documentation
│   ├── workflow.md                 # Development workflow
│   ├── reviewing.md                # Code review process
│   └── architecture.md             # System architecture
└── obsidian/                       # Planning and documentation
    └── Healcode.canvas             # Project mindmap
```

## 🎯 Overview

This project addresses the gap in web accessibility tools. Many websites unintentionally exclude people with disabilities, and existing solutions are often expensive or limited.

### Value Proposition
- Make accessibility testing available to everyone without high costs
- Support developers, testers, and businesses who cannot afford $500-5000+/month solutions
- Provide actionable insights and fix suggestions

### Current Status
- **Frontend Prototype**: Basic React application structure
- **Mock Data**: Sample accessibility issues for demonstration
- **UI Components**: Landing page and problem solution views
- **Styling**: CSS-based design with accessibility considerations

### Planned Features
- Real website analysis and scanning
- Automated accessibility testing
- PDF report generation
- Backend API integration
- Team collaboration features

## 🛠️ Tech Stack

### Current Stack
- **Frontend**: React 19.2.0 + Vite 7.3.1
- **Styling**: CSS modules (pure CSS)
- **Development**: ESLint with React Hooks
- **Container**: Docker with Node.js 22-alpine
- **Orchestration**: Docker Compose

### Future Stack
- **Backend**: Express.js with JWT authentication
- **Database**: PostgreSQL 16
- **Monitoring**: Prometheus integration
- **Email**: Nodemailer for notifications
- **Webhooks**: Custom webhook system

## 📋 Development Workflow

1. **Create Feature Branch**: `git checkout -b feature/task-name`
2. **Implement Changes**: Make your modifications
3. **Test Locally**: `docker compose up --build`
4. **Create Pull Request**: Push to GitHub and create PR
5. **Review Process**: Team reviews and approves
6. **Auto-merge**: Automatically merges to main
7. **Clean Up**: Delete feature branch

For detailed workflow documentation, see [`docs/workflow.md`](docs/workflow.md).

## 🧪 Testing

### Local Testing
```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build
```

### Docker Testing
```bash
# Build and run with Docker
docker compose up --build

# View logs
docker compose logs frontend
```

## 📚 Documentation

- **[Workflow Guide](docs/workflow.md)**: Development process and best practices
- **[Code Review](docs/reviewing.md)**: How to review pull requests
- **[Architecture](docs/architecture.md)**: System design and component structure

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📋 Accessibility Standards

Following WCAG guidelines:
- **Visual Accessibility**: Contrast ratios, focus indicators
- **Structure & Semantics**: Proper heading hierarchy, landmarks
- **Multi-media**: Alt text, captions, transcripts

## 📈 Project Planning

For detailed project planning, architecture, and marketing notes, see [`obsidian/Healcode.canvas`](obsidian/Healcode.canvas).

## 📄 License

MPL-2.0 (compatible with commercial use)

## 🙏 Acknowledgments

Built with ❤️ for a more accessible web. Special thanks to the accessibility community for their invaluable work in making the web inclusive for everyone.
