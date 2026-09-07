import sys
import codecs

filepath = 'src/views/StudentDashboard.jsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

target = """            <button 
              onClick={handleUpdatePhone}
              disabled={isUpdatingPhone}
              className="bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold px-4 py-1.5 rounded text-sm whitespace-nowrap transition-colors disabled:opacity-50"
            >
              {isUpdatingPhone ? 'Guardando...' : 'Guardar'}
import StudentEvaluations from './StudentEvaluations.jsx';
import ExerciseAnimations from '../components/ExerciseAnimations.jsx';

const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&loop=1&playlist=${match[1]}` : url;
};

export default function StudentDashboard() {"""

replacement = """            <button 
              onClick={handleUpdatePhone}
              disabled={isUpdatingPhone}
              className="bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold px-4 py-1.5 rounded text-sm whitespace-nowrap transition-colors disabled:opacity-50"
            >
              {isUpdatingPhone ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}"""

if target in content:
    content = content.replace(target, replacement)
    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Target not found!")
