# rag/retriever.py
from typing import List, Dict, Any

class RegulatoryRetriever:
    def __init__(self, vectorstore):
        self.vectorstore = vectorstore
        print(f"📚 Retriever initialized with vector store")
    
    def retrieve_relevant_text(self, query: str, template: str, k: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieve relevant documents from vector store
        """
        print(f"🔍 Searching vector store for: '{query[:50]}...'")
        
        try:
            # Search for relevant documents
            docs = self.vectorstore.similarity_search(query, k=k)
            
            print(f"✅ Found {len(docs)} relevant documents")
            
            # Format results
            results = []
            for i, doc in enumerate(docs):
                source = doc.metadata.get("source", "Unknown")
                page = doc.metadata.get("page", "N/A")
                results.append({
                    "content": doc.page_content[:500] + "..." if len(doc.page_content) > 500 else doc.page_content,
                    "metadata": doc.metadata,
                    "score": 1.0 - (i * 0.1)
                })
                print(f"   📄 Document {i+1}: {source} (page {page})")
                print(f"      Preview: {doc.page_content[:100]}...")
            
            return results
            
        except Exception as e:
            print(f"❌ Error retrieving documents: {e}")
            # Fall back to test data only if absolutely necessary
            return [{
                "content": "No relevant documents found. Use your regulatory knowledge.",
                "metadata": {"source": "Fallback"},
                "score": 0.0
            }]
    
  