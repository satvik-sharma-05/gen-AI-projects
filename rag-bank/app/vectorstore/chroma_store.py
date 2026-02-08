import os
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEndpointEmbeddings


class ChromaVectorStore:
    def __init__(self, persist_directory: str):
        self.persist_directory = persist_directory

        self.embeddings = HuggingFaceEndpointEmbeddings(
            huggingfacehub_api_token=os.environ["HF_API_KEY"],
            model="sentence-transformers/all-MiniLM-L6-v2"
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
