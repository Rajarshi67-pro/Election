"""
VoteVision AI - Model Training Script
Trains a RandomForestClassifier for election outcome prediction.
"""

import os
import sys
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    roc_auc_score, f1_score
)

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from ml.preprocess import ElectionPreprocessor


def train_model(data_path, model_save_path, preprocessor_save_path):
    """
    Train the election prediction model.

    Args:
        data_path: Path to the cleaned_dataset.csv
        model_save_path: Path to save the trained model (.pkl)
        preprocessor_save_path: Path to save the fitted preprocessor (.pkl)
    """
    print("=" * 60)
    print("VoteVision AI - Model Training")
    print("=" * 60)

    # Step 1: Preprocess data
    print("\n[1/5] Preprocessing data...")
    preprocessor = ElectionPreprocessor()
    X, y, df = preprocessor.preprocess_for_training(data_path)

    print(f"  Dataset size: {X.shape[0]} samples, {X.shape[1]} features")
    print(f"  Winner distribution: {dict(zip(*np.unique(y, return_counts=True)))}")

    # Step 2: Initialize model
    print("\n[2/5] Initializing RandomForestClassifier...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=3,
        min_samples_leaf=2,
        max_features='sqrt',
        bootstrap=True,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )

    # Step 3: Cross-validation
    print("\n[3/5] Performing cross-validation...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    cv_accuracy = cross_val_score(model, X, y, cv=cv, scoring='accuracy')
    cv_f1 = cross_val_score(model, X, y, cv=cv, scoring='f1')
    cv_roc = cross_val_score(model, X, y, cv=cv, scoring='roc_auc')

    print(f"  CV Accuracy: {cv_accuracy.mean():.4f} (+/- {cv_accuracy.std():.4f})")
    print(f"  CV F1 Score: {cv_f1.mean():.4f} (+/- {cv_f1.std():.4f})")
    print(f"  CV ROC-AUC:  {cv_roc.mean():.4f} (+/- {cv_roc.std():.4f})")

    # Step 4: Train final model on all data
    print("\n[4/5] Training final model on full dataset...")
    model.fit(X, y)

    # Training metrics
    y_pred = model.predict(X)
    y_proba = model.predict_proba(X)[:, 1]

    print(f"\n  Training Accuracy: {accuracy_score(y, y_pred):.4f}")
    print(f"  Training F1 Score: {f1_score(y, y_pred):.4f}")
    print(f"  Training ROC-AUC:  {roc_auc_score(y, y_proba):.4f}")

    print("\n  Classification Report:")
    print(classification_report(y, y_pred, target_names=['Loser', 'Winner']))

    # Feature importance
    print("\n  Feature Importances:")
    feature_importance = dict(zip(preprocessor.feature_columns, model.feature_importances_))
    sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
    for feat, imp in sorted_features:
        bar = '█' * int(imp * 50)
        print(f"    {feat:<25} {imp:.4f} {bar}")

    # Step 5: Save model and preprocessor
    print(f"\n[5/5] Saving model and preprocessor...")
    with open(model_save_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"  Model saved to: {model_save_path}")

    preprocessor.save(preprocessor_save_path)
    print(f"  Preprocessor saved to: {preprocessor_save_path}")

    # Save training metadata
    metadata = {
        'model_type': 'RandomForestClassifier',
        'n_estimators': 200,
        'n_features': X.shape[1],
        'n_samples': X.shape[0],
        'cv_accuracy_mean': float(cv_accuracy.mean()),
        'cv_accuracy_std': float(cv_accuracy.std()),
        'cv_f1_mean': float(cv_f1.mean()),
        'cv_roc_auc_mean': float(cv_roc.mean()),
        'feature_columns': preprocessor.feature_columns,
        'feature_importances': {k: float(v) for k, v in feature_importance.items()}
    }

    import json
    metadata_path = os.path.join(os.path.dirname(model_save_path), 'model_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"  Metadata saved to: {metadata_path}")

    print("\n" + "=" * 60)
    print("Training complete!")
    print("=" * 60)

    return model, preprocessor


if __name__ == '__main__':
    # Paths
    project_root = os.path.dirname(os.path.dirname(__file__))
    data_path = os.path.join(project_root, 'data', 'cleaned_dataset.csv')
    model_save_path = os.path.join(project_root, 'ml', 'saved_model.pkl')
    preprocessor_save_path = os.path.join(project_root, 'ml', 'preprocessor.pkl')

    model, preprocessor = train_model(data_path, model_save_path, preprocessor_save_path)

    # Test prediction
    print("\n--- Test Prediction ---")
    test_input = {
        'previous_vote_share': 55.0,
        'turnout': 58.0,
        'swing': 2.5,
        'margin_previous': 15.0,
        'incumbency': 1,
        'urban_rural_ratio': 0.75,
        'literacy_rate': 80.0,
        'population_density': 2500,
        'num_candidates': 6,
        'party': 'BJP',
        'alliance': 'NDA',
        'state': 'Uttar Pradesh'
    }

    X_test = preprocessor.preprocess_single(test_input)
    prediction = model.predict(X_test)[0]
    probability = model.predict_proba(X_test)[0]

    print(f"  Input: {test_input['party']} candidate in {test_input['state']}")
    print(f"  Prediction: {'Winner' if prediction == 1 else 'Loser'}")
    print(f"  Confidence: {max(probability) * 100:.1f}%")
    print(f"  Probabilities: Lose={probability[0]:.3f}, Win={probability[1]:.3f}")
