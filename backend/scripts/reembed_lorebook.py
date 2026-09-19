import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.chroma import get_lorebook_collection

def reembed_lorebook():
    col     = get_lorebook_collection()
    results = col.get(include=["documents", "metadatas", "embeddings"])

    if not results["ids"]:
        print("No lorebook entries found.")
        return

    print(f"Found {len(results['ids'])} entries. Re-embedding is handled on the frontend.")
    print("The following entries need to be re-added via the UI to get new embeddings:")
    print()
    for id, doc, meta in zip(results["ids"], results["documents"], results["metadatas"]):
        print(f"  [{meta.get('type','?')}] {meta.get('title','?')} — tags: {meta.get('tags','')}")
        print(f"  Content: {doc[:80]}...")
        print()

    confirm = input("Delete all entries so they can be re-added with new embeddings? (yes/no): ")
    if confirm.strip().lower() != "yes":
        print("Aborted.")
        return

    col.delete(ids=results["ids"])
    print(f"Deleted {len(results['ids'])} entries.")
    print("Re-add them via the Lorebook UI — embeddings will now use title + tags only.")

if __name__ == "__main__":
    reembed_lorebook()