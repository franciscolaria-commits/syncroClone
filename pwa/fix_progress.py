import sys
import codecs

filepath = 'src/views/StudentProgress.jsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

target = "import SessionHistory from '../components/SessionHistory.jsx';"
replacement = "import SessionHistory from '../components/SessionHistory.jsx';\nimport StudentEvaluations from './StudentEvaluations.jsx';"

if target in content and replacement not in content:
    content = content.replace(target, replacement)
    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)
