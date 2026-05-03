"""
VoteVision AI - Data Routes
Handles constituency and candidate data API endpoints.
Supports ?election_type=general (default) or ?election_type=assembly.
"""

from flask import Blueprint, jsonify, request

data_bp = Blueprint('data', __name__)

# ── helpers ───────────────────────────────────────────────────────────────────

def resolve_datasets(election_type='general'):
    """Return the correct (dataset, candidate_data) tuple based on election_type."""
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
    """Extract and normalise election_type from query params."""
    et = request.args.get('election_type', 'general').lower().strip()
    return 'assembly' if et == 'assembly' else 'general'


# ── routes ────────────────────────────────────────────────────────────────────

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
                'error': f'{election_type.capitalize()} election dataset not loaded'
            }), 503

        state_filter = request.args.get('state')

        if state_filter:
            filtered = dataset[dataset['state'] == state_filter]
            if filtered.empty:
                return jsonify({
                    'success': False,
                    'error': f'No constituencies found for state: {state_filter}'
                }), 404
            constituencies = sorted(filtered['constituency'].unique().tolist())
        else:
            constituencies = sorted(dataset['constituency'].unique().tolist())

        states = sorted(dataset['state'].unique().tolist())
        state_constituencies = {
            state: sorted(dataset[dataset['state'] == state]['constituency'].unique().tolist())
            for state in states
        }

        return jsonify({
            'success': True,
            'election_type': election_type,
            'total_constituencies': len(constituencies),
            'constituencies': constituencies,
            'states': states,
            'state_constituencies': state_constituencies
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@data_bp.route('/constituency/<name>', methods=['GET'])
def get_constituency_details(name):
    """
    Get detailed info about a specific constituency.

    Query params:
        election_type (optional): 'general' | 'assembly'
    """
    try:
        election_type = get_election_type()
        dataset, _ = resolve_datasets(election_type)

        if dataset is None:
            return jsonify({'success': False, 'error': 'Dataset not loaded'}), 503

        constituency_data = dataset[dataset['constituency'] == name]
        if constituency_data.empty:
            return jsonify({'success': False, 'error': f'Constituency not found: {name}'}), 404

        first_row = constituency_data.iloc[0]
        candidates = []
        for _, row in constituency_data.iterrows():
            candidates.append({
                'name': row['candidate_name'],
                'party': row['party'],
                'alliance': row.get('alliance', 'Other'),
                'previous_vote_share': float(row['previous_vote_share']),
                'incumbency': bool(row['incumbency']),
                'swing': float(row['swing'])
            })

        return jsonify({
            'success': True,
            'election_type': election_type,
            'constituency': {
                'name': name,
                'state': first_row['state'],
                'turnout': float(first_row['turnout']),
                'total_candidates': int(first_row['num_candidates']),
                'urban_rural_ratio': float(first_row['urban_rural_ratio']),
                'literacy_rate': float(first_row['literacy_rate']),
                'population_density': float(first_row['population_density']),
                'candidates': candidates
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@data_bp.route('/candidates', methods=['GET'])
def get_candidates():
    """
    Get candidate information.

    Query params:
        election_type (optional): 'general' | 'assembly'
        state (optional): Filter by state
        party (optional): Filter by party
        constituency (optional): Filter by constituency
    """
    try:
        election_type = get_election_type()
        _, candidate_data = resolve_datasets(election_type)

        if candidate_data is None:
            return jsonify({'success': False, 'error': 'Candidate data not loaded'}), 503

        candidates = list(candidate_data.get('candidates', []))

        state_filter = request.args.get('state')
        party_filter = request.args.get('party')
        constituency_filter = request.args.get('constituency')

        if state_filter:
            candidates = [c for c in candidates if c.get('state') == state_filter]
        if party_filter:
            candidates = [c for c in candidates if c.get('party') == party_filter]
        if constituency_filter:
            candidates = [c for c in candidates if c.get('constituency') == constituency_filter]

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
        return jsonify({'success': False, 'error': str(e)}), 500


@data_bp.route('/stats', methods=['GET'])
def get_stats():
    """
    Get overall election statistics for the dashboard.

    Query params:
        election_type (optional): 'general' | 'assembly'
    """
    try:
        election_type = get_election_type()
        dataset, candidate_data = resolve_datasets(election_type)

        if dataset is None:
            return jsonify({'success': False, 'error': 'Dataset not loaded'}), 503

        total_constituencies = dataset['constituency'].nunique()
        total_states = dataset['state'].nunique()
        total_candidates = len(dataset)
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

        # Add election_info for assembly elections
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
                'election_info': election_info
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
