import os
from uuid import uuid4
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

class ChromaVectorStore:
    def __init__(self, persist_directory: str):
        self.persist_directory = persist_directory

        # Embedding function (used for both indexing and querying)
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

    def create_store(self, documents):
        """
        Create Chroma vector store from LangChain Document objects.
        Uses from_documents to handle embeddings automatically.
        """
        if not documents:
            raise ValueError("No documents provided to create store")

        print(f"Creating Chroma store with {len(documents)} documents...")

        return Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=self.persist_directory,
            collection_name="corep_docs"
        )

    def load_store(self):
        """Load existing Chroma store"""
        return Chroma(
            persist_directory=self.persist_directory,
            embedding_function=self.embeddings
        )

    def store_exists(self):
        """Check if persisted directory exists"""
        return os.path.exists(self.persist_directory)