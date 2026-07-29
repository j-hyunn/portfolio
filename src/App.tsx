import { Route, Routes } from 'react-router-dom'
import { SiteHeader } from '@/components/layout/site-header'
import Home from '@/pages/Home'
import ProjectDetail from '@/pages/ProjectDetail'

function App() {
  return (
    <>
      <SiteHeader />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects/:slug" element={<ProjectDetail />} />
      </Routes>
    </>
  )
}

export default App
