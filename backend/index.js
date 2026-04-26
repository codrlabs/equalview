require('dotenv').config();
const express = require('express');
const cors = require('cors');

const mockScanResults = require('./data/mockScanResults');

const app = express();

app.use(cors({ origin: 'http://localhost:5173' })); // Allow frontend origin
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  try {
    res.status(200).json({ status: 'okay', message: 'Server is running!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// TODO: replace mock results with a real Puppeteer + axe-core scan.
// See docs/plans/axecore-integration-roadmap.md.
app.post('/api/scan', (req, res) => {
  const { url } = req.body;
  console.log(`Received scan request for URL: ${url}`);
  res.json(mockScanResults);
});

app.get('/api/scan-results', (req, res) => {
  const { url } = req.query;
  console.log(`Received request for scan results of URL: ${url}`);
  res.json(mockScanResults);
});

app.get('/problems/:id', (req, res) => {
  const { id } = req.params;
  const allProblems = Object.values(mockScanResults.problems).flat();
  const problem = allProblems.find((p) => p.id === id);
  if (!problem) {
    return res.status(404).json({ error: 'Problem not found' });
  }
  console.log(`Serving problem ${id}`);
  res.json(problem);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
