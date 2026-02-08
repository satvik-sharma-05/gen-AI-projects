import os
import sys
from contextlib import asynccontextmanager

# ────────────────────────────────────────────────
# Fix import paths FIRST — before any other imports
# ────────────────────────────────────────────────


# ────────────────────────────────────────────────
# Now safe to import everything else
# ────────────────────────────────────────────────
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Import config with fallback
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

# Schemas with fallback
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
    print("⚠ rag.retriever not found → using dummy retriever")
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
    
    print("\n" + "="*70)
    print("🚀 ReguLens COREP Assistant - Starting Up")
    print("="*70)
    
    if not settings.groq_api_key:
        print("❌ GROQ_API_KEY missing → generation will fail")
    else:
        print("✓ GROQ API key detected")

    # Vector store init
    
    if ChromaVectorStore:
        try:
            vector_store_manager = ChromaVectorStore(settings.chroma_persist_dir)
            if hasattr(vector_store_manager, 'store_exists') and vector_store_manager.store_exists():
                if hasattr(vector_store_manager, 'load_store'):
                    vectorstore = vector_store_manager.load_store()
                    retriever = RegulatoryRetriever(vectorstore)
                    is_initialized = True
                    print("✓ Vector store loaded from disk")
                else:
                    print("ℹ No load_store method found")
            else:
                print("ℹ Vector store not found → use /initialize")
        except Exception as e:
            print(f"❌ Vector store init failed: {e}")
    else:
        print("❌ ChromaVectorStore unavailable")

    # Generator init
    if settings.groq_api_key and COREPGenerator:
        try:
            generator = COREPGenerator(settings.groq_api_key)
            print("✓ COREPGenerator initialized")
        except Exception as e:
            print(f"❌ Generator init failed: {e}")
    else:
        print("❌ COREPGenerator unavailable or no API key")

    print(f"📊 Allowed templates: {settings.allowed_templates}")
    print("="*70 + "\n")
    
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
    """Initialize the vector store with documents"""
    global vector_store_manager, retriever, is_initialized
    
    try:
        # Check if data directory exists
        data_dir = "./data/raw"
        if not os.path.exists(data_dir):
            return {
                "status": "error",
                "message": f"Data directory not found: {data_dir}",
                "note": "Create the directory and add your PDF documents"
            }
        
        # List files
        files = os.listdir(data_dir)
        print(f"📁 Found {len(files)} files in data/raw:")
        for file in files:
            print(f"   - {file}")
        
        # Load documents
        loader = DocumentLoader(data_dir)
        documents = loader.load_pdfs()
        
        if not documents:
            return {
                "status": "error",
                "message": "No PDF documents found in data/raw directory",
                "note": "Add your regulatory PDF documents to the data/raw folder"
            }
        
        print(f"📄 Loaded {len(documents)} document pages")
        
        # Chunk documents
        chunker = DocumentChunker()
        chunked_docs = chunker.chunk_documents(documents)
        print(f"✂️ Created {len(chunked_docs)} chunks")
        
        # Create vector store
        if not vector_store_manager:
            vector_store_manager = ChromaVectorStore(settings.chroma_persist_dir)
            if ChromaVectorStore is None:
                return {
                "status": "error",
                "message": "ChromaVectorStore not available (import failed at startup)"
                }

        print(f"🗄️ Creating vector store...")
        vectorstore = vector_store_manager.create_store(chunked_docs)
        retriever = RegulatoryRetriever(vectorstore)
        is_initialized = True
        
        return {
            "status": "success",
            "message": f"Vector store initialized with {len(chunked_docs)} chunks from {len(documents)} pages",
            "documents_loaded": len(documents),
            "chunks_created": len(chunked_docs),
            "files_processed": len(files)
        }
        
    except Exception as e:
        print(f"❌ Initialization error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": f"Initialization failed: {str(e)}"
        }
    
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


if __name__ == "__main__":
    print("\nStarting Uvicorn...")
    print("Recommended command: python -m main   (better for relative imports)")
    print("Or: python main.py\n")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

