"""
VoteVision AI - Model Training & Evaluation Pipeline
Trains and evaluates production election prediction models (Random Forest),
performs GroupKFold (constituency-grouped) and StratifiedKFold Cross Validation,
audits for data leakage, and serializes trained models with full evaluation metadata.
"""

import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, GroupKFold, cross_validate
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix
)

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.preprocess import ElectionPreprocessor


def train_model(data_path, model_save_path, preprocessor_save_path):
    """
    Train and validate the election prediction model.

    Args:
        data_path: Path to cleaned dataset CSV
        model_save_path: Path to save the trained model (.pkl)
        preprocessor_save_path: Path to save the preprocessor (.pkl)

    Returns:
        tuple: (trained_model, fitted_preprocessor, model_metadata)
    """
    print("=" * 65)
    print(" VoteVision AI - Model Training & Leak-Free Evaluation Pipeline")
    print("=" * 65)

    # 1. Preprocessing
    print("\n[1/5] Loading and Preprocessing Data...")
    preprocessor = ElectionPreprocessor()
    X, y, df = preprocessor.preprocess_for_training(data_path)

    unique_classes, counts = np.unique(y, return_counts=True)
    class_distribution = {int(k): int(v) for k, v in zip(unique_classes, counts)}
    print(f"  Total samples: {X.shape[0]} | Features: {X.shape[1]}")
    print(f"  Target distribution (0: Loser, 1: Winner): {class_distribution}")

    # 2. Model Initialization
    print("\n[2/5] Initializing RandomForest Classifier...")
    rf_model = RandomForestClassifier(
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

    scoring = {
        'accuracy': 'accuracy',
        'precision': 'precision',
        'recall': 'recall',
        'f1': 'f1',
        'roc_auc': 'roc_auc'
    }

    # 3A. Rigorous GroupKFold (grouped by Constituency to eliminate constituency data leakage)
    print("\n[3/5] Running GroupKFold Cross-Validation (Grouped by Constituency)...")
    group_cv = GroupKFold(n_splits=5)
    groups = df['constituency'].values
    group_cv_results = cross_validate(rf_model, X, y, cv=group_cv, groups=groups, scoring=scoring, return_train_score=False)

    g_acc_mean = float(group_cv_results['test_accuracy'].mean())
    g_acc_std = float(group_cv_results['test_accuracy'].std())
    g_prec_mean = float(group_cv_results['test_precision'].mean())
    g_rec_mean = float(group_cv_results['test_recall'].mean())
    g_f1_mean = float(group_cv_results['test_f1'].mean())
    g_roc_mean = float(group_cv_results['test_roc_auc'].mean())

    print(f"  Group-CV Accuracy:  {g_acc_mean * 100:.2f}% (+/- {g_acc_std * 100:.2f}%)")
    print(f"  Group-CV Precision: {g_prec_mean * 100:.2f}%")
    print(f"  Group-CV Recall:    {g_rec_mean * 100:.2f}%")
    print(f"  Group-CV F1-Score:  {g_f1_mean * 100:.2f}%")
    print(f"  Group-CV ROC-AUC:   {g_roc_mean * 100:.2f}%")

    # 3B. Stratified 5-Fold Cross-Validation
    strat_cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    strat_cv_results = cross_validate(rf_model, X, y, cv=strat_cv, scoring=scoring, return_train_score=False)
    s_acc_mean = float(strat_cv_results['test_accuracy'].mean())
    s_f1_mean = float(strat_cv_results['test_f1'].mean())

    # 4. Train Final Production Model
    print("\n[4/5] Training Final Model on Entire Dataset...")
    rf_model.fit(X, y)

    y_pred = rf_model.predict(X)
    y_proba = rf_model.predict_proba(X)[:, 1]

    cm = confusion_matrix(y, y_pred).tolist()
    train_acc = float(accuracy_score(y, y_pred))
    train_f1 = float(f1_score(y, y_pred))
    train_roc = float(roc_auc_score(y, y_proba))

    print(f"  Full-set Accuracy: {train_acc * 100:.2f}% | F1: {train_f1 * 100:.2f}% | ROC-AUC: {train_roc * 100:.2f}%")
    print("\n  Confusion Matrix [ [TN, FP], [FN, TP] ]:")
    print(f"    {cm}")

    # Feature Importances
    feature_importances = dict(zip(preprocessor.feature_columns, [float(v) for v in rf_model.feature_importances_]))
    sorted_features = sorted(feature_importances.items(), key=lambda x: x[1], reverse=True)
    print("\n  Top Feature Importances (Leak-Free):")
    for feat, imp in sorted_features:
        bar = '█' * int(imp * 40)
        print(f"    {feat:<24} {imp:.4f} {bar}")

    # 5. Serialization & Metadata
    print("\n[5/5] Serializing Model, Preprocessor & Metadata...")
    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    with open(model_save_path, 'wb') as f:
        pickle.dump(rf_model, f)
    print(f"  ✓ Model saved to: {model_save_path}")

    preprocessor.save(preprocessor_save_path)
    print(f"  ✓ Preprocessor saved to: {preprocessor_save_path}")

    metadata = {
        'model_type': 'RandomForestClassifier',
        'n_estimators': 200,
        'max_depth': 12,
        'n_features': int(X.shape[1]),
        'n_samples': int(X.shape[0]),
        'evaluation_method': 'GroupKFold (Constituency Holdout)',
        'cv_accuracy_mean': round(g_acc_mean, 4),
        'cv_accuracy_std': round(g_acc_std, 4),
        'cv_precision_mean': round(g_prec_mean, 4),
        'cv_recall_mean': round(g_rec_mean, 4),
        'cv_f1_mean': round(g_f1_mean, 4),
        'cv_roc_auc_mean': round(g_roc_mean, 4),
        'stratified_cv_accuracy': round(s_acc_mean, 4),
        'stratified_cv_f1': round(s_f1_mean, 4),
        'training_accuracy': round(train_acc, 4),
        'training_f1': round(train_f1, 4),
        'training_roc_auc': round(train_roc, 4),
        'confusion_matrix': cm,
        'feature_columns': preprocessor.feature_columns,
        'feature_importances': feature_importances,
        'class_distribution': class_distribution
    }

    metadata_path = os.path.join(os.path.dirname(model_save_path), 'model_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"  ✓ Evaluation metadata saved to: {metadata_path}")

    print("\n" + "=" * 65)
    print(" Model Training Completed Successfully!")
    print("=" * 65)

    return rf_model, preprocessor, metadata


if __name__ == '__main__':
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_csv = os.path.join(project_root, 'data', 'cleaned_dataset.csv')
    model_path = os.path.join(project_root, 'ml', 'saved_model.pkl')
    prep_path = os.path.join(project_root, 'ml', 'preprocessor.pkl')

    train_model(data_csv, model_path, prep_path)
