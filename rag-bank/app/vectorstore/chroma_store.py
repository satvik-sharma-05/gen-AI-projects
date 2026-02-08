import os
from uuid import uuid4
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceInferenceAPIEmbeddings
from langchain_core.documents import Document

class ChromaVectorStore:
    def __init__(self, persist_directory: str):
        self.persist_directory = persist_directory
        
        hf_api_key = os.environ.get("HF_API_KEY")
        if not hf_api_key:
            raise ValueError("HF_API_KEY environment variable is required for HuggingFace embeddings")
        
        self.embeddings = HuggingFaceInferenceAPIEmbeddings(
            api_key=hf_api_key,
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

    def create_store(self, documents: list[Document]):
        """
        Create Chroma vector store from LangChain Document objects.
        Uses from_documents for safety and simplicity.
        """
        if not documents:
            raise ValueError("No documents provided to create store")

        # Optional: filter again here (though already done in main.py)
        valid_docs = [
            doc for doc in documents
            if hasattr(doc, "page_content") and doc.page_content and doc.page_content.strip()
        ]

        if not valid_docs:
            raise ValueError("No valid documents after filtering")

        print(f"Creating Chroma store with {len(valid_docs)} documents...")

        try:
            return Chroma.from_documents(
                documents=valid_docs,
                embedding=self.embeddings,
                persist_directory=self.persist_directory,
                collection_name="corep_regulatory_docs",  # explicit name
                ids=[str(uuid4()) for _ in valid_docs]     # optional: custom IDs
            )
        except Exception as e:
            print(f"Chroma creation failed: {str(e)}")
            raise

    def load_store(self):
        """Load existing Chroma store"""
        try:
            return Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embeddings,
                collection_name="corep_regulatory_docs"
            )
        except Exception as e:
            print(f"Failed to load Chroma store: {str(e)}")
            raise

    def store_exists(self):
        """Check if persisted directory exists"""
        return os.path.exists(self.persist_directory)