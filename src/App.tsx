import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PointerGlow } from './components/PointerGlow'
import { LandingPage } from './pages/LandingPage'
import { AppPage } from './pages/AppPage'
import { ResultsPage } from './pages/ResultsPage'

export default function App() {
  return (
    <BrowserRouter>
      <PointerGlow />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="/app/results" element={<ResultsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
