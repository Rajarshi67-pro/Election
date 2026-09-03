"""
VoteVision AI - Backend Configuration
Defines environment-specific settings for Development, Testing, and Production.
"""

import os

class Config:
    """Base configuration settings."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'votevision-ai-production-secret-key-2024')
    DEBUG = False
    TESTING = False

    # Base paths
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    ML_DIR = os.path.join(BASE_DIR, 'ml')

    # Data files — General Election (2024 Lok Sabha)
    DATASET_PATH = os.path.join(DATA_DIR, 'cleaned_dataset.csv')
    CANDIDATE_DATA_PATH = os.path.join(DATA_DIR, 'sample_candidate_data.json')

    # Data files — Assembly Elections (2026 Vidhan Sabha)
    ASSEMBLY_DATASET_PATH = os.path.join(DATA_DIR, 'assembly_dataset.csv')
    ASSEMBLY_CANDIDATE_DATA_PATH = os.path.join(DATA_DIR, 'assembly_candidate_data.json')

    # Machine Learning model paths
    MODEL_PATH = os.path.join(ML_DIR, 'saved_model.pkl')
    PREPROCESSOR_PATH = os.path.join(ML_DIR, 'preprocessor.pkl')
    MODEL_METADATA_PATH = os.path.join(ML_DIR, 'model_metadata.json')

    # CORS & Security
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    JSON_SORT_KEYS = False

    # Server settings (Default to 5001 to avoid macOS AirPlay Receiver port 5000 collisions)
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5001))


class DevelopmentConfig(Config):
    """Development configuration with debug enabled."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration with strict settings."""
    DEBUG = False


class TestingConfig(Config):
    """Testing configuration with in-memory fixtures."""
    TESTING = True
    DEBUG = True


config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config(config_name=None):
    """Retrieve active configuration object based on environment."""
    if config_name is not None and config_name in config_by_name:
        return config_by_name[config_name]
    env = os.environ.get('FLASK_ENV', os.environ.get('ENV', 'development')).lower()
    return config_by_name.get(env, config_by_name['default'])
