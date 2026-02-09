import os
import sys
import traceback
from contextlib import asynccontextmanager
from pathlib import Path
from config import settings
# ────────────────────────────────────────────────
# Fix PYTHON PATH first
# ────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent  # rag-bank/app
sys.path.insert(0, str(BASE_DIR))

# ────────────────────────────────────────────────
# Global exception handler for startup crashes
# ────────────────────────────────────────────────
def log_uncaught_exception(exc_type, exc_value, exc_traceback):
    print("!!! UNCAUGHT EXCEPTION IN STARTUP !!!")
    traceback.print_exception(exc_type, exc_value, exc_traceback, file=sys.stdout)
    sys.exit(1)

sys.excepthook = log_uncaught_exception

print("=== DEBUG: main.py starting ===")
print(f"Python version: {sys.version}")
print(f"sys.path: {sys.path}")
print(f"Working dir: {os.getcwd()}")
print("=== END DEBUG ===")

# ────────────────────────────────────────────────
# FastAPI & core imports
# ────────────────────────────────────────────────
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Config with fallback
try:
    from config import settings
except ImportError:
    print("⚠ config.py not found → using env fallback")
    class Settings:
        def __init__(self):
            self.groq_api_key = os.getenv("GROQ_API_KEY", "")
            self.chroma_persist_dir = "./chroma_db"
            self.allowed_templates = ["C 01.00", "C 14.00"]
    settings = Settings()

# Schemas fallback
try:
    from schemas.corep import UserQuery, COREPResponse, ReportingField
except ImportError:
    print("⚠ schemas.corep not found → using fallback schemas")
    from pydantic import BaseModel, Field
    from typing import List, Optional
    from datetime import date

    class ReportingField(BaseModel):
        field_code: str
        field_name: str
        value: Optional[float] = None
        description: str = ""
        validation_status: str = "pending"

    class UserQuery(BaseModel):
        question: str
        scenario_description: str
        template: str
        reporting_date: date
        institution_name: str

    class COREPResponse(BaseModel):
        template: str
        reporting_date: date
        institution_name: str
        fields: List[ReportingField] = []
        rule_references: List[str] = []
        validation_errors: List[str] = []
        validation_status: str = "pending"

# Core components with fallbacks
try:
    from vectorstore.chroma_store import ChromaVectorStore
except ImportError as e:
    print(f"❌ Failed to import ChromaVectorStore: {e}")
    ChromaVectorStore = None

try:
    from rag.generator import COREPGenerator
except ImportError as e:
    print(f"❌ Failed to import COREPGenerator: {e}")
    COREPGenerator = None

try:
    from rag.retriever import RegulatoryRetriever
except ImportError:
    print("⚠ rag.retriever not found → dummy retriever")
    class RegulatoryRetriever:
        def __init__(self, vectorstore): 
            self.vectorstore = vectorstore
        def retrieve_relevant_text(self, query: str, template: str, k: int = 5):
            return [{"content": "No documents loaded", "metadata": {"source": "dummy"}}]

try:
    from validation.checks import COREPValidator
except ImportError:
    print("⚠ validation.checks not found → dummy validator")
    class COREPValidator:
        def validate_response(self, response):
            response.validation_status = "valid (no real validation)"
            return response

try:
    from audit.trace import audit_logger
except ImportError:
    print("⚠ audit.trace not found → dummy logger")
    class AuditLogger:
        def log_query(self, *args, **kwargs): pass
    audit_logger = AuditLogger()

try:
    from ingestion.load_docs import DocumentLoader
except ImportError:
    print("⚠ ingestion.load_docs not found → dummy loader")
    class DocumentLoader:
        def __init__(self, data_dir): 
            self.data_dir = data_dir
        def load_pdfs(self): 
            return []

try:
    from ingestion.chunk_docs import DocumentChunker
except ImportError:
    print("⚠ ingestion.chunk_docs not found → dummy chunker")
    class DocumentChunker:
        def chunk_documents(self, documents): 
            return documents

print("✓ All critical modules handled (with fallbacks if missing)")

# Global state
vector_store_manager = None
retriever = None
generator = None
is_initialized = False

class InitializeRequest(BaseModel):
    force_recreate: bool = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    global vector_store_manager, retriever, generator, is_initialized
    
    print("=== LIFESPAN START ===")
    print("Step 1: Checking settings...")
    print(f"GROQ key present: {bool(settings.groq_api_key)}")
    
    print("Step 2: Chroma init...")
    if ChromaVectorStore:
        try:
            print("  Creating ChromaVectorStore...")
            vector_store_manager = ChromaVectorStore(settings.chroma_persist_dir)
            print("  Chroma instance created successfully")
            
            if hasattr(vector_store_manager, 'store_exists') and vector_store_manager.store_exists():
                print("  Existing store found → loading...")
                if hasattr(vector_store_manager, 'load_store'):
                    vectorstore = vector_store_manager.load_store()
                    retriever = RegulatoryRetriever(vectorstore)
                    is_initialized = True
                    print("  ✓ Vector store loaded from disk")
                else:
                    print("  ℹ No load_store method found")
            else:
                print("  ℹ No existing store → call /initialize")
        except Exception as e:
            print(f"  Chroma CRASH: {str(e)}")
            traceback.print_exc()
            # Optional: raise if you want hard fail, or continue
    else:
        print("  ChromaVectorStore unavailable (import failed)")
    
    print("Step 3: Generator init...")
    if settings.groq_api_key and COREPGenerator:
        try:
            print("  Creating COREPGenerator...")
            generator = COREPGenerator(settings.groq_api_key)
            print("  ✓ COREPGenerator initialized")
        except Exception as e:
            print(f"  Generator CRASH: {str(e)}")
            traceback.print_exc()
    else:
        print("  Generator unavailable or no GROQ key")
    
    print(f"Step 4: Allowed templates: {settings.allowed_templates}")
    print("=== LIFESPAN COMPLETE - startup finished ===")
    
    yield
    
    print("Shutting down ReguLens...")

# ─── FastAPI App ───────────────────────────────────────
app = FastAPI(
    title="ReguLens COREP Assistant",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/debug/vectorstore")
async def debug_vectorstore():
    """Debug endpoint to check vector store status"""
    global vector_store_manager, is_initialized
    
    try:
        if not vector_store_manager:
            return {"status": "no_vector_store_manager"}
        
        # Try to get collection info
        store_exists = vector_store_manager.store_exists()
        
        # Try to load and count documents
        if store_exists:
            try:
                vectorstore = vector_store_manager.load_store()
                # Get collection
                collection = vectorstore._collection
                count = collection.count()
                return {
                    "status": "exists",
                    "store_exists": store_exists,
                    "document_count": count,
                    "is_initialized": is_initialized,
                    "chroma_db_path": settings.chroma_persist_dir
                }
            except Exception as e:
                return {
                    "status": "error_loading",
                    "store_exists": store_exists,
                    "error": str(e),
                    "chroma_db_path": settings.chroma_persist_dir
                }
        else:
            return {
                "status": "not_exists",
                "store_exists": store_exists,
                "is_initialized": is_initialized,
                "chroma_db_path": settings.chroma_persist_dir
            }
            
    except Exception as e:
        return {"status": "error", "error": str(e)}
@app.get("/")
async def root():
    return {
        "service": "ReguLens COREP Assistant",
        "version": "1.0.0",
        "description": "LLM-assisted PRA COREP reporting assistant",
        "templates": settings.allowed_templates,
        "status": "operational" if is_initialized else "needs_initialization",
        "capabilities": {
            "vector_store": ChromaVectorStore is not None,
            "rag_generator": COREPGenerator is not None,
            "groq_available": bool(settings.groq_api_key)
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "initialized": is_initialized,
        "groq_available": bool(settings.groq_api_key),
        "vector_store_ready": is_initialized,
        "templates": settings.allowed_templates,
        "components": {
            "chroma_store": ChromaVectorStore is not None,
            "corep_generator": COREPGenerator is not None,
            "retriever": retriever is not None,
            "generator": generator is not None
        }
    }

@app.get("/templates")
async def get_templates():
    return {"templates": settings.allowed_templates}


@app.post("/initialize")
async def initialize_vectorstore(request: InitializeRequest):
    """
    Initialize RAG system using in-memory document retrieval (NO vector DB).
    LIVE-safe for Render.
    """
    global retriever, is_initialized

    try:
        from pathlib import Path

        # ────────────────────────────────────────────────
        # Resolve data path
        # ────────────────────────────────────────────────
        APP_DIR = Path(__file__).resolve().parent
        PROJECT_ROOT = APP_DIR.parent
        DATA_DIR = PROJECT_ROOT / "data" / "raw"
        data_dir = str(DATA_DIR)

        print("=" * 60)
        print("INITIALIZE (IN-MEMORY RAG)")
        print(f"Working dir: {os.getcwd()}")
        print(f"PDF directory: {data_dir}")
        print("=" * 60)

        if not os.path.exists(data_dir):
            return {
                "status": "error",
                "message": f"Data directory not found: {data_dir}"
            }

        pdf_files = [f for f in os.listdir(data_dir) if f.lower().endswith(".pdf")]
        if not pdf_files:
            return {
                "status": "error",
                "message": "No PDF files found",
                "path_checked": data_dir
            }

        print(f"📁 Found {len(pdf_files)} PDF files")

        # ────────────────────────────────────────────────
        # Load documents
        # ────────────────────────────────────────────────
        loader = DocumentLoader(data_dir)
        documents = loader.load_pdfs()

        if not documents:
            return {
                "status": "error",
                "message": "PDFs loaded but no pages extracted"
            }

        print(f"📄 Loaded {len(documents)} pages")

        # ────────────────────────────────────────────────
        # Chunk documents
        # ────────────────────────────────────────────────
        chunker = DocumentChunker()
        chunks = chunker.chunk_documents(documents)

        chunks = [
            c for c in chunks
            if hasattr(c, "page_content") and c.page_content.strip()
        ]

        if not chunks:
            return {
                "status": "error",
                "message": "No valid chunks after processing"
            }

        print(f"✂️ Created {len(chunks)} valid chunks")

        # ────────────────────────────────────────────────
        # In-memory retriever (NO Chroma)
        # ────────────────────────────────────────────────
        retriever = RegulatoryRetriever(chunks)
        is_initialized = True

        print("✅ In-memory RAG initialized successfully")

        return {
            "status": "success",
            "mode": "in-memory-rag",
            "pdf_files": len(pdf_files),
            "pages_loaded": len(documents),
            "chunks_ready": len(chunks)
        }

    except Exception as e:
        print("❌ INITIALIZATION FAILED")
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e)
        }

# async def initialize_vectorstore(request: InitializeRequest):
#     """Initialize the vector store with documents from rag-bank/data/raw"""
#     global vector_store_manager, retriever, is_initialized
    
#     try:
#         from pathlib import Path
#         import shutil

#         # ---- HARD RESET VECTOR DB (REQUIRED) ----
#         if request.force_recreate:
#             if os.path.exists(settings.chroma_persist_dir):
#                 print("🧨 Force recreate enabled → deleting existing Chroma DB")
#                 shutil.rmtree(settings.chroma_persist_dir, ignore_errors=True)

#         # ────────────────────────────────────────────────
#         # Path calculation (already correct)
#         # ────────────────────────────────────────────────
#         APP_DIR = Path(__file__).resolve().parent
#         PROJECT_ROOT = APP_DIR.parent
#         DATA_DIR = PROJECT_ROOT / "data" / "raw"
#         data_dir = str(DATA_DIR)
        
#         print("=" * 60)
#         print("INITIALIZE ENDPOINT CALLED")
#         print(f"Current working dir:     {os.getcwd()}")
#         print(f"__file__ resolved parent: {APP_DIR}")
#         print(f"Looking for PDFs in:      {data_dir}")
#         print("=" * 60)
        
#         if not os.path.exists(data_dir):
#             return {
#                 "status": "error",
#                 "message": f"Data directory not found: {data_dir}",
#                 "expected_location": "rag-bank/data/raw"
#             }
        
#         pdf_files = [f for f in os.listdir(data_dir) if f.lower().endswith(('.pdf', '.PDF'))]
        
#         if not pdf_files:
#             return {
#                 "status": "error",
#                 "message": "No PDF files found",
#                 "path_checked": data_dir,
#                 "found_files": os.listdir(data_dir)
#             }
        
#         print(f"📁 Found {len(pdf_files)} PDF files:")
#         for f in pdf_files:
#             print(f"   - {f}")
        
#         # Load documents
#         loader = DocumentLoader(data_dir)
#         documents = loader.load_pdfs()
        
#         if not documents:
#             return {
#                 "status": "error",
#                 "message": "No pages loaded from PDFs",
#                 "pdf_count": len(pdf_files)
#             }
        
#         print(f"📄 Loaded {len(documents)} document pages")
        
#         # Chunk documents
#         chunker = DocumentChunker()
#         raw_chunks = chunker.chunk_documents(documents)
        
#         # Filter invalid/empty chunks
#         chunked_docs = [
#             doc for doc in raw_chunks
#             if hasattr(doc, "page_content") and doc.page_content and doc.page_content.strip()
#         ]
        
#         print(f"✂️ Created {len(raw_chunks)} raw chunks")
#         print(f"✅ Valid chunks after filtering: {len(chunked_docs)}")
        
#         if not chunked_docs:
#             return {
#                 "status": "error",
#                 "message": "No valid chunks after filtering",
#                 "raw_chunks": len(raw_chunks)
#             }
        
#         # ────────────────────────────────────────────────
#         # Create vector store — FIXED VERSION
#         # ────────────────────────────────────────────────
#         if not vector_store_manager:
#             if ChromaVectorStore is None:
#                 return {"status": "error", "message": "ChromaVectorStore unavailable"}
#             vector_store_manager = ChromaVectorStore(settings.chroma_persist_dir)
        
#         print(f"🗄️ Creating vector store at: {settings.chroma_persist_dir}")
        
#         # Use from_documents (recommended) — it handles embeddings internally
#         vectorstore = vector_store_manager.create_store(chunked_docs)
        
#         retriever = RegulatoryRetriever(vectorstore)
#         is_initialized = True
        
#         return {
#             "status": "success",
#             "message": f"Vector store initialized with {len(chunked_docs)} chunks from {len(documents)} pages",
#             "documents_loaded": len(documents),
#             "chunks_created": len(chunked_docs),
#             "pdf_files_found": len(pdf_files),
#             "persist_directory": settings.chroma_persist_dir
#         }
        
#     except Exception as e:
#         print(f"❌ CRITICAL ERROR during initialization:")
#         traceback.print_exc()
#         return {
#             "status": "error",
#             "message": f"Initialization failed: {str(e)}",
#             "note": "Check Render logs for full traceback"
#         }
    
@app.get("/debug/imports")
async def debug_imports():
    """Debug endpoint to check import status"""
    import inspect
    
    modules_info = {}
    for module_name in ["vectorstore.chroma_store", "rag.generator", "rag.retriever"]:
        try:
            module = __import__(module_name)
            classes = []
            for name, obj in inspect.getmembers(module):
                if inspect.isclass(obj):
                    classes.append(name)
            modules_info[module_name] = {
                "status": "loaded",
                "classes": classes
            }
        except ImportError as e:
            modules_info[module_name] = {
                "status": "failed",
                "error": str(e)
            }
    
    return {
        "python_path": sys.path,
        "current_dir": os.path.dirname(os.path.abspath(__file__)),
        "modules": modules_info
    }



@app.post("/query", response_model=COREPResponse)
async def process_query(user_query: UserQuery, background_tasks: BackgroundTasks):
    """Process a regulatory query and generate COREP response"""
    
    # Check if system is initialized
    if not is_initialized:
        raise HTTPException(
            status_code=400,
            detail="System not initialized. Please call /initialize first."
        )
    
    if user_query.template not in settings.allowed_templates:
        raise HTTPException(
            status_code=400,
            detail=f"Template must be one of: {settings.allowed_templates}"
        )
    
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=400,
            detail="GROQ API key not configured. Add GROQ_API_KEY to .env file"
        )
    
    try:
        print(f"Received query: {user_query.dict()}")
        
        # Step 1: Retrieve relevant documents
        retrieved_texts = retriever.retrieve_relevant_text(
            query=user_query.question,
            template=user_query.template,
            k=5
        )
        
        print(f"Retrieved {len(retrieved_texts)} texts")
        
        # Step 2: Generate response
        response_dict = generator.generate_response(
            query=user_query.question,
            scenario=user_query.scenario_description,
            retrieved_texts=retrieved_texts,
            template=user_query.template
        )
        
        print(f"Generation done, response type: {type(response_dict)}")
        
        # Check if response_dict is valid
        if not response_dict or not isinstance(response_dict, dict):
            print(f"Invalid response_dict: {response_dict}")
            raise HTTPException(
                status_code=500,
                detail="Invalid response from generator"
            )
        
        print(f"Response dict keys: {response_dict.keys()}")
        print(f"Full response: {response_dict}")
        
        # Convert fields to Pydantic models
        fields = []
        for field_data in response_dict.get("fields", []):
            try:
                fields.append(ReportingField(**field_data))
            except Exception as e:
                print(f"Warning: Could not parse field {field_data}: {e}")
                # Create a default field
                fields.append(ReportingField(
                    field_code=field_data.get("field_code", "ERROR"),
                    field_name=field_data.get("field_name", "Error Field"),
                    value=field_data.get("value"),
                    description=f"Parse error: {str(e)[:50]}",
                    validation_status="invalid"
                ))
        
        # Create response - Pydantic will handle date parsing via validator
        response = COREPResponse(
            template=user_query.template,
            reporting_date=response_dict.get("reporting_date", user_query.reporting_date.isoformat()),
            institution_name=user_query.institution_name,
            fields=fields,
            rule_references=response_dict.get("rule_references", []),
            validation_errors=response_dict.get("validation_errors", [])
        )
        
        # Step 3: Validate
        validator = COREPValidator()
        response = validator.validate_response(response)
        
        # Step 4: Audit log
        background_tasks.add_task(
            audit_logger.log_query,
            user_query.dict(),
            retrieved_texts,
            response.dict(),
            response.validation_errors
        )
        
        print(f"Response created successfully: {response.template} with {len(response.fields)} fields")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in /query: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")


# if __name__ == "__main__":
#     print("\nStarting Uvicorn...")
#     print("Recommended command: python -m main   (better for relative imports)")
#     print("Or: python main.py\n")
    
#     uvicorn.run(
#         app,
#         host="0.0.0.0",
#         port=8000,
#         reload=True,
#         log_level="info"
#     )

