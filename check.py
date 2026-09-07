with open("pwa/src/views/StudentDashboard.jsx", "r", encoding="utf-8") as f:
    content = f.read()
if "A3" in content or "A-a" in content:
    print("Corrupted!")
else:
    print("Clean!")
