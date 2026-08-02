import { Route, Routes } from 'react-router-dom'
import { Sidebar } from '@/components/layout/sidebar'
import Career from '@/pages/Career'
import Overview from '@/pages/Overview'
import ProjectDetail from '@/pages/ProjectDetail'
import Projects from '@/pages/Projects'

function App() {
  return (
    <div className="min-h-screen lg:pl-64">
      <Sidebar />
      <div className="pt-14 lg:pt-0">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/career" element={<Career />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:slug" element={<ProjectDetail />} />
          <Route path="/projects/:slug/:docSlug" element={<ProjectDetail />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
