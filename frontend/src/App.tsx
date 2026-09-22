import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Splash } from './components/Splash'
import { RequireRole } from './components/RequireRole'
import { BidderShell, GovernmentShell } from './components/Shell'
import { PublicShell } from './components/PublicShell'
import { LoginPage } from './pages/auth/LoginPage'
import { useAuth } from './lib/auth'

import Dashboard from './pages/bidder/Dashboard'
import FindTenders from './pages/bidder/FindTenders'
import TenderDetail from './pages/bidder/TenderDetail'
import MyBids from './pages/bidder/MyBids'
import EmdAllocator from './pages/bidder/EmdAllocator'
import TenderAlerts from './pages/bidder/TenderAlerts'
import SavedTenders from './pages/bidder/SavedTenders'
import Competitors from './pages/bidder/Competitors'
import CollusionScreen from './pages/bidder/CollusionScreen'
import VendorNetwork from './pages/bidder/VendorNetwork'
import TenderAnalytics from './pages/bidder/TenderAnalytics'
import ClauseParser from './pages/bidder/ClauseParser'
import CompanyProfile from './pages/bidder/CompanyProfile'

import GovDashboard from './pages/government/Dashboard'
import AllTenders from './pages/government/AllTenders'
import GovTenderForm from './pages/government/TenderForm'
import GovTenderDetail from './pages/government/TenderDetail'
import UnderEvaluation from './pages/government/UnderEvaluation'
import AnomalySignals from './pages/government/AnomalySignals'
import InvestigationQueue from './pages/government/InvestigationQueue'
import VendorRegistry from './pages/government/VendorRegistry'
import PendingApprovals from './pages/government/PendingApprovals'

import PublicSearchTenders from './pages/public/SearchTenders'
import PublicAwardsResults from './pages/public/AwardsResults'
import PublicPriceTransparency from './pages/public/PriceTransparency'
import PublicStatistics from './pages/public/Statistics'

import Settings from './pages/shared/Settings'
import Help from './pages/shared/Help'
import ResetPassword from './pages/auth/ResetPassword'

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  const home = user.role === 'bidder' ? '/app/dashboard' : '/gov/dashboard'
  return <Navigate to={home} replace />
}

const SPLASH_SEEN_KEY = 'bidvector_splash_seen'

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return !sessionStorage.getItem(SPLASH_SEEN_KEY)
    } catch {
      return true
    }
  })
  useEffect(() => {
    if (!showSplash) return
    const t = setTimeout(() => {
      setShowSplash(false)
      try { sessionStorage.setItem(SPLASH_SEEN_KEY, '1') } catch { /* private mode etc. */ }
    }, 3000)
    return () => clearTimeout(t)
  }, [])

  if (showSplash) return <Splash />

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage role="bidder" />} />
      <Route path="/login/government" element={<LoginPage role="government" />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Bidder portal */}
      <Route path="/app/dashboard" element={<RequireRole role="bidder"><BidderShell><Dashboard /></BidderShell></RequireRole>} />
      <Route path="/app/tenders" element={<RequireRole role="bidder"><BidderShell><FindTenders /></BidderShell></RequireRole>} />
      <Route path="/app/tenders/:id" element={<RequireRole role="bidder"><BidderShell><TenderDetail /></BidderShell></RequireRole>} />
      <Route path="/app/bids" element={<RequireRole role="bidder"><BidderShell><MyBids /></BidderShell></RequireRole>} />
      <Route path="/app/emd-allocator" element={<RequireRole role="bidder"><BidderShell><EmdAllocator /></BidderShell></RequireRole>} />
      <Route path="/app/alerts" element={<RequireRole role="bidder"><BidderShell><TenderAlerts /></BidderShell></RequireRole>} />
      <Route path="/app/saved" element={<RequireRole role="bidder"><BidderShell><SavedTenders /></BidderShell></RequireRole>} />
      <Route path="/app/competitors" element={<RequireRole role="bidder"><BidderShell><Competitors /></BidderShell></RequireRole>} />
      <Route path="/app/collusion-screen" element={<RequireRole role="bidder"><BidderShell><CollusionScreen /></BidderShell></RequireRole>} />
      <Route path="/app/vendor-network" element={<RequireRole role="bidder"><BidderShell><VendorNetwork /></BidderShell></RequireRole>} />
      <Route path="/app/analytics" element={<RequireRole role="bidder"><BidderShell><TenderAnalytics /></BidderShell></RequireRole>} />
      <Route path="/app/clause-parser" element={<RequireRole role="bidder"><BidderShell><ClauseParser /></BidderShell></RequireRole>} />
      <Route path="/app/profile" element={<RequireRole role="bidder"><BidderShell><CompanyProfile /></BidderShell></RequireRole>} />
      <Route path="/app/settings" element={<RequireRole role="bidder"><BidderShell><Settings /></BidderShell></RequireRole>} />
      <Route path="/app/help" element={<RequireRole role="bidder"><BidderShell><Help /></BidderShell></RequireRole>} />

      {/* Government portal */}
      <Route path="/gov/dashboard" element={<RequireRole role="government"><GovernmentShell><GovDashboard /></GovernmentShell></RequireRole>} />
      <Route path="/gov/tenders" element={<RequireRole role="government"><GovernmentShell><AllTenders /></GovernmentShell></RequireRole>} />
      <Route path="/gov/tenders/new" element={<RequireRole role="government"><GovernmentShell><GovTenderForm /></GovernmentShell></RequireRole>} />
      <Route path="/gov/tenders/:id" element={<RequireRole role="government"><GovernmentShell><GovTenderDetail /></GovernmentShell></RequireRole>} />
      <Route path="/gov/evaluation" element={<RequireRole role="government"><GovernmentShell><UnderEvaluation /></GovernmentShell></RequireRole>} />
      <Route path="/gov/anomaly-signals" element={<RequireRole role="government"><GovernmentShell><AnomalySignals /></GovernmentShell></RequireRole>} />
      <Route path="/gov/investigation-queue" element={<RequireRole role="government"><GovernmentShell><InvestigationQueue /></GovernmentShell></RequireRole>} />
      <Route path="/gov/vendor-registry" element={<RequireRole role="government"><GovernmentShell><VendorRegistry /></GovernmentShell></RequireRole>} />
      <Route path="/gov/pending-approvals" element={<RequireRole role="government"><GovernmentShell><PendingApprovals /></GovernmentShell></RequireRole>} />
      <Route path="/gov/settings" element={<RequireRole role="government"><GovernmentShell><Settings /></GovernmentShell></RequireRole>} />
      <Route path="/gov/help" element={<RequireRole role="government"><GovernmentShell><Help /></GovernmentShell></RequireRole>} />

      {/* Public portal -- no login required at all */}
      <Route path="/public/tenders" element={<PublicShell><PublicSearchTenders /></PublicShell>} />
      <Route path="/public/awards" element={<PublicShell><PublicAwardsResults /></PublicShell>} />
      <Route path="/public/price-transparency" element={<PublicShell><PublicPriceTransparency /></PublicShell>} />
      <Route path="/public/statistics" element={<PublicShell><PublicStatistics /></PublicShell>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
