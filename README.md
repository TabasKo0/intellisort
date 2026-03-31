# IntelliSort 🌿

**IntelliSort** is an AI-powered waste classification web application that helps users sort waste correctly and sustainably. Upload a photo of any waste item and IntelliSort will instantly identify what it is, how to dispose of it, and which bin it belongs in.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Backend](#backend)
   - [Flask API](#flask-api)
   - [Two-Stage Classification Pipeline](#two-stage-classification-pipeline)
   - [Stage 1 – YOLO Object Detector](#stage-1--yolo-object-detector)
   - [Stage 2 – ResNet50 Classifier](#stage-2--resnet50-classifier)
   - [Pipeline Orchestration](#pipeline-orchestration)
   - [Configuration Parameters](#configuration-parameters)
   - [Waste Categories & Disposal Mapping](#waste-categories--disposal-mapping)
4. [Frontend](#frontend)
   - [Pages](#pages)
   - [Components](#components)
   - [Authentication & Middleware](#authentication--middleware)
5. [Database Schema](#database-schema)
6. [Setup & Installation](#setup--installation)
   - [Prerequisites](#prerequisites)
   - [Backend Setup](#backend-setup)
   - [Frontend Setup](#frontend-setup)
   - [Environment Variables](#environment-variables)
7. [API Reference](#api-reference)
8. [Tech Stack](#tech-stack)

---

## Project Overview

IntelliSort combines computer vision and deep learning to make waste disposal easy and accessible. A user takes a photo of an item, uploads it through the web interface, and receives:

- The **waste category** (e.g., Plastic, Glass, Cardboard)
- The **recommended disposal method** (Recycle, Compost, Landfill, etc.)
- The **correct bin color** to use
- A **confidence score** showing how certain the AI is
- A **visual bounding box** overlaid on the image, highlighting the detected object

All classification results are stored per user in a Supabase database, enabling personal analytics dashboards and history tracking.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    User's Browser                   │
│              Next.js 16 Frontend (React)            │
│   Auth · Dashboard · Image Upload · Analytics      │
└───────────────────────┬─────────────────────────────┘
                        │  POST /api/classify-waste
                        │  (Next.js API Route)
                        ▼
┌─────────────────────────────────────────────────────┐
│               Next.js API Route Layer               │
│   Authenticates user via Supabase                  │
│   Forwards base64 image to Python backend          │
│   Persists result in Supabase DB                   │
└───────────────────────┬─────────────────────────────┘
                        │  POST /classify
                        │  (HTTP JSON)
                        ▼
┌─────────────────────────────────────────────────────┐
│              Python / Flask Backend                 │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │         Two-Stage Classification Pipeline    │  │
│  │                                              │  │
│  │  Stage 1: YOLO Detector                      │  │
│  │    → Detects & crops waste objects           │  │
│  │                                              │  │
│  │  Stage 2: ResNet50 Classifier                │  │
│  │    → Preprocesses crop (CLAHE + sharpening) │  │
│  │    → Classifies each crop into 8 categories  │  │
│  │    → IDK check: low-confidence → Fallback    │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Supabase (BaaS) │
              │  Auth + Postgres │
              └──────────────────┘
```

---

## Backend

The backend is a **Python Flask** server located in the `backend/` directory. It exposes a REST API that accepts images and returns structured classification results.

### Flask API

**Entry point:** `backend/app.py`

The Flask app initialises the `WastePipeline` at startup (loading both AI models into memory) and exposes two HTTP endpoints.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Returns `{"status": "ok", "pipeline_loaded": true/false}` |
| `/classify` | POST | Accepts a base64-encoded image and returns the classification result |

**`/classify` Request body**
```json
{
  "image": "<base64-encoded image, with or without data URI prefix>"
}
```

**`/classify` Response body**
```json
{
  "category": "Plastic",
  "confidence": 0.94,
  "disposal": "Recycle",
  "bin_color": "Blue",
  "all_detections": [
    {
      "bbox": [x1, y1, x2, y2],
      "yolo_confidence": 0.87,
      "yolo_class": "waste",
      "class_name": "Plastic",
      "class_confidence": 0.94,
      "source": "crop"
    }
  ]
}
```

> The `source` field is either `"crop"` (a YOLO-detected bounding box was classified) or `"whole_image"` (YOLO found nothing, so the full image was sent to the classifier as a fallback).

---

### Two-Stage Classification Pipeline

The core intelligence of IntelliSort is a **two-stage pipeline** (`classification_pipeline/pipeline.py`):

```
Input Image (PIL)
       │
       ▼
 ┌─────────────┐
 │  Stage 1    │  WasteDetector – YOLO model
 │  Detect     │  Finds bounding boxes of waste objects
 └──────┬──────┘
        │ detections[]  (or empty)
        │
   ┌────┴──────────────────────────────────────┐
   │  Detections found?                        │
   │                                           │
  YES                                          NO
   │                                           │
   ▼                                           ▼
Crop each bbox              Use the whole image as one crop
   │                                           │
   └───────────────┬───────────────────────────┘
                   │
                   ▼
          ┌────────────────┐
          │    Stage 2     │  WasteClassifier – ResNet50 model
          │    Classify    │  Maps crop → category + confidence
          └────────┬───────┘
                   │
                   ▼
         Best result by class_confidence
                   │
                   ▼
              Return result
```

---

### Stage 1 – YOLO Object Detector

**File:** `backend/classification_pipeline/detector.py`

The `WasteDetector` class wraps an **Ultralytics YOLO** model. It:

1. Loads the YOLO weights from `classification_pipeline/models/detector_model.pt`.
2. Runs inference on the full input image.
3. For every detected bounding box:
   - Extracts the pixel coordinates `(x1, y1, x2, y2)`.
   - Applies a **padding** of 10 % of the box dimensions on each side (configurable via `CROP_PADDING_RATIO`), clamped to image boundaries.
   - Crops that region from the PIL image.
4. Returns a list of detection dictionaries, each containing:

| Key | Type | Description |
|-----|------|-------------|
| `bbox` | `[float, float, float, float]` | Bounding box `[x1, y1, x2, y2]` in pixels |
| `yolo_confidence` | `float` | YOLO detection confidence (0–1) |
| `yolo_class` | `str` | Class label assigned by YOLO |
| `crop_image` | `PIL.Image` | The cropped image region (removed before JSON serialisation) |

**Key parameters:**

| Parameter | Value | Description |
|-----------|-------|-------------|
| `YOLO_CONFIDENCE_THRESHOLD` | `0.50` | Passed to YOLO inference; boxes below this score are discarded before they reach the pipeline |
| `YOLO_CONFIDENCE_MIN` | `0.45` | Secondary check inside `detect_and_crop`: any box that passed YOLO's filter but falls below this value is still skipped to further reduce false positives |

---

### Stage 2 – ResNet50 Classifier

**File:** `backend/classification_pipeline/classifier.py`

The `WasteClassifier` class wraps a **ResNet50** model with a custom classification head:

```
ResNet50 backbone (pretrained weights=None, loaded from checkpoint)
    │
    └── Fully-Connected Head:
            Dropout(0.3)
            Linear(2048 → 512)
            ReLU
            Dropout(0.2)
            Linear(512 → 8)   ← one output per waste category
```

**Image enhancement pipeline** applied to every crop before the tensor transform:

| Step | Details |
|------|---------|
| CLAHE | Converts the crop to LAB colour space and applies Contrast Limited Adaptive Histogram Equalization to the L channel (`CLAHE_CLIP_LIMIT = 2.0`, `CLAHE_TILE_GRID_SIZE = (8, 8)`). Controlled by `ENABLE_CLAHE`. |
| Sharpening | Applies an unsharp-mask filter using a Gaussian blur kernel to restore edge definitions lost during up-sampling of small crops. Strength controlled by `SHARPENING_KERNEL_STRENGTH = 1.5` and `ENABLE_SHARPENING`. |

**Tensor transform pipeline** applied after image enhancement:

| Step | Details |
|------|---------|
| Resize | `224 × 224` pixels (`RESNET_INPUT_SIZE`) |
| ToTensor | Converts PIL image to `[0, 1]` float tensor |
| Normalize | Mean `[0.485, 0.456, 0.406]`, Std `[0.229, 0.224, 0.225]` (ImageNet statistics) |

**Inference & IDK (I Don't Know) Framework:**
1. The preprocessed tensor is forwarded through the model.
2. `softmax` is applied to the raw logits to produce class probabilities.
3. The class with the highest probability (`argmax`) is selected.
4. **IDK check:** If the top confidence is below `RESNET_CONFIDENCE_MIN = 0.50`, the method returns the `FALLBACK_CLASS` (`"Miscellaneous Trash"`) together with the original (low) confidence score, rather than making an unreliable prediction.
5. Otherwise the method returns `(class_name: str, confidence: float)` for the predicted class.

**Checkpoint loading:** The classifier supports two checkpoint formats:
- A plain `state_dict` (raw weights dictionary).
- A checkpoint dictionary with a `"model_state_dict"` key (common when saving optimizer state alongside weights).

---

### Pipeline Orchestration

**File:** `backend/classification_pipeline/pipeline.py`

`WastePipeline.process(image_input)` accepts:
- `bytes` – raw image bytes
- `PIL.Image.Image` – already-opened PIL image
- A file path (string/path-like) – opened via `PIL.Image.open`

**Processing logic:**

1. **Run YOLO** on the full image → list of detections (boxes below `YOLO_CONFIDENCE_MIN` are discarded).
2. **If detections exist** – for each crop, run the CLAHE + sharpening enhancement pipeline, then classify with ResNet50. The IDK check inside the classifier may return `"Miscellaneous Trash"` if confidence is too low.
3. **If no detections** – fall back to classifying the entire image as a single "crop" (bounding box covers the full image, `yolo_confidence = 0.0`, `source = "whole_image"`). The IDK check still applies.
4. **Return the single best result** – the candidate with the highest `class_confidence`. Even when multiple objects are detected, only the most confident classification is returned to keep the API response simple and deterministic.

---

### Configuration Parameters

**File:** `backend/classification_pipeline/config.py`

| Parameter | Value | Description |
|-----------|-------|-------------|
| `DEVICE` | `cuda` / `cpu` | Automatically selects GPU if CUDA is available |
| `YOLO_WEIGHTS` | `classification_pipeline/models/detector_model.pt` | Path to YOLO model weights |
| `RESNET_WEIGHTS` | `classification_pipeline/models/classifier_model.pt` | Path to ResNet50 checkpoint |
| `CLASSES` | 8 strings (see below) | Ordered list of waste category names (excludes the fallback class) |
| `YOLO_CONFIDENCE_THRESHOLD` | `0.50` | Confidence threshold passed to YOLO inference; boxes below this are discarded by YOLO |
| `YOLO_CONFIDENCE_MIN` | `0.45` | Secondary minimum threshold in `detect_and_crop`; boxes that pass YOLO's filter but fall below this are still skipped |
| `CROP_PADDING_RATIO` | `0.10` | Fraction of box dimensions added as padding around each crop |
| `RESNET_MEAN` | `[0.485, 0.456, 0.406]` | ImageNet channel mean for normalisation |
| `RESNET_STD` | `[0.229, 0.224, 0.225]` | ImageNet channel std for normalisation |
| `RESNET_INPUT_SIZE` | `224` | Input image size (pixels, square) |
| `RESNET_CONFIDENCE_MIN` | `0.50` | IDK threshold: classifier confidence below this triggers the fallback class |
| `FALLBACK_CLASS` | `"Miscellaneous Trash"` | Class returned when the IDK check fires (confidence too low) |
| `ENABLE_CLAHE` | `True` | Enable CLAHE contrast enhancement as part of crop preprocessing |
| `CLAHE_CLIP_LIMIT` | `2.0` | CLAHE clip limit (controls contrast amplification) |
| `CLAHE_TILE_GRID_SIZE` | `(8, 8)` | CLAHE tile grid size |
| `ENABLE_SHARPENING` | `True` | Enable unsharp-mask sharpening after CLAHE |
| `SHARPENING_KERNEL_STRENGTH` | `1.5` | Multiplier for the unsharp-mask kernel |

---

### Waste Categories & Disposal Mapping

The pipeline classifies waste into **8 categories**. Each category maps to a disposal method and bin color:

| Category | Disposal Method | Bin Color |
|----------|----------------|-----------|
| Cardboard | Recycle | 🔵 Blue |
| Food Organics | Compost | 🟢 Green |
| Glass | Recycle | 🔵 Blue |
| Metal | Recycle | 🔵 Blue |
| Paper | Recycle | 🔵 Blue |
| Plastic | Recycle | 🔵 Blue |
| Textile Trash | Donation / Special Recycling | 🟡 Yellow |
| Vegetation | Compost / Yard Waste | 🟢 Green |

> **Fallback:** When the IDK check fires (classifier confidence below `RESNET_CONFIDENCE_MIN`), the result is reported as **Miscellaneous Trash → Landfill / ⚫ Black**, but this class is not part of the trained `CLASSES` list — it is returned exclusively as a low-confidence signal.

---

## Frontend

The frontend is a **Next.js 16** application (TypeScript + Tailwind CSS) located in the `frontend/` directory. It uses **Supabase** for user authentication and database storage, and **shadcn/ui** for UI components.

### Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Landing page – redirects to `/auth/login` |
| `/auth/login` | `app/auth/login/page.tsx` | Email/password sign-in form |
| `/auth/sign-up` | `app/auth/sign-up/page.tsx` | Account creation form with password confirmation |
| `/auth/success` | `app/auth/success/page.tsx` | Post-signup confirmation page |
| `/dashboard` | `app/dashboard/page.tsx` | Main dashboard: image upload, classification result, recent history |
| `/dashboard/analytics` | `app/dashboard/analytics/page.tsx` | Personal analytics: pie chart by category, bar chart by disposal method, classification history table |
| `/dashboard/profile` | `app/dashboard/profile/page.tsx` | User info (email, ID, creation date) and logout |
| `/admin` | `app/admin/page.tsx` | Admin dashboard: system-wide stats, user list, classification trends |

#### Dashboard (`/dashboard`)

The main user-facing page. It:
- Verifies the user is authenticated; redirects to `/auth/login` otherwise.
- Loads the user's classification history from Supabase (`waste_classifications` table, ordered newest-first).
- Renders the `ImageUpload` component for new classifications.
- Displays a **Stats row** with live-updating counts for total items sorted, recyclables, and distinct categories found, plus a shortcut to the Analytics page.
- Shows the latest `ClassificationResult` immediately after a successful classification (no page reload required).
- Maintains a **live classification feed**: on each successful upload the new result is prepended to the in-memory history list and displayed instantly in the Recent Classifications section, with the 10 most recent entries shown as cards (each with a delete button).

#### Analytics (`/dashboard/analytics`)

Provides personal waste sorting insights:
- **Total Items Sorted** – count of all user classifications.
- **Average Confidence** – mean model confidence across all classifications.
- **Categories Found** – number of distinct waste types encountered.
- **Recyclables** – number of items with disposal type "Recyclable".
- **Pie chart** – distribution of waste by category.
- **Bar chart** – breakdown of disposal methods used.
- **History table** – scrollable table of all classifications with date and confidence.

#### Admin (`/admin`)

A system-wide dashboard showing aggregated data across all users:
- Total users, total classifications, average confidence, waste category count.
- Pie chart of classifications by category (all users).
- Bar chart of disposal method distribution.
- Line chart showing classification volume over the last 7 days.
- Table of registered users with their classification counts.
- Table of the 20 most recent classifications across the platform.

---

### Components

| Component | File | Description |
|-----------|------|-------------|
| `ImageUpload` | `components/image-upload.tsx` | Drag-and-drop or click-to-browse image uploader; sends image to `/api/classify-waste`; renders YOLO bounding boxes overlaid on the preview |
| `ClassificationResult` | `components/classification-result.tsx` | Displays waste type, confidence %, disposal method badge, and bin color |
| `Header` | `components/header.tsx` | Sticky top navigation bar with title, subtitle, optional back button, and profile icon |
| `ThemeProvider` | `components/theme-provider.tsx` | Wraps the app with `next-themes` for dark/light mode support |

#### `ImageUpload` – Bounding Box Overlay

After a successful classification, if the backend returns `all_detections`, the component:
1. Tracks the **natural size** of the image (`naturalWidth` × `naturalHeight`).
2. Tracks the **rendered display size** (updated on mount and on window resize).
3. Scales each bounding box `[x1, y1, x2, y2]` from natural pixels to CSS pixels using:
   ```
   scaleX = displayWidth  / naturalWidth
   scaleY = displayHeight / naturalHeight
   ```
4. Renders absolutely positioned `<div>` elements with an emerald border and a label showing `class_name (confidence%)`.

---

### Authentication & Middleware

Authentication is handled by **Supabase Auth** via the `@supabase/ssr` package.

**`frontend/middleware.ts`** – runs on every request (except static assets):
- Calls `updateSession` to refresh the Supabase session cookie.
- If no authenticated user is found **and** the path is not under `/auth` or `/`, redirects to `/auth/login`.

**`lib/supabase/`** – three Supabase client helpers:
| File | Usage |
|------|-------|
| `client.ts` | Browser-side client (React components) |
| `server.ts` | Server-side client (Next.js API routes, Server Components) |
| `middleware.ts` | Session refresh logic used by `middleware.ts` |

---

## Database Schema

The Supabase PostgreSQL database has the following tables. Row-Level Security (RLS) is enabled on all tables so users can only access their own data.

### `profiles`

Auto-populated by a trigger whenever a new user signs up via Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | References `auth.users.id` |
| `email` | TEXT | User's email address |
| `created_at` | TIMESTAMPTZ | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### `waste_classifications`

One row per classification performed by a user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated primary key |
| `user_id` | UUID (FK) | References `auth.users.id` |
| `image_url` | TEXT | First 100 characters of the base64 data URI (used as a reference) |
| `waste_category` | TEXT | Predicted category (e.g., `"Plastic"`) |
| `disposal_type` | TEXT | Recommended disposal method (e.g., `"Recycle"`) |
| `confidence` | FLOAT | Model confidence score (0–1) |
| `tip` | TEXT | Optional disposal tip (currently unused, stored as `null`) |
| `created_at` | TIMESTAMPTZ | Classification timestamp |

**RLS policies:** Users may SELECT, INSERT, and DELETE their own rows only.

### `admin_users` *(admin feature)*

Tracks which users have admin privileges.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | References `auth.users.id` |
| `user_id` | UUID (FK) | References `auth.users.id` |
| `is_admin` | BOOLEAN | Whether the user has admin access |
| `created_at` | TIMESTAMPTZ | Timestamp |

### `system_analytics` *(admin feature)*

Aggregate statistics snapshot (read-only for admins).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `total_users` | INT | Total registered users |
| `total_classifications` | INT | Total classifications performed |
| `avg_confidence` | FLOAT | Average confidence across all classifications |
| `most_common_category` | TEXT | Most frequently classified waste type |
| `updated_at` | TIMESTAMPTZ | Last updated timestamp |

**Database migrations** are in `frontend/scripts/`:
- `001_init_schema.sql` – creates `profiles`, `waste_classifications`, RLS policies, and the `handle_new_user` trigger.
- `002_add_admin_tables.sql` – creates `admin_users` and `system_analytics`.

---

## Setup & Installation

### Prerequisites

- **Python 3.10+** with `pip`
- **Node.js 18+** with `npm` or `yarn`
- A **Supabase** project (free tier is sufficient)
- Trained model weights:
  - `backend/classification_pipeline/models/detector_model.pt` (YOLO)
  - `backend/classification_pipeline/models/classifier_model.pt` (ResNet50)
- *(Optional)* An NVIDIA GPU with CUDA 12.6 for accelerated inference

---

### Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Place your model weights
mkdir -p classification_pipeline/models
cp /path/to/detector_model.pt  classification_pipeline/models/
cp /path/to/classifier_model.pt classification_pipeline/models/

# Start the Flask server (default port 5000)
python app.py
```

The server starts at `http://localhost:5000`.

**Note:** The `requirements.txt` pins CUDA 12.6 builds of PyTorch. If you are running CPU-only, install PyTorch separately:
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

---

### Frontend Setup

```bash
cd frontend

# Install Node.js dependencies
npm install        # or: yarn install

# Copy the example env file and fill in your values
cp .env.example .env.local   # create if it doesn't exist (see below)

# Run database migrations in Supabase SQL editor:
#   scripts/001_init_schema.sql
#   scripts/002_add_admin_tables.sql

# Start the development server (default port 3000)
npm run dev
```

The app is available at `http://localhost:3000`.

---

### Environment Variables

Create `frontend/.env.local` with the following variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON` | ✅ | Your Supabase anonymous/public API key |
| `PYTHON_SERVER_URL` | ✅ | URL of the Python Flask backend (default: `http://localhost:5000`) |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | ☑️ optional | OAuth redirect URL for local development (overrides auto-detected origin) |

---

## API Reference

### `GET /health`

Returns the health status of the backend and whether the pipeline was loaded successfully.

**Response**
```json
{ "status": "ok", "pipeline_loaded": true }
```

---

### `POST /classify`

Classifies a waste image and returns the predicted category, disposal method, and all detected objects.

**Request**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQ..."
}
```
The `data:...;base64,` prefix is optional and will be stripped automatically.

**Success response (200)**
```json
{
  "category": "Glass",
  "confidence": 0.91,
  "disposal": "Recycle",
  "bin_color": "Blue",
  "all_detections": [
    {
      "bbox": [120.5, 45.2, 380.1, 410.7],
      "yolo_confidence": 0.83,
      "yolo_class": "waste",
      "class_name": "Glass",
      "class_confidence": 0.91,
      "source": "crop"
    }
  ]
}
```

**No object detected (200)**
```json
{
  "category": "Plastic",
  "confidence": 0.76,
  "disposal": "Recycle",
  "bin_color": "Blue",
  "all_detections": [
    {
      "bbox": [0.0, 0.0, 640.0, 480.0],
      "yolo_confidence": 0.0,
      "class_name": "Plastic",
      "class_confidence": 0.76,
      "source": "whole_image"
    }
  ]
}
```

**Error responses**

| Status | Body | Reason |
|--------|------|--------|
| `400` | `{"error": "No image provided"}` | Missing `image` field |
| `500` | `{"error": "Pipeline not initialized"}` | Models failed to load at startup |
| `500` | `{"error": "<exception message>"}` | Unexpected server error |

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.10+ | Runtime |
| Flask | 3.1.3 | HTTP API server |
| flask-cors | 6.0.2 | Cross-origin request handling |
| Ultralytics (YOLOv8/v11) | 8.4.19 | Object detection (Stage 1) |
| PyTorch | 2.10.0+cu126 | Deep learning framework |
| torchvision | 0.25.0 | ResNet50 model + transforms (Stage 2) |
| Pillow | 12.0.0 | Image loading and cropping |
| NumPy | 2.3.5 | Numerical operations |
| OpenCV | 4.13.0 | Computer vision utilities |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | React framework (App Router) |
| React | 19.x | UI library |
| TypeScript | 5.9.3 | Type-safe JavaScript |
| Tailwind CSS | 4.x | Utility-first styling |
| shadcn/ui + Radix UI | latest | Accessible UI component library |
| Supabase JS | latest | Auth & database client |
| Recharts | latest | Charts for analytics pages |
| Sonner | 1.7.4 | Toast notifications |
| Lucide React | 0.454.0 | Icon library |

### Infrastructure

| Service | Purpose |
|---------|---------|
| Supabase | PostgreSQL database + authentication + row-level security |
| Vercel | Frontend hosting (CI/CD from this repository) |
