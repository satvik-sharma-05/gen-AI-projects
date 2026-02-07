from langchain_community.vectorstores import Chroma

from langchain_community.embeddings import HuggingFaceEmbeddings

from config import CHROMA_DIR, EMBEDDING_MODEL


def get_vectorstore(chunks=None):
    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL
    )

    # Ingestion phase
    if chunks:
        texts = [c["text"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]

        return Chroma.from_texts(
            texts=texts,
            metadatas=metadatas,
            embedding=embeddings,
            persist_directory=CHROMA_DIR
        )

    # Query phase
    return Chroma(
        persist_directory=CHROMA_DIR,
        embedding_function=embeddings
    )
