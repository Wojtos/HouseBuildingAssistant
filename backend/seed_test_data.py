#!/usr/bin/env python3
"""
Seed test data for endpoint verification
"""

import os
import sys
from datetime import datetime
from uuid import UUID

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from supabase import create_client

# Local Supabase credentials (using service_role key to bypass RLS for seeding)
SUPABASE_URL = "http://127.0.0.1:54321"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# Test IDs
USER_ID = "550e8400-e29b-41d4-a716-446655440000"
PROJECT_ID = "660e8400-e29b-41d4-a716-446655440000"
DOCUMENT_ID = "770e8400-e29b-41d4-a716-446655440000"
CHUNK_ID_1 = "880e8400-e29b-41d4-a716-446655440000"
CHUNK_ID_2 = "880e8400-e29b-41d4-a716-446655440001"


def main():
    print("🌱 Seeding test data into local Supabase...")

    # Create Supabase client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    try:
        # 1. Insert test user profile
        print("\n1. Creating test user profile...")
        profile_data = {
            "id": USER_ID,
            "full_name": "Test User",
            "preferred_units": "METRIC",
            "language": "en",
        }

        try:
            response = supabase.table("profiles").upsert(profile_data).execute()
            print(f"   ✅ Profile created: {USER_ID}")
        except Exception as e:
            print(f"   ⚠️  Profile: {e}")

        # 2. Insert test project
        print("\n2. Creating test project...")
        project_data = {
            "id": PROJECT_ID,
            "user_id": USER_ID,
            "name": "Test House Project",
            "location": "San Francisco, CA",
            "current_phase": "DESIGN",
        }

        try:
            response = supabase.table("projects").upsert(project_data).execute()
            print(f"   ✅ Project created: {PROJECT_ID}")
        except Exception as e:
            print(f"   ⚠️  Project: {e}")

        # 3. Insert project memory
        print("\n3. Creating project memory...")
        memory_data = {
            "project_id": PROJECT_ID,
            "data": {
                "FINANCE": {"total_budget": 500000, "currency": "USD"},
                "DESIGN": {"style": "modern", "bedrooms": 3},
                "LAND": {},
                "PERMITTING": {},
                "SITE_PREP": {},
                "SHELL_SYSTEMS": {},
                "PROCUREMENT": {},
                "FINISHES": {},
                "GENERAL": {},
            }
        }

        try:
            response = supabase.table("project_memory").upsert(memory_data).execute()
            print(f"   ✅ Project memory created")
        except Exception as e:
            print(f"   ⚠️  Memory: {e}")

        # 4. Insert test document
        print("\n4. Creating test document...")
        document_data = {
            "id": DOCUMENT_ID,
            "project_id": PROJECT_ID,
            "name": "blueprint.pdf",
            "storage_path": "test/blueprint.pdf",
            "file_type": "application/pdf",
            "processing_state": "COMPLETED",
        }

        try:
            response = supabase.table("documents").upsert(document_data).execute()
            print(f"   ✅ Document created: {DOCUMENT_ID}")
        except Exception as e:
            print(f"   ⚠️  Document: {e}")

        # 5. Insert test document chunks
        print("\n5. Creating document chunks...")
        chunks = [
            {
                "id": CHUNK_ID_1,
                "document_id": DOCUMENT_ID,
                "project_id": PROJECT_ID,
                "content": "Foundation specifications: 12-inch concrete slab with rebar grid.",
                "chunk_index": 0,
                "metadata": {"page": 1},
            },
            {
                "id": CHUNK_ID_2,
                "document_id": DOCUMENT_ID,
                "project_id": PROJECT_ID,
                "content": "Framing: 2x6 studs at 16 inches on center.",
                "chunk_index": 1,
                "metadata": {"page": 2},
            },
        ]

        try:
            response = supabase.table("document_chunks").upsert(chunks).execute()
            print(f"   ✅ Created {len(chunks)} document chunks")
        except Exception as e:
            print(f"   ⚠️  Chunks: {e}")

        print("\n✅ Test data seeded successfully!")
        print(f"\n📋 Test IDs:")
        print(f"   User ID:     {USER_ID}")
        print(f"   Project ID:  {PROJECT_ID}")
        print(f"   Document ID: {DOCUMENT_ID}")

    except Exception as e:
        print(f"\n❌ Error seeding data: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
