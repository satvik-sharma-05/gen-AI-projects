import os
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceInferenceAPIEmbeddings
from langchain_core.documents import Document


class ChromaVectorStore:
    def __init__(self, persist_directory: str):
        self.persist_directory = persist_directory

        hf_api_key = os.environ.get("HF_API_KEY")
        if not hf_api_key:
            raise RuntimeError("HF_API_KEY not set")

        # REMOTE embeddings (Render-safe)
        self.embeddings = HuggingFaceInferenceAPIEmbeddings(
            api_key=hf_api_key,
            model_name="sentence-transformers/all-MiniLM-L6-v2"
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
