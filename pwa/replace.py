import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace <Component /> with <React.Suspense fallback={<LoadingScreen />}><Component /></React.Suspense>
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
