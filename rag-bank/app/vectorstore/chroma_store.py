import os
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceInferenceAPIEmbeddings


class ChromaVectorStore:
    def __init__(self, persist_directory: str):
        self.persist_directory = persist_directory

        self.embeddings = HuggingFaceInferenceAPIEmbeddings(
            api_key=os.environ["HF_API_KEY"],
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

        from uuid import uuid4

    def create_store(self, documents):
        texts = []
        metadatas = []
        ids = []

        for doc in documents:
            if not doc.page_content or not doc.page_content.strip():
                continue

            texts.append(doc.page_content)
            metadatas.append(doc.metadata or {})
            ids.append(str(uuid4()))

        return Chroma.from_texts(
            texts=texts,
            metadatas=metadatas,
            ids=ids,
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
