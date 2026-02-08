import os
from typing import List
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings


class ChromaVectorStore:
    def __init__(self, persist_dir: str):
        self.persist_dir = persist_dir
        os.makedirs(persist_dir, exist_ok=True)
        self._embeddings = None  # lazy init

    @property
    def embeddings(self):
        if self._embeddings is None:
            self._embeddings = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-MiniLM-L6-v2",
                model_kwargs={"device": "cpu"}
            )
        return self._embeddings

    def create_store(self, documents: List[Document]) -> Chroma:
        return Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=self.persist_dir
        )

    def load_store(self) -> Chroma:
        return Chroma(
            persist_directory=self.persist_dir,
            embedding_function=self.embeddings
        )

    def store_exists(self) -> bool:
        return os.path.exists(os.path.join(self.persist_dir, "chroma.sqlite3"))
