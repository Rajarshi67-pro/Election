"""
VoteVision AI - Prediction & Simulation Routes
Handles prediction-related API endpoints, scenario simulations, and Explainable AI analysis.
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
    """Return the loaded prediction model instance."""
    from flask import current_app
    return current_app.config.get('PREDICTION_MODEL')


@prediction_bp.route('/predict', methods=['POST'])
def predict():
    """
    Predict election outcome for a constituency.

    Request JSON payload:
    {
        "constituency": "Varanasi",
        "state": "Uttar Pradesh",
        "election_type": "general",      // "general" (default) | "assembly"
        "swing_adjustment": 0.0          // float between -20.0 and 20.0
    }
    """
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'INVALID_PAYLOAD',
                    'message': 'No JSON payload provided in request body'
                }
            }), 400

        constituency = data.get('constituency')
        state = data.get('state')
        election_type = str(data.get('election_type', 'general')).lower().strip()
        if election_type not in ('general', 'assembly'):
            election_type = 'general'

        # Validation
        if not constituency or not isinstance(constituency, str):
            return jsonify({
                'success': False,
                'error': {
                    'code': 'MISSING_FIELD',
                    'message': 'Field "constituency" is required and must be a string'
                }
            }), 400

        if not state or not isinstance(state, str):
            return jsonify({
                'success': False,
                'error': {
                    'code': 'MISSING_FIELD',
                    'message': 'Field "state" is required and must be a string'
                }
            }), 400

        try:
            swing_adjustment = float(data.get('swing_adjustment', 0.0))
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'error': {
                    'code': 'INVALID_SWING',
                    'message': '"swing_adjustment" must be a numerical value'
                }
            }), 400

        if swing_adjustment < -20.0 or swing_adjustment > 20.0:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'SWING_OUT_OF_RANGE',
                    'message': '"swing_adjustment" must be between -20.0 and 20.0'
                }
            }), 400

        model = get_model()
        if model is None:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'MODEL_NOT_READY',
                    'message': 'Prediction model is not initialized or failed to load'
                }
            }), 503

        dataset = resolve_dataset(election_type)
        if dataset is None:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'DATASET_UNAVAILABLE',
                    'message': f'{election_type.capitalize()} election dataset is not loaded'
                }
            }), 503

        # Match constituency and state case-insensitively
        mask = (dataset['constituency'].str.strip().str.lower() == constituency.strip().lower()) & \
               (dataset['state'].str.strip().str.lower() == state.strip().lower())
        constituency_data = dataset[mask]

        if constituency_data.empty:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'CONSTITUENCY_NOT_FOUND',
                    'message': f'No historical candidate records found for "{constituency}", "{state}"'
                }
            }), 404

        candidates = []
        for _, row in constituency_data.iterrows():
            candidates.append({
                'candidate_name': str(row['candidate_name']),
                'party': str(row['party']),
                'alliance': str(row.get('alliance', 'Other')),
                'state': str(row['state']),
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
        winner = results[0] if results else None

        return jsonify({
            'success': True,
            'election_type': election_type,
            'constituency': constituency,
            'state': state,
            'swing_adjustment': swing_adjustment,
            'total_candidates': len(results),
            'predicted_winner': winner['candidate_name'] if winner else None,
            'predicted_party': winner['party'] if winner else None,
            'predicted_alliance': winner['alliance'] if winner else None,
            'win_probability': winner['win_probability'] if winner else 0,
            'confidence': winner['confidence'] if winner else 0,
            'predictions': results,
            'explanation': winner['explanation'] if winner and 'explanation' in winner else None
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'PREDICTION_ERROR',
                'message': str(e)
            }
        }), 500


@prediction_bp.route('/scenarios', methods=['POST'])
def simulate_scenarios():
    """
    Run multi-constituency swing simulation across states or entire election.

    Request JSON payload:
    {
        "election_type": "general",
        "state": "Uttar Pradesh",       // optional: filter to specific state
        "swing_adjustment": 2.5
    }
    """
    try:
        data = request.get_json(silent=True) or {}
        election_type = str(data.get('election_type', 'general')).lower().strip()
        state_filter = data.get('state')
        swing_adjustment = float(data.get('swing_adjustment', 0.0))

        if swing_adjustment < -20.0 or swing_adjustment > 20.0:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'SWING_OUT_OF_RANGE',
                    'message': '"swing_adjustment" must be between -20.0 and 20.0'
                }
            }), 400

        model = get_model()
        dataset = resolve_dataset(election_type)
        if model is None or dataset is None:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'SYSTEM_UNAVAILABLE',
                    'message': 'Model or dataset is not available for simulation'
                }
            }), 503

        filtered_df = dataset.copy()
        if state_filter:
            filtered_df = filtered_df[filtered_df['state'].str.lower() == state_filter.lower()]

        constituencies = filtered_df['constituency'].unique()
        simulation_results = []
        party_seat_projection = {}
        alliance_seat_projection = {}

        for c_name in constituencies:
            c_rows = filtered_df[filtered_df['constituency'] == c_name]
            candidates = []
            c_state = c_rows.iloc[0]['state']
            for _, row in c_rows.iterrows():
                candidates.append({
                    'candidate_name': str(row['candidate_name']),
                    'party': str(row['party']),
                    'alliance': str(row.get('alliance', 'Other')),
                    'state': str(row['state']),
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

            preds = model.predict_constituency(candidates)
            if preds:
                top = preds[0]
                party_seat_projection[top['party']] = party_seat_projection.get(top['party'], 0) + 1
                alliance_seat_projection[top['alliance']] = alliance_seat_projection.get(top['alliance'], 0) + 1
                simulation_results.append({
                    'constituency': c_name,
                    'state': c_state,
                    'predicted_winner': top['candidate_name'],
                    'party': top['party'],
                    'alliance': top['alliance'],
                    'win_probability': top['win_probability']
                })

        return jsonify({
            'success': True,
            'election_type': election_type,
            'state_filter': state_filter,
            'swing_adjustment': swing_adjustment,
            'total_simulated': len(simulation_results),
            'projected_seats_by_party': party_seat_projection,
            'projected_seats_by_alliance': alliance_seat_projection,
            'constituency_projections': simulation_results
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'SIMULATION_ERROR',
                'message': str(e)
            }
        }), 500


@prediction_bp.route('/model-info', methods=['GET'])
def model_info():
    """Return model evaluation metrics, feature importances, and metadata."""
    try:
        model = get_model()
        if model is None:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'MODEL_NOT_LOADED',
                    'message': 'Prediction model is not currently loaded'
                }
            }), 503

        return jsonify({
            'success': True,
            'model_info': model.get_model_info()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'MODEL_INFO_ERROR',
                'message': str(e)
            }
        }), 500
