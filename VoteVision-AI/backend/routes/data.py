"""
VoteVision AI - Data Routes
Handles constituency, candidate, party, and election analytics endpoints.
Supports ?election_type=general (default) or ?election_type=assembly.
"""

from flask import Blueprint, jsonify, request

data_bp = Blueprint('data', __name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def resolve_datasets(election_type='general'):
    """Return the (dataset, candidate_data) tuple based on election_type."""
    from flask import current_app
    if election_type == 'assembly':
        return (
            current_app.config.get('ASSEMBLY_DATASET'),
            current_app.config.get('ASSEMBLY_CANDIDATE_DATA')
        )
    return (
        current_app.config.get('DATASET'),
        current_app.config.get('CANDIDATE_DATA')
    )


def get_election_type():
    """Extract and normalize election_type from query parameters."""
    et = request.args.get('election_type', 'general').lower().strip()
    return 'assembly' if et == 'assembly' else 'general'


# ── Routes ────────────────────────────────────────────────────────────────────

@data_bp.route('/constituencies', methods=['GET'])
def get_constituencies():
    """
    Get all constituencies, optionally filtered by state.

    Query params:
        election_type (optional): 'general' (default) | 'assembly'
        state (optional): Filter constituencies by state name
    """
    try:
        election_type = get_election_type()
        dataset, _ = resolve_datasets(election_type)

        if dataset is None:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'DATASET_NOT_LOADED',
                    'message': f'{election_type.capitalize()} election dataset not loaded'
                }
            }), 503

        state_filter = request.args.get('state')

        if state_filter:
            filtered = dataset[dataset['state'].str.lower() == state_filter.lower()]
            if filtered.empty:
                return jsonify({
                    'success': False,
                    'error': {
                        'code': 'STATE_NOT_FOUND',
                        'message': f'No constituencies found for state: {state_filter}'
                    }
                }), 404
            constituencies = sorted(filtered['constituency'].unique().tolist())
        else:
            constituencies = sorted(dataset['constituency'].unique().tolist())

        states = sorted(dataset['state'].unique().tolist())
        state_constituencies = {
            state: sorted(dataset[dataset['state'] == state]['constituency'].unique().tolist())
            for state in states
        }

        # Calculate battleground / closest contested seats (lowest previous victory margin)
        battleground_seats = []
        for c in dataset['constituency'].unique():
            c_data = dataset[dataset['constituency'] == c]
            winner_row = c_data[c_data['winner'] == 1]
            if not winner_row.empty:
                first = winner_row.iloc[0]
                margin = float(first.get('margin_previous', 0.0))
                battleground_seats.append({
                    'constituency': c,
                    'state': str(first['state']),
                    'winner': str(first['candidate_name']),
                    'party': str(first['party']),
                    'margin_previous': margin,
                    'is_battleground': margin < 10.0
                })

        battleground_seats.sort(key=lambda x: x['margin_previous'])

        return jsonify({
            'success': True,
            'election_type': election_type,
            'total_constituencies': len(constituencies),
            'constituencies': constituencies,
            'states': states,
            'state_constituencies': state_constituencies,
            'battleground_seats': battleground_seats[:10]
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'SERVER_ERROR',
                'message': str(e)
            }
        }), 500


@data_bp.route('/constituency/<name>', methods=['GET'])
def get_constituency_details(name):
    """
    Get detailed information and candidate list for a specific constituency.

    Query params:
        election_type (optional): 'general' | 'assembly'
    """
    try:
        election_type = get_election_type()
        dataset, _ = resolve_datasets(election_type)

        if dataset is None:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'DATASET_NOT_LOADED',
                    'message': 'Dataset not loaded'
                }
            }), 503

        constituency_data = dataset[dataset['constituency'].str.lower() == name.lower()]
        if constituency_data.empty:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'CONSTITUENCY_NOT_FOUND',
                    'message': f'Constituency not found: {name}'
                }
            }), 404

        first_row = constituency_data.iloc[0]
        candidates = []
        for _, row in constituency_data.iterrows():
            candidates.append({
                'name': str(row['candidate_name']),
                'party': str(row['party']),
                'alliance': str(row.get('alliance', 'Other')),
                'previous_vote_share': float(row['previous_vote_share']),
                'incumbency': bool(row['incumbency']),
                'swing': float(row['swing']),
                'margin_previous': float(row['margin_previous']),
                'is_previous_winner': int(row.get('winner', 0)) == 1
            })

        # Sort candidates by previous vote share
        candidates.sort(key=lambda x: x['previous_vote_share'], reverse=True)

        return jsonify({
            'success': True,
            'election_type': election_type,
            'constituency': {
                'name': str(first_row['constituency']),
                'state': str(first_row['state']),
                'turnout': float(first_row['turnout']),
                'total_candidates': int(first_row['num_candidates']),
                'urban_rural_ratio': float(first_row['urban_rural_ratio']),
                'literacy_rate': float(first_row['literacy_rate']),
                'population_density': float(first_row['population_density']),
                'candidates': candidates
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'SERVER_ERROR',
                'message': str(e)
            }
        }), 500


@data_bp.route('/candidates', methods=['GET'])
def get_candidates():
    """
    Get candidates matching search and filter criteria.

    Query params:
        election_type (optional): 'general' | 'assembly'
        state (optional): Filter by state
        party (optional): Filter by party
        alliance (optional): Filter by alliance
        constituency (optional): Filter by constituency
        search (optional): Search candidate name or constituency
    """
    try:
        election_type = get_election_type()
        _, candidate_data = resolve_datasets(election_type)

        if candidate_data is None:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'DATA_NOT_LOADED',
                    'message': 'Candidate profile data not loaded'
                }
            }), 503

        candidates = list(candidate_data.get('candidates', []))

        state_filter = request.args.get('state')
        party_filter = request.args.get('party')
        alliance_filter = request.args.get('alliance')
        constituency_filter = request.args.get('constituency')
        search_query = request.args.get('search', '').lower().strip()

        if state_filter:
            candidates = [c for c in candidates if str(c.get('state', '')).lower() == state_filter.lower()]
        if party_filter:
            candidates = [c for c in candidates if str(c.get('party', '')).lower() == party_filter.lower()]
        if alliance_filter:
            candidates = [c for c in candidates if str(c.get('alliance', '')).lower() == alliance_filter.lower()]
        if constituency_filter:
            candidates = [c for c in candidates if str(c.get('constituency', '')).lower() == constituency_filter.lower()]
        if search_query:
            candidates = [
                c for c in candidates
                if search_query in str(c.get('name', '')).lower() or
                   search_query in str(c.get('constituency', '')).lower() or
                   search_query in str(c.get('party', '')).lower()
            ]

        return jsonify({
            'success': True,
            'election_type': election_type,
            'total_candidates': len(candidates),
            'candidates': candidates,
            'parties': candidate_data.get('parties', {}),
            'states': candidate_data.get('states', []),
            'election_info': candidate_data.get('election_info', {})
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'SERVER_ERROR',
                'message': str(e)
            }
        }), 500


@data_bp.route('/candidates/<int:candidate_id>', methods=['GET'])
def get_candidate_by_id(candidate_id):
    """
    Get detailed profile of a single candidate by ID.
    """
    try:
        election_type = get_election_type()
        _, candidate_data = resolve_datasets(election_type)

        if candidate_data is None:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'DATA_NOT_LOADED',
                    'message': 'Candidate data not loaded'
                }
            }), 503

        candidates = candidate_data.get('candidates', [])
        match = next((c for c in candidates if c.get('id') == candidate_id), None)

        if not match:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'CANDIDATE_NOT_FOUND',
                    'message': f'Candidate with ID {candidate_id} not found'
                }
            }), 404

        return jsonify({
            'success': True,
            'election_type': election_type,
            'candidate': match
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'SERVER_ERROR',
                'message': str(e)
            }
        }), 500


@data_bp.route('/parties', methods=['GET'])
def get_parties():
    """
    Get party statistics, alliance affiliations, and seat distributions.
    """
    try:
        election_type = get_election_type()
        dataset, candidate_data = resolve_datasets(election_type)

        if dataset is None:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'DATASET_NOT_LOADED',
                    'message': 'Dataset not loaded'
                }
            }), 503

        winners = dataset[dataset['winner'] == 1]
        party_seats = winners['party'].value_counts().to_dict()
        alliance_seats = winners['alliance'].value_counts().to_dict()

        party_details = []
        parties_meta = candidate_data.get('parties', {}) if candidate_data else {}

        for party in dataset['party'].unique():
            p_data = dataset[dataset['party'] == party]
            p_winners = p_data[p_data['winner'] == 1]
            party_details.append({
                'party': party,
                'alliance': str(p_data.iloc[0].get('alliance', 'Other')),
                'full_name': parties_meta.get(party, party),
                'total_contested': len(p_data),
                'seats_won': len(p_winners),
                'avg_vote_share': round(float(p_data['previous_vote_share'].mean()), 2),
                'win_rate': round(float(len(p_winners) / len(p_data) * 100), 1) if len(p_data) > 0 else 0
            })

        party_details.sort(key=lambda x: x['seats_won'], reverse=True)

        return jsonify({
            'success': True,
            'election_type': election_type,
            'party_seats': party_seats,
            'alliance_seats': alliance_seats,
            'parties': party_details
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'SERVER_ERROR',
                'message': str(e)
            }
        }), 500


@data_bp.route('/stats', methods=['GET'])
def get_stats():
    """
    Get election statistics, charts data, and state breakdowns for the dashboard.
    """
    try:
        election_type = get_election_type()
        dataset, candidate_data = resolve_datasets(election_type)

        if dataset is None:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'DATASET_NOT_LOADED',
                    'message': 'Dataset not loaded'
                }
            }), 503

        total_constituencies = int(dataset['constituency'].nunique())
        total_states = int(dataset['state'].nunique())
        total_candidates = int(len(dataset))
        avg_turnout = round(float(dataset['turnout'].mean()), 1)

        winners = dataset[dataset['winner'] == 1]
        party_seats = winners['party'].value_counts().to_dict()
        alliance_seats = winners['alliance'].value_counts().to_dict()

        state_stats = {}
        for state in dataset['state'].unique():
            state_data = dataset[dataset['state'] == state]
            state_winners = state_data[state_data['winner'] == 1]
            state_stats[state] = {
                'constituencies': int(state_data['constituency'].nunique()),
                'avg_turnout': round(float(state_data['turnout'].mean()), 1),
                'party_wins': state_winners['party'].value_counts().to_dict()
            }

        # Identify key battleground seats (contests with narrow margin)
        battlegrounds = []
        for _, row in winners.iterrows():
            margin = float(row.get('margin_previous', 0.0))
            if margin <= 12.0:
                battlegrounds.append({
                    'constituency': str(row['constituency']),
                    'state': str(row['state']),
                    'winner': str(row['candidate_name']),
                    'party': str(row['party']),
                    'margin_previous': margin
                })
        battlegrounds.sort(key=lambda x: x['margin_previous'])

        election_info = {}
        if candidate_data:
            election_info = candidate_data.get('election_info', {})

        return jsonify({
            'success': True,
            'election_type': election_type,
            'stats': {
                'total_constituencies': total_constituencies,
                'total_states': total_states,
                'total_candidates': total_candidates,
                'avg_turnout': avg_turnout,
                'party_seats': party_seats,
                'alliance_seats': alliance_seats,
                'state_stats': state_stats,
                'battlegrounds': battlegrounds,
                'election_info': election_info
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'SERVER_ERROR',
                'message': str(e)
            }
        }), 500
