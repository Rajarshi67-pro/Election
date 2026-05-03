# VoteVision AI – Election Prediction Platform

> AI-powered constituency-level election prediction for the Indian General Election 2024

![Python](https://img.shields.io/badge/Python-3.9+-blue) ![Flask](https://img.shields.io/badge/Flask-3.0-green) ![scikit--learn](https://img.shields.io/badge/scikit--learn-1.3-orange)

---

## 🎯 Overview

VoteVision AI combines political data analytics with machine learning to forecast constituency-level outcomes in Indian general elections. The platform uses a **Random Forest Classifier** trained on features like historical vote share, voter turnout, swing momentum, demographic indicators, and incumbency to predict winners with confidence scores.

## ✨ Features

- 🔮 **ML-Powered Predictions** – Random Forest model with cross-validated accuracy
- 📊 **Interactive Dashboard** – Alliance & party seat distribution charts
- 🗺️ **State → Constituency Drill-down** – Cascading dropdown filters
- 📐 **Swing Simulation** – Slider to adjust swing and see real-time impact
- 👥 **Candidate Directory** – Searchable profiles with filters
- 🎨 **Premium Dark UI** – Glassmorphism, animations, responsive design
- 🔌 **REST API** – Clean Flask endpoints for prediction & data

## 🛠️ Tech Stack

| Layer      | Technology                        |
| ---------- | --------------------------------- |
| Frontend   | HTML5, CSS3, Vanilla JS, Chart.js |
| Backend    | Python, Flask, Flask-CORS         |
| ML         | scikit-learn, pandas, numpy       |
| Data       | CSV + JSON datasets               |

## 📁 Project Structure

```
VoteVision-AI/
├── frontend/            # Static frontend files
│   ├── index.html       # Home / landing page
│   ├── dashboard.html   # Analytics dashboard
│   ├── constituency.html# Prediction page
│   ├── candidates.html  # Candidate directory
│   ├── css/style.css    # Design system
│   └── js/              # Page scripts + API client
├── backend/
│   ├── app.py           # Flask app factory
│   ├── config.py        # Configuration
│   ├── routes/          # API blueprints
│   ├── models/          # ML model wrapper
│   └── utils/           # Helper functions
├── ml/
│   ├── preprocess.py    # Data preprocessing pipeline
│   ├── train_model.py   # Model training script
│   ├── saved_model.pkl  # Trained model (generated)
│   └── preprocessor.pkl # Fitted preprocessor (generated)
├── data/
│   ├── cleaned_dataset.csv
│   └── sample_candidate_data.json
└── README.md
```

## 🚀 Setup & Run

### Prerequisites
- Python 3.9+
- pip

### 1. Install Dependencies

```bash
cd VoteVision-AI
pip install -r backend/requirements.txt
```

### 2. Train the Model

```bash
python -m ml.train_model
```

This creates `ml/saved_model.pkl` and `ml/preprocessor.pkl`.

### 3. Start the Server

```bash
python -m backend.app
```

The app will be available at **http://localhost:5000**

## 📡 API Endpoints

| Method | Endpoint                  | Description                        |
| ------ | ------------------------- | ---------------------------------- |
| GET    | `/api/health`             | Health check                       |
| GET    | `/api/constituencies`     | List all constituencies            |
| GET    | `/api/constituency/<name>`| Constituency details               |
| GET    | `/api/candidates`         | Candidate list (filterable)        |
| GET    | `/api/stats`              | Dashboard statistics               |
| GET    | `/api/model-info`         | Model metadata                     |
| POST   | `/api/predict`            | Predict constituency winner        |

### Predict Request Example

```json
POST /api/predict
{
  "constituency": "Varanasi",
  "state": "Uttar Pradesh",
  "swing_adjustment": 2.0
}
```

## 📸 Screenshots

*Launch the app and visit http://localhost:5000 to see the UI.*

## 📜 License

This project is for educational and demonstration purposes.
