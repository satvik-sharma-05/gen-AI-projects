# reset_vectorstore.py
import os
import shutil
from pathlib import Path

def reset_vectorstore():
    """Completely reset the vector store"""
    chroma_dir = "./chroma_db"
    data_dir = "./data/raw"
    
    print("=" * 60)
    print("🔄 Resetting ReguLens Vector Store")
    print("=" * 60)
    
    # Remove chroma database
    if os.path.exists(chroma_dir):
        print(f"🗑️  Removing existing vector store: {chroma_dir}")
        try:
            shutil.rmtree(chroma_dir)
            print("   ✓ Removed successfully")
        except Exception as e:
            print(f"   ❌ Error removing: {e}")
    else:
        print(f"ℹ No existing vector store found at: {chroma_dir}")
    
    # Check data directory
    if os.path.exists(data_dir):
        files = os.listdir(data_dir)
        print(f"\n📁 Data directory contains {len(files)} files:")
        for file in files:
            print(f"   - {file}")
    else:
        print(f"\n❌ Data directory not found: {data_dir}")
        print("   Please create it and add PDF documents")
    
    print("\n✅ Reset complete!")
    print("   Restart the server and use /initialize endpoint")
    print("=" * 60)

if __name__ == "__main__":
    reset_vectorstore()