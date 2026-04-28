import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ScanResultsPage from './pages/ScanResultsPage'
import ProblemPage from './pages/ProblemPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/scan-results" element={<ScanResultsPage />} />
        <Route path="/problems/:id" element={<ProblemPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  )
}
