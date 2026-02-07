from langchain_text_splitters import RecursiveCharacterTextSplitter

def chunk_documents(docs):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150
    )

    chunks = []
    for doc in docs:
        splits = splitter.split_text(doc["text"])
        for s in splits:
            chunks.append({
                "text": s,
                "metadata": doc["metadata"]
            })

    return chunks
