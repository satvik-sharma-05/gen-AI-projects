# ingestion/load_docs.py - Enhanced version
import os
from typing import List
from langchain_community.document_loaders import PyPDFLoader, UnstructuredPDFLoader
from langchain_community.document_loaders.pdf import PyPDFDirectoryLoader
from langchain_core.documents import Document

class DocumentLoader:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
    
    def load_pdfs(self) -> List[Document]:
        """
        Load all PDF documents from the data directory
        """
        documents = []
        
        if not os.path.exists(self.data_dir):
            print(f"❌ Data directory does not exist: {self.data_dir}")
            return documents
        
        # Get all PDF files
        pdf_files = [f for f in os.listdir(self.data_dir) if f.lower().endswith('.pdf')]
        
        if not pdf_files:
            print(f"❌ No PDF files found in {self.data_dir}")
            return documents
        
        print(f"📚 Found {len(pdf_files)} PDF files:")
        for pdf_file in pdf_files:
            print(f"   - {pdf_file}")
        
        # Load each PDF
        for pdf_file in pdf_files:
            try:
                pdf_path = os.path.join(self.data_dir, pdf_file)
                print(f"\n📄 Loading: {pdf_file}")
                
                # Try PyPDFLoader first
                try:
                    loader = PyPDFLoader(pdf_path)
                    pdf_docs = loader.load()
                    print(f"   ✓ Loaded with PyPDFLoader: {len(pdf_docs)} pages")
                except Exception as e1:
                    print(f"   ⚠ PyPDFLoader failed: {e1}")
                    # Try alternative loader
                    try:
                        loader = UnstructuredPDFLoader(pdf_path, mode="elements")
                        pdf_docs = loader.load()
                        print(f"   ✓ Loaded with UnstructuredPDFLoader: {len(pdf_docs)} pages")
                    except Exception as e2:
                        print(f"   ❌ All loaders failed for {pdf_file}: {e2}")
                        continue
                
                # Add source metadata
                for doc in pdf_docs:
                    doc.metadata["source"] = pdf_file
                    # Try to extract page number
                    if "page" not in doc.metadata:
                        doc.metadata["page"] = "1"
                
                documents.extend(pdf_docs)
                
            except Exception as e:
                print(f"   ❌ Error loading {pdf_file}: {e}")
        
        print(f"\n✅ Total pages loaded: {len(documents)}")
        return documents