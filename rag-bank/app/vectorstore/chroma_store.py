# rag-bank/app/vectorstore/chroma_store.py

import os
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceInferenceAPIEmbeddings


class ChromaVectorStore:
    def __init__(self, persist_directory: str):
        self.persist_directory = persist_directory

        self.embeddings = HuggingFaceInferenceAPIEmbeddings(
            api_key=os.environ.get("HF_API_KEY"),
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

    def create_store(self, documents):
        return Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=self.persist_directory
        )

    def load_store(self):
        return Chroma(
            persist_directory=self.persist_directory,
            embedding_function=self.embeddings
        )

    def store_exists(self):
        return os.path.exists(self.persist_directory)
