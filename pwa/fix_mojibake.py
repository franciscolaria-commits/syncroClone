import os
import codecs

def fix_mojibake(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Test if it needs fixing
        if "A3" in content or "A-a" in content or "A" in content or "CÃ³mo" in content or "A" in content:
            # Try to reverse the encoding mess
            # The string was read as cp1252 but actually was utf-8
            # Let's encode back to cp1252 then decode as utf-8
            try:
                fixed = content.encode('cp1252').decode('utf-8')
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(fixed)
                print(f"Fixed {filepath}")
            except Exception as e:
                print(f"Failed to fix {filepath} via cp1252: {e}")
                
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

for root, dirs, files in os.walk("src"):
    for file in files:
        if file.endswith(".jsx"):
            fix_mojibake(os.path.join(root, file))

