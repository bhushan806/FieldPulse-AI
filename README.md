# FieldPulse AI

Intelligent data-capture and schedule-linking layer for infrastructure project management.

## Setup Instructions

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
