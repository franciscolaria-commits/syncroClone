import sys
import codecs

filepath = 'src/views/StudentDashboard.jsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

target = """        {/* Desktop Navigation */}
        {activeTab === 'home' && ("""

replacement = """        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-1 md:gap-4 border border-zinc-800 p-1 bg-zinc-900 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('home')} 
            className={`flex-1 md:flex-none whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'home' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Entrenar
          </button>
          <button 
            onClick={() => setActiveTab('routine')} 
            className={`flex-1 md:flex-none whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'routine' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Mi Rutina
          </button>
          <button 
            onClick={() => setActiveTab('league')} 
            className={`flex-1 md:flex-none whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'league' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Mi Liga
          </button>
          <button 
            onClick={() => setActiveTab('evolution')} 
            className={`flex-1 md:flex-none whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'evolution' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Mi Evolución
          </button>
        </nav>

        <button onClick={logout} className="text-xs font-black uppercase text-zinc-500 hover:text-red-500 transition-colors hidden md:block ml-4">
          SALIR
        </button>
      </header>

      {/* Main Container - Full Width Grid */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        
        {activeTab === 'home' && ("""

if target in content:
    content = content.replace(target, replacement)
    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Target not found!")
