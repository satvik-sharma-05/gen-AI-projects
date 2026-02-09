from pyparsing import Path
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    groq_api_key: Optional[str] = None
    chroma_persist_dir = str(
    Path(__file__).resolve().parent / "data" / "chroma"
)
    
    allowed_templates: List[str] = ["C 01.00", "C 14.00"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()