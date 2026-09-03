"""
VoteVision AI - Machine Learning & XAI Test Suite
Tests data preprocessing, categorical encoding, feature scaling, model inference,
Explainable AI, multi-candidate probability calibration, and GroupKFold evaluation.
"""

import unittest
import os
import sys
import numpy as np
import pandas as pd

# Add project root to sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from ml.preprocess import ElectionPreprocessor
from backend.models.prediction_model import PredictionModel


class TestMLPipeline(unittest.TestCase):
    """Unit tests for ML preprocessing, model inference, and XAI attribution."""

    @classmethod
    def setUpClass(cls):
        cls.data_path = os.path.join(project_root, 'data', 'cleaned_dataset.csv')
        cls.model_path = os.path.join(project_root, 'ml', 'saved_model.pkl')
        cls.prep_path = os.path.join(project_root, 'ml', 'preprocessor.pkl')
        cls.meta_path = os.path.join(project_root, 'ml', 'model_metadata.json')

    def test_preprocessor_training_flow(self):
        """Test the training preprocessing flow."""
        preprocessor = ElectionPreprocessor()
        X, y, df = preprocessor.preprocess_for_training(self.data_path)

        self.assertTrue(preprocessor.is_fitted)
        self.assertEqual(len(X.shape), 2)
        self.assertEqual(X.shape[1], len(preprocessor.feature_columns))
        self.assertEqual(len(y), X.shape[0])
        self.assertTrue(set(np.unique(y)).issubset({0, 1}))

    def test_feature_engineering(self):
        """Test feature engineering functions."""
        preprocessor = ElectionPreprocessor()
        df = preprocessor.load_data(self.data_path)
        df_clean = preprocessor.clean_data(df)
        df_eng = preprocessor.engineer_features(df_clean)

        self.assertIn('vote_strength', df_eng.columns)
        self.assertIn('swing_momentum', df_eng.columns)
        self.assertIn('competitiveness', df_eng.columns)
        self.assertIn('urban_literacy_index', df_eng.columns)
        self.assertIn('effective_vote_share', df_eng.columns)

    def test_single_sample_preprocessing(self):
        """Test preprocessing of a single candidate payload."""
        preprocessor = ElectionPreprocessor.load(self.prep_path)
        sample = {
            'party': 'BJP',
            'alliance': 'NDA',
            'state': 'Uttar Pradesh',
            'previous_vote_share': 63.6,
            'turnout': 55.2,
            'swing': 2.1,
            'margin_previous': 35.2,
            'incumbency': 1,
            'urban_rural_ratio': 0.65,
            'literacy_rate': 75.6,
            'population_density': 2399,
            'num_candidates': 8
        }
        scaled = preprocessor.preprocess_single(sample)
        self.assertEqual(scaled.shape, (1, len(preprocessor.feature_columns)))

    def test_model_prediction_and_explainability(self):
        """Test PredictionModel inference, probabilities, and Explainable AI factors."""
        model = PredictionModel(self.model_path, self.prep_path, self.meta_path)
        self.assertTrue(model.is_loaded)

        sample = {
            'candidate_name': 'Narendra Modi',
            'party': 'BJP',
            'alliance': 'NDA',
            'state': 'Uttar Pradesh',
            'previous_vote_share': 63.6,
            'turnout': 55.2,
            'swing': 2.1,
            'margin_previous': 35.2,
            'incumbency': 1,
            'urban_rural_ratio': 0.65,
            'literacy_rate': 75.6,
            'population_density': 2399,
            'num_candidates': 8
        }

        res = model.predict(sample)
        self.assertIn('prediction', res)
        self.assertIn('win_probability', res)
        self.assertIn('lose_probability', res)
        self.assertIn('confidence', res)
        self.assertIn('explanation', res)

        # Check probability bounds
        self.assertGreaterEqual(res['win_probability'], 0.0)
        self.assertLessEqual(res['win_probability'], 100.0)
        self.assertAlmostEqual(res['win_probability'] + res['lose_probability'], 100.0, places=1)

        # Check XAI explanation structure
        xai = res['explanation']
        self.assertIn('factors', xai)
        self.assertIn('summary_assessment', xai)
        self.assertIn('confidence_rating', xai)
        self.assertGreater(len(xai['factors']), 0)

    def test_constituency_probability_sum_100(self):
        """Test that multi-candidate constituency predictions sum to 100%."""
        model = PredictionModel(self.model_path, self.prep_path, self.meta_path)

        candidates = [
            {
                'candidate_name': 'Narendra Modi',
                'party': 'BJP',
                'alliance': 'NDA',
                'state': 'Uttar Pradesh',
                'previous_vote_share': 63.6,
                'turnout': 55.2,
                'swing': 2.1,
                'margin_previous': 35.2,
                'incumbency': 1,
                'urban_rural_ratio': 0.65,
                'literacy_rate': 75.6,
                'population_density': 2399,
                'num_candidates': 8
            },
            {
                'candidate_name': 'Ajay Rai',
                'party': 'INC',
                'alliance': 'INDIA',
                'state': 'Uttar Pradesh',
                'previous_vote_share': 22.3,
                'turnout': 55.2,
                'swing': -1.5,
                'margin_previous': 35.2,
                'incumbency': 0,
                'urban_rural_ratio': 0.65,
                'literacy_rate': 75.6,
                'population_density': 2399,
                'num_candidates': 8
            },
            {
                'candidate_name': 'Ather Jamal Lari',
                'party': 'BSP',
                'alliance': 'Other',
                'state': 'Uttar Pradesh',
                'previous_vote_share': 5.1,
                'turnout': 55.2,
                'swing': -3.2,
                'margin_previous': 35.2,
                'incumbency': 0,
                'urban_rural_ratio': 0.65,
                'literacy_rate': 75.6,
                'population_density': 2399,
                'num_candidates': 8
            }
        ]

        results = model.predict_constituency(candidates)
        total_probability = sum(r['win_probability'] for r in results)
        self.assertAlmostEqual(total_probability, 100.0, delta=0.5)
        self.assertTrue(results[0]['predicted_winner'])
        self.assertFalse(results[1]['predicted_winner'])
        self.assertFalse(results[2]['predicted_winner'])

    def test_swing_simulation_effect(self):
        """Test that swing simulation parameter changes candidate win probabilities."""
        model = PredictionModel(self.model_path, self.prep_path, self.meta_path)

        base_candidate = {
            'candidate_name': 'Candidate A',
            'party': 'INC',
            'alliance': 'INDIA',
            'state': 'Uttar Pradesh',
            'previous_vote_share': 44.0,
            'turnout': 58.0,
            'swing': 0.0,
            'margin_previous': 5.0,
            'incumbency': 0,
            'urban_rural_ratio': 0.5,
            'literacy_rate': 70.0,
            'population_density': 1500,
            'num_candidates': 5
        }

        prob_neutral = model.predict(base_candidate)['win_probability']

        # Apply +5% positive swing
        candidate_pos = dict(base_candidate)
        candidate_pos['swing'] = 5.0
        prob_positive = model.predict(candidate_pos)['win_probability']

        # Apply -5% negative swing
        candidate_neg = dict(base_candidate)
        candidate_neg['swing'] = -5.0
        prob_negative = model.predict(candidate_neg)['win_probability']

        self.assertGreater(prob_positive, prob_neutral)
        self.assertLess(prob_negative, prob_neutral)


if __name__ == '__main__':
    unittest.main()
