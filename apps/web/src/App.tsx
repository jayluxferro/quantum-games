import { Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import Layout from '@/components/Layout'
import HomePage from '@/pages/HomePage'
import GamesPage from '@/pages/GamesPage'
import GameDetailPage from '@/pages/GameDetailPage'
import PlayPage from '@/pages/PlayPage'
import ProfilePage from '@/pages/ProfilePage'
import LearnPage from '@/pages/LearnPage'
import MultiplayerPage from '@/pages/MultiplayerPage'
import LTIPage from '@/pages/LTIPage'
import AdminPage from '@/pages/AdminPage'
import TeacherDashboardPage from '@/pages/TeacherDashboardPage'
import NotFoundPage from '@/pages/NotFoundPage'

function App() {
  return (
    <>
      <Routes>
        {/* LTI embedded view (no layout) */}
        <Route path="/lti/play" element={<LTIPage />} />
        
        {/* Main app with layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="games/:slug" element={<GameDetailPage />} />
          <Route path="play/:slug" element={<PlayPage />} />
          <Route path="play/:slug/:level" element={<PlayPage />} />
          <Route path="multiplayer" element={<MultiplayerPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="learn" element={<LearnPage />} />
          <Route path="learn/:concept" element={<LearnPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="teacher" element={<TeacherDashboardPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App
