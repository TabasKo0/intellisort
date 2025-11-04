# Waste Sorting Web App - Setup Guide

## Backend Setup

### 1. Database Migrations
- Run the SQL script in `scripts/001_init_schema.sql` using the Supabase dashboard or v0 scripts runner
- This creates the profiles and waste_classifications tables with proper RLS policies

### 2. Environment Variables (Next.js)
Add these to your Vercel project:
- NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY - Your Supabase anon key
- PYTHON_SERVER_URL - URL to Python backend (e.g., http://localhost:5000)

### 3. Python Backend Setup

\`\`\`bash
cd python_backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
\`\`\`

The Python server runs on http://localhost:5000 by default.

### 4. Integrate Your Model

1. Train or download your waste classification model
2. Update `python_backend/app.py`:
   - Uncomment the model loading section
   - Replace the mock prediction with your model inference
   - Adjust WASTE_CATEGORIES if needed

### 5. Run Next.js Frontend

\`\`\`bash
npm install
npm run dev
\`\`\`

Visit http://localhost:3000

## Testing

1. Sign up for an account
2. Upload an image of waste
3. View the classification result
4. Check your classification history

## Deployment

- Deploy Next.js to Vercel
- Deploy Python backend to a service like Heroku, Railway, or your own server
- Update PYTHON_SERVER_URL environment variable in Vercel
