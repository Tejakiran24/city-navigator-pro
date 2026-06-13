# City Traffic Navigation System

A cloud-deployable smart-city traffic platform demonstrating weighted graph data structures and path-finding algorithms through an interactive route operations dashboard.

## Core capabilities

- Dijkstra, A* Search, Breadth-First Search and Depth-First Search
- Weighted roads using distance, base time and traffic multipliers
- Interactive city graph, route highlighting and visited-node analytics
- Email/password and Google authentication with email verification and recovery
- User profiles, route history, saved routes, favorite locations and notifications
- Traffic analytics, emergency priority routing, alerts and role-gated administration
- Responsive light/dark interface for mobile, tablet and desktop

## Architecture

- **Web application:** React 19, TypeScript, TanStack Start/Router, Tailwind CSS 4, Motion
- **Charts:** Recharts
- **Backend:** TanStack server functions running in the managed cloud environment
- **Database and authentication:** Lovable Cloud with row-level access policies
- **Validation:** Zod on server function inputs

No local database or heavy software is required. The project runs and deploys entirely from the online workspace.

## Graph model

Intersections are vertices. Roads are directed or bidirectional edges. Each edge stores distance, base travel time, traffic category and traffic weight. Dijkstra and A* can optimize weighted distance or weighted travel time; BFS and DFS demonstrate unweighted traversal behavior.

## Access control

User-owned searches, routes, favorites, notifications and profiles are isolated by database access policies. Administrative roles are stored separately and validated by a protected database helper. Administrative road, intersection and alert mutations require the admin role.

## Deployment

Use the online workspace's **Publish** action. The application, backend, managed database, authentication and server functions deploy without local installation.