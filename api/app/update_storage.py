import sys
import codecs
import re

filepath = 'routers/storage.py'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

if "from fastapi import APIRouter, HTTPException, status, UploadFile, File" not in content:
    content = content.replace("from fastapi import APIRouter, HTTPException, status", "from fastapi import APIRouter, HTTPException, status, UploadFile, File")

if "from app.services.r2 import generar_url_presubida, upload_file_to_r2" not in content:
    content = content.replace("from app.services.r2 import generar_url_presubida", "from app.services.r2 import generar_url_presubida, upload_file_to_r2")

if "class DirectUploadResponse" not in content:
    new_code = """
class DirectUploadResponse(BaseModel):
    public_url: str = Field(..., description="URL de acceso pblico final")
    key: str = Field(..., description="Nombre nico (Key) generado para R2")

@router.post("/upload", response_model=DirectUploadResponse, status_code=status.HTTP_200_OK)
async def upload_direct_to_r2(file: UploadFile = File(...)):
    \"\"\"
    Sube un archivo directamente a R2 a travs del servidor.
    \"\"\"
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Archivo vaco.")
            
        _, ext = os.path.splitext(file.filename.lower())
        if not ext and "/" in (file.content_type or ""):
            ext = f".{file.content_type.split('/')[-1]}"
            
        unique_key = f"{uuid.uuid4()}{ext}"
        
        public_url = upload_file_to_r2(contents, unique_key, file.content_type)
        if not public_url:
            raise HTTPException(status_code=500, detail="Error al subir el archivo a Cloudflare R2.")
            
        return DirectUploadResponse(
            public_url=public_url,
            key=unique_key
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR INTERNO (Storage Upload): {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Ocurri un error interno al procesar el archivo."
        )
"""
    content = content + new_code

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
print("Updated routers/storage.py")
