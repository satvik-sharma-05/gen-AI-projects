import os
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

class ChromaVectorStore:
    def __init__(self, persist_directory: str):
        self.persist_directory = persist_directory

        # LOCAL CPU embeddings (SAFE ON RENDER)
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"}
        )

    def create_store(self, documents: list[Document]):
        valid_docs = [
            d for d in documents
            if d.page_content and d.page_content.strip()
        ]

        if not valid_docs:
            raise ValueError("No valid documents provided")

        print(f"Creating Chroma store with {len(valid_docs)} documents...")

        return Chroma.from_documents(
            documents=valid_docs,
            embedding=self.embeddings,
            persist_directory=self.persist_directory,
            collection_name="corep_regulatory_docs"
        )

    def load_store(self):
        return Chroma(
            persist_directory=self.persist_directory,
            embedding_function=self.embeddings,
            collection_name="corep_regulatory_docs"
        )

    def store_exists(self):
        return os.path.exists(self.persist_directory)
