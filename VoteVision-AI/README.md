# VoteVision AI – Explainable Election Intelligence & Forecasting Platform

> AI-powered constituency-level election forecasting, What-If scenario simulations, and Explainable AI (XAI) analytics for Indian Parliamentary and State Assembly elections.

![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.1-000000?style=for-the-badge&logo=flask&logoColor=white)
![scikit--learn](https://img.shields.io/badge/scikit--learn-1.8-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-4.4-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)

---

## 🎯 Overview

**VoteVision AI** is an advanced political intelligence and election forecasting application. It leverages calibrated machine learning models to forecast constituency outcomes across the **2024 Lok Sabha Parliamentary Election** and **2026 Vidhan Sabha State Assembly Elections**.

Beyond simple victory predictions, VoteVision AI features:
- **Explainable AI (XAI) Attribution Engine** breaking down historical margins, baseline vote shares, voter swing momentum, sitting incumbency, and local demographic factors.
- **Head-to-Head Candidate Comparison Tool** (`/compare.html`) comparing declared wealth, criminal record affidavits, education, and electoral victory terms.
- **Statewide What-If Scenario Studio** (`/dashboard.html`) allowing users to simulate state-level or nationwide sentiment shifts and project seat gains/losses.
- **Automated AI Intelligence Insights** discovering bellwether seats, closest battlegrounds, and demographic outliers.
- **Forecast Brief Export** allowing one-click export of complete constituency prediction briefs in JSON.

---

## ✨ Key Features

- 🔮 **ML-Powered Predictions** – Random Forest classifier trained with 5-fold Group-CV (grouped by constituency) with multi-candidate probability calibration ($\sum P_i = 100\%$).
- 🧠 **Explainable AI (XAI) Breakdown** – Quantified factor attributions (Historical Margin, Base Vote Share, Swing Momentum, Incumbency Advantage, Demographic Dynamics) with natural-language assessments.
- ⚔️ **Head-to-Head Candidate Comparison** – Side-by-side scrutiny of any two candidates across India or within the same constituency.
- 📐 **Interactive Swing & Scenario Simulation** – Local constituency swing slider and statewide scenario studio to model shifting voter preferences.
- 📥 **Forecast Report Export** – Export structured prediction briefs with all factor weights and contestant probabilities.
- 🏛️ **Dual-Election Support** – Seamless toggle between 2024 Lok Sabha and 2026 State Assembly elections (West Bengal, Tamil Nadu, Kerala, Assam, Karnataka, Bihar).
- 📊 **Analytics Dashboard** – Alliance seat shares, party-wise winners, searchable state breakdown, and battleground contest tracker.
- 👥 **Candidate Directory** – Searchable candidate profiles with declared assets, educational background, criminal records, and past electoral wins.
- 🎨 **Glassmorphism Dark UI** – Responsive, accessible interface with glowing accents, animated counters, interactive charts, and modal profiles.
- 🛡️ **Production-Grade Security & API** – Strict security headers (CSP, X-Frame-Options, X-Content-Type-Options), structured error responses, and complete validation.

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
│   │   ├── data.py                # Data endpoints (/api/compare, /api/insights, /api/constituencies)
│   │   └── prediction.py          # /api/predict, /api/scenarios & /api/model-info
│   └── utils/
│       └── helpers.py             # Port discovery & data loaders
├── frontend/
│   ├── index.html                 # Landing page & key statistics
│   ├── dashboard.html             # Analytics dashboard & Scenario Studio
│   ├── constituency.html          # Constituency prediction, XAI visualizer & Export
│   ├── candidates.html            # Searchable candidate directory
│   ├── compare.html               # Head-to-head candidate comparison tool
│   ├── css/
│   │   └── style.css              # Design system & responsive styles
│   └── js/
│       ├── api.js                 # API client & election state manager
│       ├── home.js                # Home page charts & counters
│       ├── dashboard.js           # Dashboard charts, scenario simulator & AI insights
│       ├── constituency.js        # Prediction workflow, XAI renderer & export
│       ├── candidates.js          # Candidate filters, search & detail modal
│       └── compare.js             # Head-to-head candidate comparison interaction
├── ml/
│   ├── preprocess.py              # Data cleaning, feature engineering & scaling
│   ├── train_model.py             # 5-fold Group-CV training & evaluation script
│   ├── saved_model.pkl            # Serialized Random Forest model
│   ├── preprocessor.pkl           # Fitted preprocessing transformer
│   └── model_metadata.json        # Group-CV metrics & feature importances
├── data/
│   ├── cleaned_dataset.csv        # 2024 Lok Sabha dataset
│   ├── sample_candidate_data.json # 2024 Lok Sabha candidate profiles
│   ├── assembly_dataset.csv       # 2026 Vidhan Sabha dataset
│   └── assembly_candidate_data.json # 2026 Vidhan Sabha candidate profiles
├── tests/
│   ├── test_backend.py            # API integration & route tests (16 tests)
│   └── test_ml.py                 # ML preprocessing & XAI unit tests (9 tests)
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

### 1. Run the Application Locally

```bash
cd VoteVision-AI
python3 -m backend.app
```

Open your browser at **`http://localhost:5001`** (or **`http://127.0.0.1:5002`**).

### 2. Run Automated Test Suite

```bash
python3 -m unittest discover tests
```

---

## 📡 API Reference

### Health & Diagnostics
- **`GET /api/health`** — Server health, loaded datasets, and ML model status.

### Predictions & Explainable AI
- **`POST /api/predict`** — Forecast constituency outcome with swing adjustment and XAI attribution.
- **`POST /api/scenarios`** — Statewide or nationwide what-if swing simulation.
- **`GET /api/model-info`** — Model evaluation metrics (Group-CV accuracy, precision, recall, F1, ROC-AUC, feature importances).

### Data, Intelligence & Comparison
- **`GET /api/compare?c1=1&c2=2`** — Head-to-head candidate comparison (assets delta, judicial affidavits, experience).
- **`GET /api/insights?election_type=general`** — Automated intelligence trends (turnout leaders, narrowest contests, wealth & youth leaders).
- **`GET /api/constituencies?election_type=general`** — List constituencies, state mapping, and battlegrounds.
- **`GET /api/constituency/<name>?election_type=general`** — Constituency demographics and candidate records.
- **`GET /api/candidates?party=BJP&search=Modi`** — Filterable and searchable candidate records.
- **`GET /api/candidates/<id>`** — Detailed candidate profile by ID.
- **`GET /api/parties?election_type=general`** — Party statistics, alliance mapping, seats won, and win rates.
- **`GET /api/stats?election_type=general`** — Dashboard summary metrics, alliance seat shares, and battleground seats.

---

## ⚠️ Data & Election Disclaimer

VoteVision AI generates **probabilistic forecasts** utilizing historical electoral data, demographic indicators, and machine learning models for educational, research, and analytical demonstration purposes.
