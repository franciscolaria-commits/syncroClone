from app.services.r2 import generar_url_presubida

try:
    urls = generar_url_presubida("test.jpg", "image/jpeg")
    print(urls)
except Exception as e:
    print(e)
