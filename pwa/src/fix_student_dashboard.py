import sys

with open('views/StudentDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_line = "import { Dumbbell, Activity, Calendar, TrendingUp, Download, Play, CheckCircle2, ChevronRight, Lock, Trophy, Target, LogOut, Moon, Sun, AlertCircle, Clock, Save, Copy } from 'lucide-react';"
new_import_line = import_line + "\nimport StudentEvaluations from './StudentEvaluations';"

tab_code = '''          <button 
            onClick={() => setActiveTab('league')} 
            className={lex-1 md:flex-none whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors }
          >
            Mi Liga
          </button>'''

new_tab_code = tab_code + '''
          <button 
            onClick={() => setActiveTab('evolution')} 
            className={lex-1 md:flex-none whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors }
          >
            Mi Evolución
          </button>'''

if tab_code in content:
    content = content.replace(tab_code, new_tab_code)
if import_line in content:
    content = content.replace(import_line, new_import_line)

content = content.replace("{activeTab === 'league' && (", "{activeTab === 'evolution' && (<StudentEvaluations />)}\n        {activeTab === 'league' && (")

with open('views/StudentDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
