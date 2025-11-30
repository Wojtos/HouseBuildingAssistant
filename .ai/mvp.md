# Main Problem

Building a house is an overwhelming, multi-year process that requires specialized knowledge across diverse domains (legal, engineering, finance, design) that no single person typically possesses. General AI models lack the specific context of the user's plot and budget, while hiring human consultants for every small question is prohibitively expensive.

# Minimum Viable Product (MVP)

- **Web-Based Chat Interface**: A responsive web app with user authentication (Firebase) to save progress.
- **Orchestrator Agent**: A smart routing system that directs queries to one of N specialized sub-agents.
- **N Specialized Sub-Agents**: Experts in distinct phases (e.g., Permitting, Foundation, Financing) grounded in Google Search.
- **Project Memory (RAG)**: A Firestore-backed system to store and retrieve specific project facts (e.g., "Plot is 800sqm", "Budget is $450k").
- **Iterative Guidance**: The ability to guide a user from finding a plot to furnishing the home.

# Out of Scope (for MVP)

- **Real-Time/Low-Latency Responses**: High latency is acceptable to favor depth and accuracy.
- **Native Mobile App**: The focus is on a responsive web application first.
- **Direct Marketplace/Hiring**: The app advises on how to hire contractors but does not facilitate the transaction or payments.
- **Physical Document Processing**: Automated analysis of complex blueprints/PDFs is excluded (unless simple text extraction).

# Success Criteria

- **90% Routing Accuracy**: The Orchestrator correctly identifies the user's intent and routes to the correct specialist without manual correction.
- **Context Retention**: The system successfully answers questions using data stored 5+ turns ago (e.g., remembering the budget set in step 1).
- **User Progression**: Users successfully move from one phase to the next (e.g., from "Land Search" to "Permitting") using the app's guidance.
