with open("src/views/StudentDashboard.jsx", "r", encoding="utf-8") as f:
    content = f.read()

import re
content = re.sub(r"className=\{.*ext-xs font-black uppercase transition-colors hidden md:block \$\{activeTab === 'tutorial' \? 'text-emerald-400' : 'text-zinc-500 hover:text-emerald-400'\}\}>", "className={`text-xs font-black uppercase transition-colors hidden md:block ${activeTab === 'tutorial' ? 'text-emerald-400' : 'text-zinc-500 hover:text-emerald-400'}`}>", content)

with open("src/views/StudentDashboard.jsx", "w", encoding="utf-8") as f:
    f.write(content)
