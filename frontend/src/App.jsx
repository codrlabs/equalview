import { useEffect, useMemo, useState } from 'react'
import {
  BrowserRouter, Navigate, Route, Routes,
  useLocation, useNavigate, useParams, useSearchParams,
} from 'react-router-dom'
import AppShell from './views/AppShell'
import LandingView from './views/LandingView'
import ResultsView from './views/ResultsView'
import ProblemView from './views/ProblemView'
import StoryView from './views/StoryView'
import DonateView from './views/DonateView'
import SignInView from './views/SignInView'
import ConnectView from './views/ConnectView'
import DashboardView from './views/DashboardView'
import AccountView from './views/AccountView'
import LegalView from './views/LegalView'
import NotFoundView from './views/NotFoundView'
import { apiClient } from './lib/apiClient'
import { useScan } from './hooks/useScan'
import { toScanViewModel } from './lib/scanAdapter'
import { PLACEHOLDER_USER, PLACEHOLDER_SAVED_SCANS } from './data/placeholders'

/** Route keys (as the UI kit named them) ↔ URL paths. */
const PATHS = {
  landing: '/',
  results: '/results',
  problem: '/problem',
  story: '/story',
  donate: '/donate',
  signin: '/signin',
  connect: '/connect',
  dashboard: '/dashboard',
  account: '/account',
  privacy: '/privacy',
  terms: '/terms',
}

function routeKeyFor(pathname) {
  if (pathname.startsWith('/problem')) return 'problem'
  const entry = Object.entries(PATHS).find(([, path]) => path === pathname)
  return entry ? entry[0] : null
}

/** Centered spinner used while a deep-linked scan is re-running. */
function ScanningIndicator({ url }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '64px 24px' }}>
      <div className="ev-spin" style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid var(--blue-100)', borderTopColor: 'var(--accent)' }} />
      <div style={{ font: 'var(--font-label)', color: 'var(--text-body)' }}>Scanning {url}…</div>
    </div>
  )
}

/**
 * /results — renders the in-memory scan; on a deep link / refresh it
 * re-fetches the report for ?url= through the backend.
 */
function ResultsRoute({ scan, onOpenProblem }) {
  const [params] = useSearchParams()
  const url = params.get('url')

  if (scan) return <ResultsView data={scan} onOpenProblem={onOpenProblem} />
  if (!url) return <Navigate to={PATHS.landing} replace />
  return <ResultsFetcher url={url} onOpenProblem={onOpenProblem} />
}

function ResultsFetcher({ url, onOpenProblem }) {
  const navigate = useNavigate()
  const { data, loading, error } = useScan(url)
  const viewModel = useMemo(() => (data ? toScanViewModel(data, url) : null), [data, url])

  if (loading) return <ScanningIndicator url={url} />
  if (error || !viewModel) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '64px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>We couldn’t scan that page</h1>
        <p style={{ font: 'var(--font-body)', color: 'var(--text-muted)', maxWidth: 420, lineHeight: 1.6, margin: 0 }}>{error || 'The scanner returned no results.'}</p>
        <button onClick={() => navigate(PATHS.landing)} style={{
          marginTop: 8, padding: '10px 22px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--accent)',
          background: 'var(--accent)', color: '#fff', font: 'var(--font-label)', cursor: 'pointer',
        }}>Try another URL</button>
      </div>
    )
  }
  return <ResultsView data={viewModel} onOpenProblem={onOpenProblem} />
}

/** /problem/:id — looks the problem up in the current scan. */
function ProblemRoute({ scan, problem, onBack }) {
  const { id } = useParams()
  const resolved = problem
    || scan?.categories.flatMap((c) => c.problems).find((p) => p.id === id)
  if (!resolved) return <Navigate to={PATHS.landing} replace />
  return <ProblemView problem={resolved} onBack={onBack} />
}

function AppRoutes() {
  const navigate = useNavigate()
  const location = useLocation()

  const [scan, setScan] = useState(null)
  const [problem, setProblem] = useState(null)

  // Auth placeholders — real OAuth + storage land in Phase 5.
  const [authed, setAuthed] = useState(false)
  const [provider, setProvider] = useState('github')
  const [hasScans, setHasScans] = useState(true)

  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('ev-theme') || 'light' } catch { return 'light' }
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('ev-theme', theme) } catch { /* private mode */ }
  }, [theme])
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  const nav = (routeKey) => {
    if (routeKey !== 'problem') setProblem(null)
    navigate(PATHS[routeKey] || PATHS.landing)
  }

  /** Landing submit — run the real scan, then show results. */
  const handleScan = async (url) => {
    const result = await apiClient.runScan(url)
    if (!result) throw new Error('The scanner returned no results — the site may have blocked it.')
    setScan(toScanViewModel(result, url))
    setProblem(null)
    navigate(`${PATHS.results}?url=${encodeURIComponent(url)}`)
  }

  const openProblem = (p) => {
    setProblem(p)
    navigate(`${PATHS.problem}/${encodeURIComponent(p.id)}`)
  }

  const backToResults = () => {
    setProblem(null)
    const url = scan?.url
    navigate(url ? `${PATHS.results}?url=${encodeURIComponent(url)}` : PATHS.results)
  }

  /** Re-run a saved scan from the dashboard (placeholder entries are bare domains). */
  const openSaved = (s) => {
    setScan(null)
    setProblem(null)
    const url = /^https?:\/\//i.test(s.url) ? s.url : `https://${s.url}`
    navigate(`${PATHS.results}?url=${encodeURIComponent(url)}`)
  }

  // OAuth placeholder → storage setup (connect) → dashboard.
  const auth = (p) => { setProvider(p); navigate(PATHS.connect) }
  const connectDone = (storeMode) => { setAuthed(true); setHasScans(storeMode === 'existing'); navigate(PATHS.dashboard) }
  const signOut = () => { setAuthed(false); setHasScans(true); navigate(PATHS.landing) }

  const route = routeKeyFor(location.pathname)

  return (
    <AppShell route={route} onNav={nav} authed={authed} user={PLACEHOLDER_USER} theme={theme} onToggleTheme={toggleTheme}>
      <Routes>
        <Route path={PATHS.landing} element={<LandingView onScan={handleScan} />} />
        <Route path={PATHS.results} element={<ResultsRoute scan={scan} onOpenProblem={openProblem} />} />
        <Route path={`${PATHS.problem}/:id`} element={<ProblemRoute scan={scan} problem={problem} onBack={backToResults} />} />
        <Route path={PATHS.story} element={<StoryView onNav={nav} />} />
        <Route path={PATHS.donate} element={<DonateView onNav={nav} />} />
        <Route path={PATHS.signin} element={authed ? <Navigate to={PATHS.dashboard} replace /> : <SignInView onNav={nav} onAuth={auth} />} />
        <Route path={PATHS.connect} element={<ConnectView provider={provider} onDone={connectDone} onCancel={() => navigate(PATHS.signin)} />} />
        <Route path={PATHS.dashboard} element={authed
          ? <DashboardView onNav={nav} onOpen={openSaved} saved={hasScans ? PLACEHOLDER_SAVED_SCANS : []} provider={provider} user={PLACEHOLDER_USER} />
          : <Navigate to={PATHS.signin} replace />} />
        <Route path={PATHS.account} element={authed
          ? <AccountView onNav={nav} onSignOut={signOut} user={PLACEHOLDER_USER} provider={provider} />
          : <Navigate to={PATHS.signin} replace />} />
        <Route path={PATHS.privacy} element={<LegalView doc="privacy" onNav={nav} />} />
        <Route path={PATHS.terms} element={<LegalView doc="terms" onNav={nav} />} />
        <Route path="*" element={<NotFoundView onNav={nav} />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
