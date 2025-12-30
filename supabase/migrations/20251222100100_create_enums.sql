-- migration: create_enums
-- description: Create custom ENUM types for the HomeBuild AI Assistant
-- affected: custom types
-- dependencies: none
--
-- This migration creates all custom ENUM types used throughout the application
-- for type safety and data validation at the database level.

-- Track the current phase of the house building project
-- These phases represent the standard construction lifecycle from land acquisition
-- through project completion
create type public.construction_phase as enum (
    'LAND_SELECTION',        -- Initial phase: searching and selecting land
    'FEASIBILITY',           -- Assessing project viability (budget, zoning, etc.)
    'PERMITTING',            -- Obtaining necessary permits and approvals
    'DESIGN',                -- Architectural and engineering design phase
    'SITE_PREP',             -- Site preparation and clearing
    'FOUNDATION',            -- Foundation construction
    'SHELL_SYSTEMS',         -- Framing, roofing, and core systems installation
    'PROCUREMENT',           -- Material and fixture procurement
    'FINISHES_FURNISHING',   -- Interior finishes and furnishing
    'COMPLETED'              -- Project completion
);

comment on type public.construction_phase is 'Tracks the current construction phase of a building project';

-- Track the state of document processing (OCR/Embedding)
-- Documents go through multiple processing stages before they are searchable
create type public.processing_state as enum (
    'UPLOADED',    -- Document has been uploaded to storage
    'PROCESSING',  -- Document is being processed (OCR, chunking, embedding)
    'COMPLETED',   -- Processing completed successfully
    'FAILED'       -- Processing failed (error_message will contain details)
);

comment on type public.processing_state is 'Tracks the processing state of uploaded documents through OCR and embedding pipeline';

-- Measurement units for project tracking
-- Allows users to work with their preferred measurement system
create type public.measurement_unit as enum (
    'METRIC',     -- International System (meters, kilograms, etc.)
    'IMPERIAL'    -- US customary units (feet, pounds, etc.)
);

comment on type public.measurement_unit is 'User preference for measurement units in the application';



