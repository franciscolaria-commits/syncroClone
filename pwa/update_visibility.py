import sys
import codecs

filepath = 'src/views/StudentEvaluations.jsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Make it default to visible if coach
old_submit = "await api.post(`/api/v1/students/${studentId}/evaluations/${endpoint}`, formData);"
new_submit = """
      let payload = { ...formData };
      if (activeTab === 'fotos' && userRole === 'entrenador') {
        payload.visible_para_entrenador = true;
      }
      await api.post(`/api/v1/students/${studentId}/evaluations/${endpoint}`, payload);
"""

content = content.replace(old_submit, new_submit)

# Also conditionally hide the checkbox if user is a coach
old_checkbox = """<label className="mt-4 flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" name="visible_para_entrenador" onChange={handleCheckbox} className="rounded bg-zinc-800 text-emerald-500" />
            Permitir que mi entrenador vea estas fotos
          </label>"""

new_checkbox = """{userRole !== 'entrenador' && (
          <label className="mt-4 flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" name="visible_para_entrenador" onChange={handleCheckbox} className="rounded bg-zinc-800 text-emerald-500" />
            Permitir que mi entrenador vea estas fotos
          </label>
          )}"""

content = content.replace(old_checkbox, new_checkbox)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
print("Updated StudentEvaluations for coach visibility")
