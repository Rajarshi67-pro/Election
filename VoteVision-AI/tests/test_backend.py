"""
VoteVision AI - Backend API Integration & Route Test Suite
Tests all REST endpoints, validation rules, status codes, and error responses.
"""

import unittest
import json
import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.app import create_app


class TestBackendAPI(unittest.TestCase):
    """Integration test suite for the Flask backend API."""

    @classmethod
    def setUpClass(cls):
        cls.app = create_app('testing')
        cls.client = cls.app.test_client()

    def test_health_check(self):
        """Test /api/health endpoint."""
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'healthy')
        self.assertTrue(data.get('model_loaded'))
        self.assertGreater(data.get('general_records', 0), 0)

    def test_get_constituencies_general(self):
        """Test /api/constituencies for general election."""
        res = self.client.get('/api/constituencies?election_type=general')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertIn('constituencies', data)
        self.assertIn('states', data)
        self.assertIn('state_constituencies', data)
        self.assertIn('battleground_seats', data)
        self.assertIn('Varanasi', data['constituencies'])

    def test_get_constituencies_assembly(self):
        """Test /api/constituencies for assembly election."""
        res = self.client.get('/api/constituencies?election_type=assembly')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('election_type'), 'assembly')
        self.assertGreater(data.get('total_constituencies', 0), 0)

    def test_get_constituencies_filtered_by_state(self):
        """Test /api/constituencies?state=... filtering."""
        res = self.client.get('/api/constituencies?state=Uttar Pradesh')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertIn('Varanasi', data['constituencies'])
        self.assertIn('Amethi', data['constituencies'])

    def test_get_constituency_details_valid(self):
        """Test /api/constituency/<name> for a valid constituency."""
        res = self.client.get('/api/constituency/Varanasi')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        c = data.get('constituency')
        self.assertEqual(c.get('name'), 'Varanasi')
        self.assertEqual(c.get('state'), 'Uttar Pradesh')
        self.assertGreater(len(c.get('candidates', [])), 0)

    def test_get_constituency_details_not_found(self):
        """Test /api/constituency/<name> for a non-existent constituency."""
        res = self.client.get('/api/constituency/NonExistentConstituency123')
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertFalse(data.get('success'))
        self.assertIn('error', data)

    def test_get_candidates_all(self):
        """Test /api/candidates endpoint."""
        res = self.client.get('/api/candidates')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertGreater(data.get('total_candidates', 0), 0)
        self.assertIn('candidates', data)
        self.assertIn('parties', data)

    def test_get_candidates_filtered_by_party(self):
        """Test /api/candidates?party=BJP filtering."""
        res = self.client.get('/api/candidates?party=BJP')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        for candidate in data.get('candidates', []):
            self.assertEqual(candidate.get('party'), 'BJP')

    def test_get_candidate_by_id_valid(self):
        """Test /api/candidates/<id> for an existing ID."""
        res = self.client.get('/api/candidates/1')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data['candidate']['id'], 1)

    def test_get_candidate_by_id_invalid(self):
        """Test /api/candidates/<id> for a non-existent ID."""
        res = self.client.get('/api/candidates/99999')
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertFalse(data.get('success'))

    def test_compare_candidates(self):
        """Test /api/compare endpoint comparing two valid candidates."""
        res = self.client.get('/api/compare?c1=1&c2=2')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertIn('comparison', data)
        comp = data['comparison']
        self.assertIn('asset_comparison', comp)
        self.assertIn('experience_comparison', comp)
        self.assertIn('legal_records', comp)

    def test_compare_candidates_missing_params(self):
        """Test /api/compare with missing candidate parameters."""
        res = self.client.get('/api/compare')
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data.get('success'))

    def test_insights_endpoint(self):
        """Test /api/insights automated intelligence endpoint."""
        res = self.client.get('/api/insights')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertIn('insights', data)
        ins = data['insights']
        self.assertIn('highest_turnout_constituencies', ins)
        self.assertIn('tightest_battlegrounds', ins)
        self.assertIn('wealthiest_candidates', ins)

    def test_get_parties(self):
        """Test /api/parties endpoint."""
        res = self.client.get('/api/parties')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertIn('party_seats', data)
        self.assertIn('alliance_seats', data)
        self.assertIn('parties', data)

    def test_get_stats(self):
        """Test /api/stats endpoint."""
        res = self.client.get('/api/stats')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        s = data.get('stats')
        self.assertGreater(s.get('total_constituencies', 0), 0)
        self.assertGreater(s.get('total_states', 0), 0)
        self.assertIn('party_seats', s)
        self.assertIn('alliance_seats', s)
        self.assertIn('state_stats', s)
        self.assertIn('battlegrounds', s)

    def test_model_info(self):
        """Test /api/model-info endpoint."""
        res = self.client.get('/api/model-info')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        info = data.get('model_info')
        self.assertTrue(info.get('is_loaded'))
        self.assertIn('cv_accuracy', info)
        self.assertIn('feature_importances', info)

    def test_predict_winner_success(self):
        """Test POST /api/predict with valid payload."""
        payload = {
            'constituency': 'Varanasi',
            'state': 'Uttar Pradesh',
            'swing_adjustment': 1.5,
            'election_type': 'general'
        }
        res = self.client.post('/api/predict', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('constituency'), 'Varanasi')
        self.assertIn('predictions', data)
        self.assertIn('predicted_winner', data)
        self.assertIn('explanation', data)

        # Check probability bounds
        predictions = data.get('predictions', [])
        for p in predictions:
            self.assertGreaterEqual(p['win_probability'], 0.0)
            self.assertLessEqual(p['win_probability'], 100.0)
            self.assertGreaterEqual(p['confidence'], 0.0)
            self.assertLessEqual(p['confidence'], 100.0)

    def test_predict_validation_errors(self):
        """Test POST /api/predict input validation failures."""
        # Missing fields
        res1 = self.client.post('/api/predict', data=json.dumps({}), content_type='application/json')
        self.assertEqual(res1.status_code, 400)

        # Swing adjustment out of range
        res2 = self.client.post('/api/predict', data=json.dumps({
            'constituency': 'Varanasi',
            'state': 'Uttar Pradesh',
            'swing_adjustment': 45.0
        }), content_type='application/json')
        self.assertEqual(res2.status_code, 400)

        # Non-existent constituency
        res3 = self.client.post('/api/predict', data=json.dumps({
            'constituency': 'ImaginaryPlace',
            'state': 'Uttar Pradesh'
        }), content_type='application/json')
        self.assertEqual(res3.status_code, 404)

    def test_scenarios_simulation(self):
        """Test POST /api/scenarios simulation endpoint."""
        payload = {
            'election_type': 'general',
            'swing_adjustment': 2.0
        }
        res = self.client.post('/api/scenarios', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertIn('projected_seats_by_party', data)
        self.assertIn('projected_seats_by_alliance', data)
        self.assertIn('constituency_projections', data)


if __name__ == '__main__':
    unittest.main()
