# Build a self-hosted Model Workshop Manager PWA

You are an expert full-stack engineer. Build a production-quality self-hosted web application for managing my scale-model hobby.

The application will run on my own home server ("Technest") using Docker.

I want a modern PWA that works well on both desktop and mobile.

## 1. Main goal

Build a personal "Model Workshop Manager" where I can manage:

1. Model kits I own
2. Model kits I want to build
3. Builds/projects I have started or completed
4. My paint inventory
5. Tools and modelling supplies
6. Paints required by specific models
7. Shopping list / missing supplies
8. Photos and build progress
9. Build notes and history

The application should minimize manual data entry by using external catalog data wherever legally and technically possible.

The application should distinguish clearly between:

- GLOBAL CATALOG DATA
- MY PERSONAL INVENTORY
- MY BUILDS / PROJECTS

For example:

Global catalog:

Revell 05239
Smit Houston
1:200

My inventory:

I own this kit: yes
Condition: unbuilt

Build:

Started: 2026-08-25
Status: in progress
Progress: 80%

---

# 2. IMPORTANT: research before implementation

Before writing substantial code, investigate currently available data sources and APIs for:

- Revell model kits
- Revell paints
- Tamiya model kits
- Tamiya paints
- AK Interactive paints
- Scale model metadata
- Model instruction PDFs
- Paint requirements from model instructions
- Barcode/EAN/GTIN lookup if useful
- Scalemates or similar databases

Research the current situation rather than assuming APIs exist.

For every candidate source determine:

- Is there an official API?
- Is there a public API?
- Is scraping technically possible?
- Is scraping allowed by the site's terms?
- Is the data redistributable?
- Can the data be imported into a local personal database?
- Are there rate limits?
- What information can realistically be extracted?

Do NOT build the application around an undocumented API without clearly identifying the risks.

Prefer official manufacturer data where available.

If a source cannot legally or reliably be used for automated ingestion, do not depend on it.

Instead design the application so that data can be imported later through:

- CSV
- JSON
- manual import
- PDF/manual parsing
- optional connectors

Create an extensible "data provider / importer" architecture.

---

# 3. Tech stack

Use:

Frontend:

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Zod
- vite-plugin-pwa

Backend:

- Node.js
- TypeScript
- Fastify
- Drizzle ORM
- SQLite

Infrastructure:

- Docker
- Docker Compose
- Nginx-compatible reverse proxy
- persistent volumes

Use strict TypeScript.

Use clean modular architecture.

Do not introduce unnecessary frameworks or dependencies.

---

# 4. Architecture

Use this basic architecture:

Browser
↓
PWA React frontend
↓
Fastify REST API
↓
Drizzle ORM
↓
SQLite

Images/files should NOT be stored as blobs in SQLite.

Use filesystem storage such as:

/data
  /database
    workshop.db

  /uploads
    /projects
      /{projectId}
        image1.jpg
        image2.jpg

  /backups

Store only metadata/path references in SQLite.

Make all persistent data reside in Docker volumes.

---

# 5. Core domain model

Design a proper relational data model.

At minimum:

## Manufacturers

- id
- name
- slug
- website
- created_at
- updated_at

## Paints

- id
- manufacturer_id
- product_code
- name
- type
- finish
- size_ml
- color_hex (optional)
- color_family
- notes
- source
- source_url
- created_at
- updated_at

Paint types should support examples such as:

- Acrylic
- Enamel
- Lacquer
- Primer
- Wash
- Panel Liner
- Metallic
- Weathering
- Other

## Models

- id
- manufacturer_id
- kit_number
- name
- scale
- category
- difficulty
- part_count
- description
- source
- source_url
- image_url
- instruction_url
- created_at
- updated_at

## Model paints

Relationship between a model and required paints.

Include:

- model_id
- paint_id
- usage/purpose
- optional instruction reference
- optional confidence/source

Example:

Revell 05239
→ Revell 05 White
→ Hull

## Owned models

This represents MY physical inventory.

Include:

- model_id
- owned
- quantity
- condition
- storage_location
- purchase_date
- purchase_price
- notes

## Paint inventory

This represents paints I physically own.

Include:

- paint_id
- quantity
- fill_level
- status
- storage_location
- notes

Fill level examples:

- Full
- Mostly Full
- Half
- Low
- Empty

## Projects / Builds

- id
- model_id
- name
- status
- progress_percent
- started_at
- completed_at
- notes

Statuses:

- Planned
- In Progress
- On Hold
- Completed
- Abandoned

## Project paints

Track which paints were actually used on a build.

- project_id
- paint_id
- purpose
- notes

## Build log

- id
- project_id
- created_at
- title
- description

## Project photos

- id
- project_id
- filename
- original_filename
- caption
- taken_at
- created_at

## Shopping list

- id
- paint_id or supply reference
- description
- quantity
- priority
- purchased
- created_at
- purchased_at

## Tools / supplies

Create a generic inventory system so later I can track:

- brushes
- tweezers
- knives
- sanding tools
- cement
- primer
- masking tape
- weathering products
- airbrush equipment
- etc.

---

# 6. Critical distinction: Catalog vs Inventory

This is one of the most important architectural requirements.

DO NOT mix catalog information with personal ownership.

Example:

Catalog:

"Revell 05 White"

Personal inventory:

"I own 1 bottle of Revell 05 White, approximately 70% remaining."

Same with models:

Catalog:

"Revell 05239 Smit Houston"

Personal inventory:

"I own this kit."

Build:

"I started building it on 2026-08-25 and it is currently 80% complete."

The data model must support this cleanly.

---

# 7. Dashboard

Create a useful dashboard rather than a generic admin dashboard.

Show:

- total model kits
- kits currently being built
- completed builds
- planned builds
- total paints
- low/empty paints
- missing paints for active builds
- recent build activity
- recently added models
- recently completed builds

Example:

Model kits
12

In progress
3

Completed
7

Paints
46

Low stock
5

Recent activity:

Smit Houston
Painted upper hull
29 Aug 2026

---

# 8. Models UI

Create:

/models

Features:

- search
- filtering
- sorting
- manufacturer filter
- scale filter
- category filter
- status filter
- grid/list view

Model card should show:

- manufacturer
- kit number
- model name
- scale
- status
- image
- progress if currently being built

Model detail page:

/models/:id

Show:

- model information
- source information
- instructions
- required paints
- which required paints I own
- missing paints
- owned quantity
- projects/build history
- photos

---

# 9. "Add Model" workflow

Make adding models extremely easy.

Support:

1. Search catalog
2. Search by manufacturer + kit number
3. Add existing catalog model to personal inventory
4. Create a model manually if no catalog entry exists

Example:

User enters:

05239

Application searches available catalog sources.

Result:

Revell 05239
Smit Houston
1:200

User clicks:

"Add to my models"

No duplicate catalog record should be created.

---

# 10. Paint inventory UI

Create:

/paints

Features:

- search
- manufacturer filter
- type filter
- finish filter
- color family
- stock status

Each paint should have a visual color representation where reliable color data is available.

Paint detail:

- manufacturer
- product code
- name
- type
- finish
- size
- my quantity
- fill level
- models that require it
- projects where I used it

---

# 11. Add paint workflow

I should NOT need to manually type all paint information.

Support:

Search catalog:

"Revell 05"

Result:

Revell 05 White
Acrylic
Matt

Button:

"Add to my inventory"

Then ask only for personal inventory details:

- quantity
- fill level
- location
- notes

Allow manual creation when catalog data is unavailable.

---

# 12. Build workflow

Create:

/projects

Each project represents a specific build.

Example:

Revell 05239 Smit Houston

Status:
In Progress

Progress:
80%

Started:
25 Aug 2026

Pages:

- Overview
- Paints
- Build Log
- Photos
- Notes

---

# 13. Automatic paint availability analysis

This is a key feature.

For each model/project compare required paints against my inventory.

Example:

Required paints:

✓ Revell 05 White
✓ Revell 09 Anthracite
✓ Revell 15 Yellow
❌ Revell 54 Brown

Show:

6 / 7 available

83% paint coverage

Also allow the user to mark a requirement as:

- required
- optional
- weathering
- already substituted

---

# 14. Shopping list integration

Automatically offer missing supplies for an active build.

Example:

Smit Houston

Missing:

- Revell 54 Brown
- Tamiya Panel Line Accent Color Black

Button:

"Add missing items to shopping list"

The shopping list should allow marking an item purchased.

When a paint is purchased, provide a convenient workflow:

"Add purchased paint to inventory"

---

# 15. Build log

Make logging extremely fast.

A user should be able to press:

"+ Add progress"

and enter:

Title:
Painted upper hull

Description:
Applied first coat of blue.

Photos:
Upload images

The system records timestamp automatically.

Show timeline:

29 Aug 2026
Painted upper hull

28 Aug 2026
Assembled bridge

27 Aug 2026
Started hull

---

# 16. Photography

Photos are important.

Support:

- upload from phone
- drag & drop on desktop
- multiple images
- captions
- gallery
- full-screen image viewer

Optimize uploaded images for storage where appropriate.

Do not destroy the original unless clearly documented.

Generate thumbnails if useful.

---

# 17. PWA

The application must be a real PWA.

Support:

- installation on mobile
- installation on desktop
- application icon
- standalone display
- responsive layout
- basic offline shell

For offline behavior, do not over-engineer initially.

The first version should at minimum load correctly offline and clearly communicate when API data is unavailable.

---

# 18. Responsive design

Primary use cases:

Desktop at my workbench

and

Phone while shopping / building.

Mobile UI should make these workflows especially easy:

- Add paint
- Search paint
- Search model
- Add build log
- Take/upload photo
- Check missing paints
- Shopping list

Avoid desktop-only tables.

---

# 19. Authentication

Initially this is a single-user private application.

Do not implement a complex authentication system unless necessary.

However:

- structure backend so authentication can be added later
- never expose the API publicly without considering security
- allow deployment behind reverse proxy
- document how to secure it

---

# 20. Backup

Create a simple backup strategy.

The application should provide a script or command that backs up:

- SQLite database
- uploaded images

Example:

npm run backup

or:

./scripts/backup.sh

Document how to restore the application.

---

# 21. Import architecture

Create a generic importer interface.

Example conceptual design:

interface CatalogProvider {
  searchModels(query: string): Promise<ModelResult[]>
  getModel(id: string): Promise<ModelDetails>
  searchPaints(query: string): Promise<PaintResult[]>
}

Then implement providers separately.

Possible providers may include:

- Revell official data
- Tamiya official data
- AK Interactive official data
- Scalemates or other sources only where appropriate and legally usable
- local CSV/JSON imports

Do not tightly couple the core application to one provider.

---

# 22. Data provenance

For imported catalog data, track:

- source
- source URL
- imported_at
- last_synced_at

Example:

source:
Revell

source_url:
https://...

This allows future updates and debugging.

---

# 23. Seed data

Create initial seed data for development.

Use a small, realistic dataset including:

Models:

- Revell 05239 Smit Houston

Paints:

- Revell 05 White
- Revell 09 Anthracite
- Revell 15 Yellow
- AK Interactive AK677 Neutral Dark Gray
- Tamiya examples

Do not invent uncertain model-specific paint requirements.

Clearly mark sample/development data.

---

# 24. API

Use REST.

Create endpoints roughly along these lines:

GET /api/models
GET /api/models/:id
POST /api/models
PATCH /api/models/:id
DELETE /api/models/:id

GET /api/paints
GET /api/paints/:id
POST /api/paints
PATCH /api/paints/:id
DELETE /api/paints/:id

GET /api/inventory/models
POST /api/inventory/models

GET /api/inventory/paints
POST /api/inventory/paints
PATCH /api/inventory/paints/:id

GET /api/projects
GET /api/projects/:id
POST /api/projects
PATCH /api/projects/:id

GET /api/projects/:id/log
POST /api/projects/:id/log

GET /api/projects/:id/photos
POST /api/projects/:id/photos

GET /api/shopping-list

etc.

Validate requests with Zod.

---

# 25. Testing

Include meaningful automated tests.

Backend:

- unit tests
- API tests
- database tests

Frontend:

- component tests for important flows
- tests for paint availability logic
- tests for inventory matching

Especially test:

"required paints vs owned paints"

because this is core functionality.

---

# 26. Code quality

Requirements:

- strict TypeScript
- no any unless unavoidable
- clear domain boundaries
- reusable components
- no duplicated business logic
- no giant files
- meaningful error handling
- loading states
- empty states
- error states
- accessible controls

Do not build fake functionality just to make the UI look complete.

All buttons should either work or clearly be marked as future functionality.

---

# 27. UI style

The application should feel like a modern hobby/workshop tool.

Not like an enterprise CRM.

Use:

- clean
- compact
- practical
- information-dense where appropriate
- excellent mobile usability
- dark mode + light mode

Use shadcn/ui components where useful.

Avoid excessive animations.

---

# 28. Development process

Work in phases.

## Phase 1

First produce:

- architecture proposal
- database schema
- data-source research
- recommended external data sources
- risks/limitations
- folder structure

Then implement:

- monorepo/project structure
- database
- backend
- frontend
- Docker setup
- PWA

## Phase 2

Implement:

- models
- paints
- personal inventory
- basic dashboard

## Phase 3

Implement:

- projects/builds
- build logs
- photos
- paint requirement matching
- shopping list

## Phase 4

Implement:

- catalog importers
- synchronization
- data provenance
- CSV/JSON import

## Phase 5

Polish:

- UX
- mobile
- PWA
- loading/error states
- tests
- backup/restore
- documentation

Do not skip directly to Phase 5.

---

# 29. Docker deployment

Provide:

docker-compose.yml

Services should be simple.

For example:

frontend
backend

with persistent volumes such as:

workshop-data

Document:

- how to start
- how to stop
- how to update
- where database is stored
- where photos are stored
- how to backup
- how to restore

The app must be suitable for deployment on a Linux home server.

---

# 30. Environment variables

Provide:

.env.example

At minimum:

DATABASE_URL
DATA_DIR
UPLOAD_DIR
NODE_ENV

For external providers, use separate environment variables.

Never hardcode API keys.

---

# 31. Documentation

Create:

README.md

Include:

- architecture
- local development
- Docker deployment
- database
- backups
- data providers
- import process
- adding a new catalog provider
- security considerations

Also document any external data source restrictions.

---

# 32. Important implementation principle

Do not over-engineer.

This is a personal hobby application.

Prefer:

- SQLite over PostgreSQL
- REST over GraphQL
- local filesystem over object storage
- simple Docker deployment
- simple authentication strategy
- simple import pipelines

But structure the code so it can grow later.

---

# 33. Future AI features

Design the architecture so these can be added later, but DO NOT implement them in the first MVP unless there is a clean low-cost way to do so.

Future features:

1. Photograph model box → identify kit
2. Photograph paint bottle → identify paint
3. Upload instruction PDF → extract required paints
4. Automatically create shopping list
5. Suggest weathering products
6. Generate build summary
7. Search my build history using natural language

Potential future workflow:

Take photo of Revell box

↓

AI identifies:

Revell 05239
Smit Houston
1:200

↓

Search catalog

↓

Create owned model

↓

Fetch/associate instruction data

↓

Extract paint requirements

↓

Compare to my paint inventory

↓

Show missing paints

---

# 34. What I expect from you

Act as the lead engineer.

Do not just generate a prototype.

Build an actually runnable application.

When there are architectural decisions, choose the simplest robust solution.

When external data availability is uncertain, investigate first rather than inventing APIs.

When scraping or using external data has legal/technical concerns, document them and implement an alternative.

At the end of each implementation phase:

1. Summarize what was implemented
2. List files created/changed
3. List commands to run
4. List known limitations
5. Identify the next logical phase

Start by researching the current data-source landscape and then propose the architecture and schema before implementing the application.