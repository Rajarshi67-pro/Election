"""
VoteVision AI - Prediction Routes
Handles prediction-related API endpoints.
Supports election_type in POST body: 'general' (default) | 'assembly'.
"""

from flask import Blueprint, request, jsonify

prediction_bp = Blueprint('prediction', __name__)


def resolve_dataset(election_type='general'):
    """Return the correct dataset based on election_type."""
    from flask import current_app
    if election_type == 'assembly':
        return current_app.config.get('ASSEMBLY_DATASET')
    return current_app.config.get('DATASET')


def get_model():
    from flask import current_app
    return current_app.config.get('PREDICTION_MODEL')


@prediction_bp.route('/predict', methods=['POST'])
def predict():
    """
    Predict election outcome for a constituency.

    Request JSON:
    {
        "constituency": "Varanasi",
        "state": "Uttar Pradesh",
        "election_type": "general",      // or "assembly"
        "swing_adjustment": 0.0          // optional
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No JSON data provided'}), 400

        constituency = data.get('constituency')
        state = data.get('state')
        swing_adjustment = float(data.get('swing_adjustment', 0.0))
        election_type = data.get('election_type', 'general').lower().strip()
        if election_type not in ('general', 'assembly'):
            election_type = 'general'

        if not constituency or not state:
            return jsonify({'success': False, 'error': 'Both constituency and state are required'}), 400

        model = get_model()
        if model is None:
            return jsonify({'success': False, 'error': 'Prediction model is not loaded'}), 503

        dataset = resolve_dataset(election_type)
        if dataset is None:
            return jsonify({'success': False, 'error': f'{election_type.capitalize()} dataset not loaded'}), 503

        mask = (dataset['constituency'] == constituency) & (dataset['state'] == state)
        constituency_data = dataset[mask]

        if constituency_data.empty:
            return jsonify({'success': False, 'error': f'No data found for {constituency}, {state}'}), 404

        candidates = []
        for _, row in constituency_data.iterrows():
            candidates.append({
                'candidate_name': row['candidate_name'],
                'party': row['party'],
                'alliance': row.get('alliance', 'Other'),
                'state': row['state'],
                'previous_vote_share': float(row['previous_vote_share']),
                'turnout': float(row['turnout']),
                'swing': float(row['swing']) + swing_adjustment,
                'margin_previous': float(row['margin_previous']),
                'incumbency': int(row['incumbency']),
                'urban_rural_ratio': float(row['urban_rural_ratio']),
                'literacy_rate': float(row['literacy_rate']),
                'population_density': float(row['population_density']),
                'num_candidates': int(row['num_candidates'])
            })

        results = model.predict_constituency(candidates)

        return jsonify({
            'success': True,
            'election_type': election_type,
            'constituency': constituency,
            'state': state,
            'swing_adjustment': swing_adjustment,
            'total_candidates': len(results),
            'predictions': results
        })

    except ValueError as e:
        return jsonify({'success': False, 'error': f'Invalid input value: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': f'Prediction failed: {str(e)}'}), 500


@prediction_bp.route('/model-info', methods=['GET'])
def model_info():
    """Return information about the loaded model."""
    try:
        model = get_model()
        if model is None:
            return jsonify({'success': False, 'error': 'Model not loaded'}), 503
        return jsonify({'success': True, 'model_info': model.get_model_info()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
