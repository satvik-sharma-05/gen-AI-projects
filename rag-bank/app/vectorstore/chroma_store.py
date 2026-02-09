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

    def create_store(self, documents):
        """
        Create Chroma store using from_texts (more reliable with Inference API embeddings)
        """
        texts = []
        metadatas = []
        ids = []

        for doc in documents:
            if not doc.page_content or not doc.page_content.strip():
                continue
            texts.append(doc.page_content)
            metadatas.append(doc.metadata or {})
            ids.append(str(uuid4()))  # or use doc.metadata.get('id') if available

        if not texts:
            raise ValueError("No valid texts to embed after filtering")

        print(f"Creating Chroma store with {len(texts)} valid texts...")

        try:
            return Chroma.from_texts(
                texts=texts,
                embedding=self.embeddings,
                metadatas=metadatas,
                ids=ids,
                persist_directory=self.persist_directory,
                collection_name="corep_regulatory_docs"
            )
        except Exception as e:
            print(f"Chroma from_texts failed: {str(e)}")
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