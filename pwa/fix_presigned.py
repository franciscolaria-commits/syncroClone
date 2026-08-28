import sys
import codecs

filepath = 'src/views/StudentEvaluations.jsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('presignedRes.data.upload_url', 'presignedRes.upload_url')
content = content.replace('presignedRes.data.public_url', 'presignedRes.public_url')

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
print("Fixed presignedRes in StudentEvaluations")
