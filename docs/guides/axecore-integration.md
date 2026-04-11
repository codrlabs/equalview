# Axe Core Integration Guide

This guide explains how to integrate Axe Core into the equalView codebase to perform real accessibility scanning instead of using mock results.

## Overview

Axe Core is a powerful accessibility testing engine by Deque Systems that can automatically detect accessibility issues in web applications. By integrating it into equalView, we can provide users with real accessibility analysis of websites.

## Architecture

### Backend-Based Scanning (Recommended)

We'll implement a backend service that:
1. Receives website URLs from the frontend
2. Uses Puppeteer to load the website in a headless browser
3. Injects and runs Axe Core on the loaded page
4. Transforms the results into our frontend's expected format
5. Returns the analysis to the frontend

### Why Backend-Based?

- **CORS Bypass**: Backend can fetch any website without browser restrictions
- **Full Page Analysis**: Can scan the entire rendered DOM including dynamically loaded content
- **Consistent Results**: Controlled environment for scanning
- **Scalability**: Can queue scans and handle multiple requests

## Implementation Steps

### 1. Backend Setup

#### Install Dependencies

Add these dependencies to `backend/package.json`:

```json
{
  "dependencies": {
    "puppeteer": "^25.0.0",
    "axe-core": "^4.10.0",
    "express": "^5.2.1",
    "cors": "^2.8.5"
  }
}
```

Then run:
```bash
cd backend
npm install
```

#### Create Scan Controller

Create `backend/controllers/scanController.js`:

```javascript
const puppeteer = require('puppeteer');
const axeCore = require('axe-core');

class ScanController {
  async scanWebsite(req, res) {
    const { url } = req.body;

    // Validate URL
    if (!url || !this.isValidUrl(url)) {
      return res.status(400).json({
        error: 'Invalid URL provided. Please provide a valid URL (e.g., https://example.com)'
      });
    }

    try {
      const results = await this.performScan(url);
      res.json(results);
    } catch (error) {
      console.error('Scan failed:', error);
      res.status(500).json({
        error: 'Failed to scan website. Please check the URL and try again.',
        details: error.message
      });
    }
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  async performScan(url) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Set viewport size
      await page.setViewport({ width: 1280, height: 720 });
      
      // Navigate to the page
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Inject Axe Core
      await page.addScriptTag({ path: require.resolve('axe-core') });
      
      // Run Axe analysis
      const results = await page.evaluate(() => {
        return axe.run(document, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21aa']
          }
        });
      });

      // Transform results to our format
      return this.transformAxeResults(results);

    } finally {
      await browser.close();
    }
  }

  transformAxeResults(axeResults) {
    // Implementation in the transformer service
    const transformer = require('../services/axeTransformer');
    return transformer.transform(axeResults);
  }
}

module.exports = new ScanController();
```

#### Create Results Transformer

Create `backend/services/axeTransformer.js`:

```javascript
class AxeTransformer {
  transform(axeResults) {
    const problems = {
      visualAccessibility: [],
      structureAndSemantics: [],
      multimedia: []
    };

    const whatsGood = [];

    // Process violations (problems)
    axeResults.violations.forEach(violation => {
      const problem = this.mapViolationToProblem(violation);
      const category = this.categorizeViolation(violation);
      
      if (problems[category]) {
        problems[category].push(problem);
      }
    });

    // Process passes (what's good)
    whatsGood.push(...this.extractPositiveFeedback(axeResults.passes));

    return {
      problems,
      whatsGood
    };
  }

  mapViolationToProblem(violation) {
    return {
      id: violation.id,
      name: violation.description,
      category: this.categorizeViolation(violation),
      rootCause: this.extractRootCause(violation),
      codeSnippet: this.extractCodeSnippet(violation),
      solution: this.extractSolutions(violation)
    };
  }

  categorizeViolation(violation) {
    // Map Axe rules to our categories
    const visualRules = ['color-contrast', 'color-contrast-enhanced'];
    const structureRules = ['heading-order', 'landmark-one-main', 'landmark-complementary-is-top-level'];
    const multimediaRules = ['image-alt', 'video-caption', 'audio-caption'];

    if (visualRules.includes(violation.id)) {
      return 'visualAccessibility';
    } else if (structureRules.includes(violation.id)) {
      return 'structureAndSemantics';
    } else if (multimediaRules.includes(violation.id)) {
      return 'multimedia';
    }

    // Default to structure and semantics
    return 'structureAndSemantics';
  }

  extractRootCause(violation) {
    return violation.help || 'Accessibility issue detected';
  }

  extractCodeSnippet(violation) {
    if (violation.nodes && violation.nodes.length > 0) {
      const node = violation.nodes[0];
      return node.html || 'No specific code snippet available';
    }
    return 'No specific code snippet available';
  }

  extractSolutions(violation) {
    const solutions = [];
    
    if (violation.help) {
      solutions.push(violation.help);
    }
    
    if (violation.description) {
      solutions.push(violation.description);
    }
    
    if (violation.helpUrl) {
      solutions.push(`Learn more: ${violation.helpUrl}`);
    }

    return solutions.length > 0 ? solutions : ['Please refer to the violation details for guidance'];
  }

  extractPositiveFeedback(passes) {
    const feedback = [];
    
    // Count passed rules
    const passedRules = passes.length;
    feedback.push(`${passedRules} accessibility rules passed successfully`);

    // Add specific positive feedback based on passed rules
    const ruleNames = passes.map(p => p.id);
    
    if (ruleNames.includes('color-contrast')) {
      feedback.push('Good color contrast detected');
    }
    
    if (ruleNames.includes('image-alt')) {
      feedback.push('Images have appropriate alt text');
    }
    
    if (ruleNames.includes('landmark-one-main')) {
      feedback.push('Main landmark properly defined');
    }

    return feedback;
  }
}

module.exports = new AxeTransformer();
```

#### Create Routes

Create `backend/routes/scan.js`:

```javascript
const express = require('express');
const scanController = require('../controllers/scanController');

const router = express.Router();

router.post('/', scanController.scanWebsite);

module.exports = router;
```

#### Update Main Server

Update `backend/index.js`:

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/scan', require('./routes/scan'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'equalView backend is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
```

### 2. Frontend Integration

#### Update Landing Page

Modify `frontend/src/landingPage.jsx` to use the real API:

```javascript
import { useState } from 'react'
import ProblemSolutionPage from './components/ProblemSolutionPage'
import './styles/LandingPage.css'

export default function LandingPage() {
  const [url, setUrl] = useState('')
  const [scanStatus, setScanStatus] = useState('idle') // 'idle' | 'scanning' | 'done'
  const [scanResults, setScanResults] = useState(null)
  const [selectedProblem, setSelectedProblem] = useState(null)
  const [error, setError] = useState(null)

  const handleScan = async () => {
    if (!url.trim()) return
    
    // Validate URL format
    try {
      new URL(url)
    } catch {
      setError('Please enter a valid URL (e.g., https://example.com)')
      return
    }
    
    setScanStatus('scanning')
    setScanResults(null)
    setError(null)
    
    try {
      const response = await fetch('http://localhost:3000/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setScanResults(data)
      setScanStatus('done')
    } catch (err) {
      console.error('Scan failed:', err);
      setError(err.message || 'Failed to scan website. Please try again.');
      setScanStatus('idle')
    }
  }

  const handleDownloadPdf = () => {
    // TODO: Implement PDF generation with library like jspdf or html2pdf
    alert('PDF download feature coming soon!')
  }

  const handleBackFromSolution = () => setSelectedProblem(null)

  // When a problem is selected, show the Problem Solution page
  if (selectedProblem) {
    return (
      <div className="landing-container">
        <ProblemSolutionPage problem={selectedProblem} onBack={handleBackFromSolution} />
      </div>
    )
  }

  const hasResults = scanStatus === 'done' && scanResults
  const showPlaceholder = scanStatus === 'idle' || scanStatus === 'scanning'

  return (
    <div className="landing-container">
      <header className="landing-header">
        <h1 className="landing-title">equalview</h1>
      </header>

      <p className="landing-subtitle">
        {hasResults ? 'Users can download the PDF version of the results.' : 'Scan a website to check accessibility and structure.'}
      </p>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <section className="landing-scan-section" aria-label="Website scan">
        <label htmlFor="website-url" className="visually-hidden">Website URL</label>
        <input
          id="website-url"
          type="url"
          className="landing-url-input"
          placeholder="Website URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          disabled={scanStatus === 'scanning'}
          aria-describedby="scan-hint"
        />
        <button
          type="button"
          className="landing-scan-btn"
          onClick={handleScan}
          disabled={scanStatus === 'scanning' || !url.trim()}
          aria-busy={scanStatus === 'scanning'}
        >
          {scanStatus === 'scanning' ? 'Scanning…' : 'Scan'}
        </button>
        <p id="scan-hint" className="landing-scan-hint visually-hidden">
          Enter a full URL (e.g. https://example.com) and press Scan to analyze the site.
        </p>
      </section>

      <section className="landing-problems" aria-labelledby="problems-heading">
        <h2 id="problems-heading">Problems</h2>
        <div className="problems-grid">
          <ProblemCategoryBox
            title="Visual Accessibility"
            problems={scanResults?.problems?.visualAccessibility}
            showPlaceholder={showPlaceholder}
            onSelectProblem={setSelectedProblem}
          />
          <ProblemCategoryBox
            title="Structure and Semantics"
            problems={scanResults?.problems?.structureAndSemantics}
            showPlaceholder={showPlaceholder}
            onSelectProblem={setSelectedProblem}
          />
          <ProblemCategoryBox
            title="Multi-media"
            problems={scanResults?.problems?.multimedia}
            showPlaceholder={showPlaceholder}
            onSelectProblem={setSelectedProblem}
          />
        </div>
      </section>

      <section className="landing-whats-good" aria-labelledby="whats-good-heading">
        <h2 id="whats-good-heading">What's Good</h2>
        <div className="whats-good-box">
          {showPlaceholder ? (
            <p className="placeholder-text">Run a scan to see what's good about this site.</p>
          ) : (
            <ul className="whats-good-list">
              {(scanResults?.whatsGood || []).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function ProblemCategoryBox({ title, problems, showPlaceholder, onSelectProblem }) {
  const list = problems || []

  return (
    <div className="problem-category-box">
      <h3 className="problem-category-title">{title}</h3>
      <div className="problem-category-content">
        {showPlaceholder ? (
          <p className="placeholder-text">No results yet. Run a scan above.</p>
        ) : list.length === 0 ? (
          <p className="placeholder-text">No issues in this category.</p>
        ) : (
          <ul className="problem-list">
            {list.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="problem-link"
                  onClick={() => onSelectProblem(p)}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

### 3. Docker Configuration

Update `docker-compose.yml` to include the backend:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    working_dir: /app
    command: npm run dev
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    working_dir: /app
    command: npm run dev
    environment:
      - NODE_ENV=development
```

Create `backend/Dockerfile`:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

### 4. Environment Variables

Update `backend/.env`:

```env
PORT=3000
BACKEND_BASE_URL=http://localhost:3000
NODE_ENV=development
```

### 5. Testing

#### Backend Tests

Create `backend/tests/scan.test.js`:

```javascript
const request = require('supertest');
const app = require('../index');

describe('Scan API', () => {
  it('should return 400 for invalid URL', async () => {
    const response = await request(app)
      .post('/api/scan')
      .send({ url: 'invalid-url' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it('should return 200 for valid URL', async () => {
    const response = await request(app)
      .post('/api/scan')
      .send({ url: 'https://example.com' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('problems');
    expect(response.body).toHaveProperty('whatsGood');
  });
});
```

#### Frontend Tests

Update existing tests to work with the new API integration.

### 6. Production Considerations

#### Performance Optimization

1. **Caching**: Cache scan results for frequently scanned URLs
2. **Queue System**: Use a queue (like BullMQ) for handling multiple scans
3. **Resource Management**: Limit concurrent Puppeteer instances
4. **Timeouts**: Set appropriate timeouts for slow-loading websites

#### Security

1. **URL Validation**: Strict URL validation to prevent SSRF attacks
2. **Rate Limiting**: Limit scans per IP/user
3. **Input Sanitization**: Sanitize all user inputs
4. **CORS**: Configure CORS properly for production

#### Monitoring

1. **Logging**: Add comprehensive logging for debugging
2. **Metrics**: Track scan performance and success rates
3. **Health Checks**: Monitor Puppeteer and Axe Core health

### 7. Advanced Features (Optional)

#### Authentication

Add JWT-based authentication for scan endpoints:

```javascript
const jwt = require('jsonwebtoken');

// In scanController.js
async scanWebsite(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    // Continue with scan...
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}
```

#### PDF Generation

Add PDF report generation:

```javascript
const puppeteer = require('puppeteer');

// In scanController.js
async generatePdfReport(results, url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Generate HTML report
  const html = this.generateReportHtml(results, url);
  await page.setContent(html);
  
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true
  });
  
  await browser.close();
  return pdf;
}
```

## Running the Application

1. **Install dependencies**:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Start services**:
   ```bash
   docker compose up --build
   ```

3. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## Troubleshooting

### Common Issues

1. **Puppeteer not launching**: Ensure you have proper permissions and dependencies
2. **CORS errors**: Check CORS configuration in backend
3. **Memory issues**: Monitor memory usage with Puppeteer instances
4. **Slow scans**: Consider implementing caching and timeouts

### Debugging

1. **Enable verbose logging** in Puppeteer
2. **Check browser console** for JavaScript errors
3. **Verify Axe Core injection** is successful
4. **Test with simple websites** first

## Next Steps

1. Implement the backend scanning service
2. Update frontend to use real API
3. Add comprehensive testing
4. Implement caching and performance optimizations
5. Add authentication and rate limiting
6. Create PDF generation feature
7. Add monitoring and logging

This integration will transform equalView from a mock demonstration into a powerful accessibility scanning tool that provides real value to users.