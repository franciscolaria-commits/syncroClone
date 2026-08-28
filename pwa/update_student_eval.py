import sys
import codecs

filepath = 'src/views/StudentEvaluations.jsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

old_upload = """      try {
        const file = e.target.files[0];
        const presignedRes = await api.post("/api/v1/storage/presigned", {
          filename: file.name,
          content_type: file.type
        });
        const uploadRes = await fetch(presignedRes.upload_url, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
        if (!uploadRes.ok) throw new Error("Upload failed");
        setFormData({ ...formData, [field]: presignedRes.public_url });
      } catch (err) {"""

new_upload = """      try {
        const file = e.target.files[0];
        const uploadData = new FormData();
        uploadData.append('file', file);
        
        const uploadRes = await api.post("/api/v1/storage/upload", uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        setFormData({ ...formData, [field]: uploadRes.public_url });
      } catch (err) {"""

content = content.replace(old_upload, new_upload)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
print("Updated StudentEvaluations.jsx")
