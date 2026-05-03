"""
VoteVision AI - Prediction Model Loader
Handles loading and inference with the trained ML model.
"""

import os
import sys
import pickle
import json
import numpy as np

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class PredictionModel:
    """Wrapper for the trained election prediction model."""

    def __init__(self, model_path, preprocessor_path, metadata_path=None):
        self.model = None
        self.preprocessor = None
        self.metadata = None
        self.is_loaded = False

        self._load_model(model_path)
        self._load_preprocessor(preprocessor_path)
        if metadata_path and os.path.exists(metadata_path):
            self._load_metadata(metadata_path)

        self.is_loaded = True

    def _load_model(self, path):
        """Load the trained model from pickle file."""
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found: {path}")
        with open(path, 'rb') as f:
            self.model = pickle.load(f)
        print(f"Model loaded from {path}")

    def _load_preprocessor(self, path):
        """Load the fitted preprocessor."""
        if not os.path.exists(path):
            raise FileNotFoundError(f"Preprocessor file not found: {path}")
        from ml.preprocess import ElectionPreprocessor
        self.preprocessor = ElectionPreprocessor.load(path)

    def _load_metadata(self, path):
        """Load model training metadata."""
        with open(path, 'r') as f:
            self.metadata = json.load(f)

    def predict(self, input_data):
        """
        Make a prediction for a single candidate.

        Args:
            input_data: dict with keys matching the feature requirements

        Returns:
            dict with prediction, probability, and confidence
        """
        if not self.is_loaded:
            raise RuntimeError("Model is not loaded")

        # Preprocess input
        X = self.preprocessor.preprocess_single(input_data)

        # Predict
        prediction = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]

        win_probability = float(probabilities[1])
        lose_probability = float(probabilities[0])
        confidence = float(max(probabilities))

        result = {
            'prediction': 'Winner' if prediction == 1 else 'Not Winner',
            'win_probability': round(win_probability * 100, 2),
            'lose_probability': round(lose_probability * 100, 2),
            'confidence': round(confidence * 100, 2),
            'raw_prediction': int(prediction)
        }

        return result

    def predict_constituency(self, candidates_data):
        """
        Predict outcomes for all candidates in a constituency.

        Args:
            candidates_data: list of dicts, each representing a candidate

        Returns:
            list of prediction results, sorted by win probability
        """
        results = []
        for candidate in candidates_data:
            pred = self.predict(candidate)
            pred['candidate_name'] = candidate.get('candidate_name', 'Unknown')
            pred['party'] = candidate.get('party', 'Unknown')
            results.append(pred)

        # Sort by win probability descending
        results.sort(key=lambda x: x['win_probability'], reverse=True)

        # Mark the predicted winner
        if results:
            results[0]['predicted_winner'] = True
            for r in results[1:]:
                r['predicted_winner'] = False

        return results

    def get_model_info(self):
        """Return model metadata and info."""
        info = {
            'model_type': type(self.model).__name__,
            'is_loaded': self.is_loaded,
        }
        if self.metadata:
            info.update({
                'n_features': self.metadata.get('n_features'),
                'n_samples': self.metadata.get('n_samples'),
                'cv_accuracy': self.metadata.get('cv_accuracy_mean'),
                'cv_f1': self.metadata.get('cv_f1_mean'),
                'feature_importances': self.metadata.get('feature_importances')
            })
        return info
