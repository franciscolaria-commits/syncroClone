import sys
import codecs
import re

filepath = 'src/views/StudentDashboard.jsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    "      )}", 
    "      )}\n\n      {/* Brutalist Top Navbar */}\n      <header className=\"sticky top-0 z-50 bg-zinc-950 border-b border-zinc-800 flex flex-col md:flex-row items-center justify-between px-6 py-4 gap-4\">\nexport default function StudentDashboard() {\n", 
    1
)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
print("Fixed!")
