"""
Document Retrieval Service

Handles document search and retrieval using vector similarity (pgvector).
Provides semantic search functionality for RAG (Retrieval-Augmented Generation).
"""

import logging
from typing import List, Optional, Tuple
from uuid import UUID

from supabase import Client

from app.clients.ai_client import AIClient

logger = logging.getLogger(__name__)


class DocumentChunk:
    """Represents a document chunk retrieved from vector search."""
    
    def __init__(
        self,
        id: UUID,
        document_id: UUID,
        content: str,
        chunk_index: int,
        metadata: dict,
        similarity: float = 0.0,
    ):
        self.id = id
        self.document_id = document_id
        self.content = content
        self.chunk_index = chunk_index
        self.metadata = metadata
        self.similarity = similarity


class DocumentRetrievalService:
    """
    Service for document search and retrieval using vector embeddings.
    
    Provides semantic search over document chunks stored in PostgreSQL
    with pgvector extension.
    """
    
    def __init__(self, supabase: Client, ai_client: AIClient):
        """
        Initialize document retrieval service.
        
        Args:
            supabase: Supabase client for database access
            ai_client: AI client for generating query embeddings
        """
        self.supabase = supabase
        self.ai_client = ai_client
    
    async def search_documents(
        self,
        project_id: UUID,
        query: str,
        top_k: int = 5,
        similarity_threshold: float = 0.7,
    ) -> List[DocumentChunk]:
        """
        Search for relevant document chunks using semantic similarity.
        
        Process:
        1. Generate embedding for the query
        2. Perform vector similarity search in document_chunks table
        3. Return top-k most similar chunks above threshold
        
        Args:
            project_id: Project identifier to filter documents
            query: User's search query
            top_k: Number of top results to return (default: 5)
            similarity_threshold: Minimum similarity score (0-1, default: 0.7)
            
        Returns:
            List of DocumentChunk objects ordered by similarity (highest first)
        """
        logger.info(f"Searching documents for project {project_id}, query: '{query[:50]}...'")
        
        try:
            # Step 1: Generate query embedding
            query_embedding = await self._generate_query_embedding(query)
            
            # Step 2: Perform vector similarity search
            # Note: This uses pgvector's cosine similarity (<=>)
            # For now, we'll use a simplified query since pgvector RPC functions
            # need to be set up in Supabase
            
            chunks = await self._vector_search(
                project_id=project_id,
                query_embedding=query_embedding,
                top_k=top_k,
                threshold=similarity_threshold,
            )
            
            logger.info(f"Found {len(chunks)} relevant document chunks")
            return chunks
        
        except Exception as e:
            logger.error(f"Error searching documents: {e}", exc_info=True)
            # Return empty list on error to allow chat to continue
            return []
    
    async def get_document_chunks(
        self,
        document_id: UUID,
    ) -> List[DocumentChunk]:
        """
        Get all chunks for a specific document.
        
        Args:
            document_id: Document identifier
            
        Returns:
            List of DocumentChunk objects ordered by chunk_index
        """
        try:
            response = (
                self.supabase.table("document_chunks")
                .select("*")
                .eq("document_id", str(document_id))
                .order("chunk_index")
                .execute()
            )
            
            chunks = [
                DocumentChunk(
                    id=chunk["id"],
                    document_id=chunk["document_id"],
                    content=chunk["content"],
                    chunk_index=chunk["chunk_index"],
                    metadata=chunk.get("metadata", {}),
                )
                for chunk in response.data
            ]
            
            logger.info(f"Retrieved {len(chunks)} chunks for document {document_id}")
            return chunks
        
        except Exception as e:
            logger.error(f"Error retrieving document chunks: {e}", exc_info=True)
            return []
    
    async def _generate_query_embedding(self, query: str) -> List[float]:
        """Generate embedding vector for search query."""
        logger.debug("Generating query embedding")
        
        try:
            embedding = await self.ai_client.generate_embedding(
                text=query,
                model="openai/text-embedding-3-small",
            )
            return embedding
        
        except Exception as e:
            logger.error(f"Error generating query embedding: {e}")
            raise
    
    async def _vector_search(
        self,
        project_id: UUID,
        query_embedding: List[float],
        top_k: int,
        threshold: float,
    ) -> List[DocumentChunk]:
        """
        Perform vector similarity search using pgvector.
        
        Note: This is a simplified implementation. In production, you would:
        1. Use a Supabase RPC function for efficient vector search
        2. Or use the pgvector operator directly if available
        
        For now, we'll fetch all chunks and do similarity in Python
        (not efficient but works for MVP with limited documents).
        """
        try:
            # Fetch all document chunks for the project
            response = (
                self.supabase.table("document_chunks")
                .select("*")
                .eq("project_id", str(project_id))
                .execute()
            )
            
            if not response.data:
                logger.info(f"No document chunks found for project {project_id}")
                return []
            
            # Calculate cosine similarity for each chunk
            chunks_with_similarity = []
            
            for chunk_data in response.data:
                # Skip chunks without embeddings
                if not chunk_data.get("embedding"):
                    continue
                
                # Calculate cosine similarity
                chunk_embedding = chunk_data["embedding"]
                similarity = self._cosine_similarity(query_embedding, chunk_embedding)
                
                # Filter by threshold
                if similarity >= threshold:
                    chunk = DocumentChunk(
                        id=chunk_data["id"],
                        document_id=chunk_data["document_id"],
                        content=chunk_data["content"],
                        chunk_index=chunk_data["chunk_index"],
                        metadata=chunk_data.get("metadata", {}),
                        similarity=similarity,
                    )
                    chunks_with_similarity.append(chunk)
            
            # Sort by similarity (highest first) and return top-k
            chunks_with_similarity.sort(key=lambda x: x.similarity, reverse=True)
            top_chunks = chunks_with_similarity[:top_k]
            
            logger.info(
                f"Vector search: {len(chunks_with_similarity)} chunks above threshold, "
                f"returning top {len(top_chunks)}"
            )
            
            return top_chunks
        
        except Exception as e:
            logger.error(f"Error in vector search: {e}", exc_info=True)
            return []
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors.
        
        Formula: cos(θ) = (A · B) / (||A|| * ||B||)
        
        Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
        """
        if len(vec1) != len(vec2):
            logger.warning(f"Vector length mismatch: {len(vec1)} vs {len(vec2)}")
            return 0.0
        
        # Dot product
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        
        # Magnitudes
        magnitude1 = sum(a * a for a in vec1) ** 0.5
        magnitude2 = sum(b * b for b in vec2) ** 0.5
        
        # Avoid division by zero
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        # Cosine similarity
        similarity = dot_product / (magnitude1 * magnitude2)
        
        return similarity


def get_document_retrieval_service(
    supabase: Client,
    ai_client: AIClient,
) -> DocumentRetrievalService:
    """
    Factory function for creating DocumentRetrievalService instances.
    
    Used as a FastAPI dependency.
    """
    return DocumentRetrievalService(
        supabase=supabase,
        ai_client=ai_client,
    )

