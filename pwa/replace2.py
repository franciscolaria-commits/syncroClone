import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import AuthView from './views/AuthView.jsx';", "const AuthView = React.lazy(() => import('./views/AuthView.jsx'));")
content = content.replace("import LandingPage from './views/LandingPage.jsx';", "const LandingPage = React.lazy(() => import('./views/LandingPage.jsx'));")
content = content.replace("import CoachDashboard from './views/CoachDashboard.jsx';", "const CoachDashboard = React.lazy(() => import('./views/CoachDashboard.jsx'));")
content = content.replace("import StudentDashboard from './views/StudentDashboard.jsx';", "const StudentDashboard = React.lazy(() => import('./views/StudentDashboard.jsx'));")
content = content.replace("import BlockedView from './views/BlockedView.jsx';", "const BlockedView = React.lazy(() => import('./views/BlockedView.jsx'));")
content = content.replace("import SuperAdminPanel from './views/SuperAdminPanel.jsx';", "const SuperAdminPanel = React.lazy(() => import('./views/SuperAdminPanel.jsx'));")

content = content.replace("import WeightGuardian from './components/WeightGuardian.jsx';", "import WeightGuardian from './components/WeightGuardian.jsx';\n\nconst LoadingScreen = () => (\n  <div className=\"min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4\">\n    <div className=\"w-16 h-16 border-4 border-zinc-800 border-t-emerald-500 rounded-full animate-spin mb-4\"></div>\n    <p className=\"text-zinc-400 font-bold uppercase tracking-widest text-sm animate-pulse\">Cargando Syncro...</p>\n  </div>\n);\n")

replacements = {
    '<BlockedView />': '<React.Suspense fallback={<LoadingScreen />}><BlockedView /></React.Suspense>',
    '<AuthView onLoginSuccess={checkSession} />': '<React.Suspense fallback={<LoadingScreen />}><AuthView onLoginSuccess={checkSession} /></React.Suspense>',
    '<SuperAdminPanel />': '<React.Suspense fallback={<LoadingScreen />}><SuperAdminPanel /></React.Suspense>',
    '<LandingPage />': '<React.Suspense fallback={<LoadingScreen />}><LandingPage /></React.Suspense>',
    '<CoachDashboard />': '<React.Suspense fallback={<LoadingScreen />}><CoachDashboard /></React.Suspense>',
    '<WeightGuardian user={session}>\n        <StudentDashboard />\n      </WeightGuardian>': '<React.Suspense fallback={<LoadingScreen />}>\n        <WeightGuardian user={session}>\n          <StudentDashboard />\n        </WeightGuardian>\n      </React.Suspense>'
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
