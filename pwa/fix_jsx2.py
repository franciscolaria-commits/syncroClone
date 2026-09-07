import sys
import codecs
import re

filepath = 'src/views/StudentDashboard.jsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

pattern = re.compile(r"\{\s*isUpdatingPhone \? 'Guardando\.\.\.' : 'Guardar'\s*\}\s*import StudentEvaluations from '\./StudentEvaluations\.jsx';.*?export default function StudentDashboard\(\) \{", re.DOTALL)

replacement = """{isUpdatingPhone ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}"""

if pattern.search(content):
    content = pattern.sub(replacement, content)
    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Target not found!")
