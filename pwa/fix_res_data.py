import sys
import codecs

filepath = 'src/views/StudentEvaluations.jsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('setPhysicalEvals(res.data)', 'setPhysicalEvals(res)')
content = content.replace('setBodyComps(res.data)', 'setBodyComps(res)')
content = content.replace('setVisuals(res.data)', 'setVisuals(res)')

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
print("Fixed res.data in StudentEvaluations")
