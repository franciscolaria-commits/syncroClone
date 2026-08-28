import os
import uuid
from fastapi import APIRouter, HTTPException, status, UploadFile, File
from pydantic import BaseModel, Field
from app.services.r2 import generar_url_presubida, upload_file_to_r2

router = APIRouter(
    prefix="/api/v1/storage",
    tags=["storage"]
)

class PresignedUrlRequest(BaseModel):
    filename: str = Field(..., description="Nombre original del archivo (ej. foto.png)")
    content_type: str = Field(..., description="Tipo MIME del archivo (ej. image/png)")

class PresignedUrlResponse(BaseModel):
    upload_url: str = Field(..., description="URL pre-firmada para subir el archivo vía HTTP PUT")
    public_url: str = Field(..., description="URL de acceso público final")
    key: str = Field(..., description="Nombre único (Key) generado para R2")

@router.post("/presigned", response_model=PresignedUrlResponse, status_code=status.HTTP_200_OK)
def get_presigned_url(request: PresignedUrlRequest):
    """
    Genera una URL pre-firmada para subir directamente un archivo a Cloudflare R2
    desde el cliente usando el método HTTP PUT. Evita colisiones renombrando el archivo 
    con un UUIDv4 conservando su extensión.
    """
    try:
        # Extraer la extensión del archivo
        _, ext = os.path.splitext(request.filename.lower())
        
        # Si no tiene extensión, intentar deducirla vagamente o dejarla vacía
        if not ext and "/" in request.content_type:
            ext = f".{request.content_type.split('/')[-1]}"
            
        # Generar nombre único basado en UUIDv4
        unique_key = f"{uuid.uuid4()}{ext}"
        
        # Generar las URLs
        urls = generar_url_presubida(
            object_name=unique_key,
            content_type=request.content_type
        )
        
        return PresignedUrlResponse(
            upload_url=urls["upload_url"],
            public_url=urls["public_url"],
            key=urls["key"]
        )
    except Exception as e:
        print(f"ERROR INTERNO (Storage): {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Ocurrió un error interno en el servidor."
        )

from fastapi import Request

@router.put("/mock-upload")
async def mock_upload(request: Request, key: str):
    """
    Endpoint de simulación local para capturar las subidas binarias de prueba (PUT)
    cuando no hay credenciales reales de Cloudflare R2 configuradas.
    """
    body = await request.body()
    print(f"📥 [MOCK STORAGE] Archivo '{key}' recibido de forma directa ({len(body)} bytes).")
    return {"status": "success", "detail": "Archivo cargado en storage simulado con éxito"}


class DirectUploadResponse(BaseModel):
    public_url: str = Field(..., description="URL de acceso pblico final")
    key: str = Field(..., description="Nombre nico (Key) generado para R2")

@router.post("/upload", response_model=DirectUploadResponse, status_code=status.HTTP_200_OK)
async def upload_direct_to_r2(file: UploadFile = File(...)):
    """
    Sube un archivo directamente a R2 a travs del servidor.
    """
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
