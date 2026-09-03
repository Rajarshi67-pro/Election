# VoteVision AI – Explainable Election Intelligence & Forecasting Platform

> AI-powered constituency-level election forecasting and Explainable AI (XAI) analytics for Indian Parliamentary and State Assembly elections.

![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.1-000000?style=for-the-badge&logo=flask&logoColor=white)
![scikit--learn](https://img.shields.io/badge/scikit--learn-1.8-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-4.4-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)

---

## 🎯 Overview

**VoteVision AI** is an advanced political intelligence and election forecasting application. It leverages calibrated machine learning models to forecast constituency outcomes across the **2024 Lok Sabha Parliamentary Election** and **2026 Vidhan Sabha State Assembly Elections**.

Beyond simple victory predictions, VoteVision AI features an **Explainable AI (XAI) Attribution Engine** that breaks down exactly how historical margins, baseline vote shares, voter swing momentum, sitting incumbency, and local demographic factors (urbanization, literacy, voter turnout) influence predicted probabilities.

---

## ✨ Key Features

- 🔮 **ML-Powered Predictions** – Random Forest classifier trained on constituency electoral metrics with multi-candidate probability calibration.
- 🧠 **Explainable AI (XAI) Breakdown** – Quantified factor attributions (Historical Margin, Base Vote Share, Swing Momentum, Incumbency Advantage, Demographic Factors) and natural-language assessments.
- 📐 **Interactive Swing Simulation** – Real-time sentiment slider (-10% to +10%) to model how shifting voter preference alters constituency outcomes.
- 🏛️ **Dual-Election Support** – Seamless toggle between 2024 Lok Sabha and 2026 State Assembly elections (West Bengal, Tamil Nadu, Kerala, Assam, Karnataka, Bihar).
- 📊 **Analytics Dashboard** – Alliance seat shares, party-wise winners, searchable state breakdown, and battleground contest tracker.
- 👥 **Candidate Directory** – Searchable candidate profiles with declared assets, educational background, criminal record history, and past electoral wins.
- 🎨 **Glassmorphism Dark UI** – Responsive, accessible interface with glowing accents, animated counters, interactive charts, and modal profiles.
- 🛡️ **Production-Grade Security & API** – Strict security headers (CSP, X-Frame-Options, X-Content-Type-Options), structured error responses, and complete validation.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Custom Glassmorphism Design System), Vanilla JavaScript (ES6+), Chart.js 4.4 |
| **Backend** | Python 3.9+, Flask 3.1, Flask-CORS, Gunicorn |
| **Machine Learning** | scikit-learn (RandomForestClassifier), pandas, numpy |
| **Testing** | unittest, automated API integration & ML pipeline test suite |
| **Deployment** | Vercel Serverless Functions (`@vercel/python`) / Standalone WSGI |

---

## 📁 Project Structure

```
VoteVision-AI/
├── backend/
│   ├── app.py                     # Flask application factory & security middleware
│   ├── config.py                  # Environment configurations (Dev, Prod, Test)
│   ├── models/
│   │   └── prediction_model.py    # Inference engine & Explainable AI wrapper
│   ├── routes/
│   │   ├── data.py                # Constituency, candidate, party & stats endpoints
│   │   └── prediction.py          # /api/predict, /api/scenarios & /api/model-info
│   └── utils/
│       └── helpers.py             # Utility functions & data loaders
├── frontend/
│   ├── index.html                 # Landing page & key statistics
│   ├── dashboard.html             # Analytics dashboard & model scorecard
│   ├── constituency.html          # Constituency prediction & XAI visualizer
│   ├── candidates.html            # Searchable candidate directory
│   ├── css/
│   │   └── style.css              # Design system & responsive styles
│   └── js/
│       ├── api.js                 # API client & election state manager
│       ├── home.js                # Home page charts & counters
│       ├── dashboard.js           # Dashboard charts, tables & model metrics
│       ├── constituency.js        # Prediction workflow & XAI factor renderer
│       └── candidates.js          # Candidate filters, search & detail modal
├── ml/
│   ├── preprocess.py              # Data cleaning, feature engineering & scaling
│   ├── train_model.py             # 5-fold CV training & evaluation script
│   ├── saved_model.pkl            # Serialized Random Forest model
│   ├── preprocessor.pkl           # Fitted preprocessing transformer
│   └── model_metadata.json        # CV metrics & feature importances
├── data/
│   ├── cleaned_dataset.csv        # 2024 Lok Sabha dataset
│   ├── sample_candidate_data.json # 2024 Lok Sabha candidate profiles
│   ├── assembly_dataset.csv       # 2026 Vidhan Sabha dataset
│   └── assembly_candidate_data.json # 2026 Vidhan Sabha candidate profiles
├── tests/
│   ├── test_backend.py            # API integration & route tests (13 tests)
│   └── test_ml.py                 # ML preprocessing & XAI unit tests (7 tests)
├── docs/
│   └── plan.md                    # Implementation & verification matrix
├── .env.example                   # Sample environment configuration
├── .gitignore                     # Git ignore rules
├── requirements.txt               # Root Python dependencies
├── vercel.json                    # Vercel deployment configuration
└── vercel_app.py                  # Serverless function entrypoint
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9 or higher
- pip package manager

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Rajarshichatterjee/Election.git
cd Election/VoteVision-AI
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
```

### 3. Train the Model (Optional / Verified Artifacts Included)

```bash
python3 -m ml.train_model
```

### 4. Run the Application

```bash
python3 -m backend.app
```

Open your browser and navigate to **`http://localhost:5000`**.

---

## 🧪 Running Automated Tests

Run the complete test suite:

```bash
python3 -m unittest discover tests
```

Output:
```
Ran 20 tests in 2.67s
OK
```

---

## 📡 API Reference

### Health & Diagnostics
- **`GET /api/health`** — Health check returning server status, loaded records, and model availability.

### Predictions & Explainable AI
- **`POST /api/predict`** — Forecast constituency outcome with swing adjustment and XAI attribution.
  ```json
  {
    "constituency": "Varanasi",
    "state": "Uttar Pradesh",
    "swing_adjustment": 2.0,
    "election_type": "general"
  }
  ```
- **`POST /api/scenarios`** — Multi-constituency statewide or election-wide swing simulation.
- **`GET /api/model-info`** — Model evaluation metrics (CV accuracy, precision, recall, F1, ROC-AUC, feature importances).

### Data & Analytics
- **`GET /api/constituencies?election_type=general&state=Uttar+Pradesh`** — List constituencies, state mapping, and battlegrounds.
- **`GET /api/constituency/<name>?election_type=general`** — Constituency demographic details and candidate profiles.
- **`GET /api/candidates?party=BJP&search=Modi`** — Filterable and searchable candidate records.
- **`GET /api/candidates/<id>`** — Detailed candidate profile by ID.
- **`GET /api/parties?election_type=general`** — Party statistics, alliance mapping, seats won, and win rates.
- **`GET /api/stats?election_type=general`** — Dashboard summary metrics, alliance seat shares, and battleground seats.

---

## ⚠️ Data & Election Disclaimer

VoteVision AI generates **probabilistic forecasts** utilizing historical electoral data, demographic indicators, and machine learning models. 

1. Predictions are mathematical estimations and do not represent official election results.
2. Electoral outcomes in democratic elections are determined solely by the votes cast and counted by the Election Commission.
3. This platform is designed for educational, research, and data analytics demonstration purposes.

---

## 📄 License

Distributed under the MIT License for educational and demonstration purposes.
