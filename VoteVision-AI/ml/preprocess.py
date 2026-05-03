"""
VoteVision AI - Data Preprocessing Pipeline
Handles data cleaning, feature engineering, and encoding for the election prediction model.
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler
import os
import json
import pickle


class ElectionPreprocessor:
    """Preprocessor for Indian General Election data."""

    def __init__(self):
        self.label_encoders = {}
        self.scaler = StandardScaler()
        self.feature_columns = [
            'previous_vote_share', 'turnout', 'swing', 'margin_previous',
            'incumbency', 'urban_rural_ratio', 'literacy_rate',
            'population_density', 'num_candidates',
            'party_encoded', 'alliance_encoded', 'state_encoded'
        ]
        self.categorical_columns = ['party', 'alliance', 'state']
        self.is_fitted = False

    def load_data(self, filepath):
        """Load the election dataset from CSV."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Dataset not found at {filepath}")

        df = pd.read_csv(filepath)
        print(f"Loaded dataset with {len(df)} rows and {len(df.columns)} columns")
        return df

    def clean_data(self, df):
        """Clean the dataset: handle missing values, remove duplicates, fix types."""
        df = df.copy()

        # Remove exact duplicates
        initial_rows = len(df)
        df = df.drop_duplicates()
        removed = initial_rows - len(df)
        if removed > 0:
            print(f"Removed {removed} duplicate rows")

        # Handle missing numerical values with median imputation
        numerical_cols = ['previous_vote_share', 'turnout', 'swing',
                          'margin_previous', 'urban_rural_ratio',
                          'literacy_rate', 'population_density', 'num_candidates']
        for col in numerical_cols:
            if col in df.columns and df[col].isnull().any():
                median_val = df[col].median()
                df[col].fillna(median_val, inplace=True)
                print(f"Filled {col} missing values with median: {median_val}")

        # Handle missing categorical values with mode
        for col in ['party', 'alliance', 'state', 'constituency', 'candidate_name']:
            if col in df.columns and df[col].isnull().any():
                mode_val = df[col].mode()[0]
                df[col].fillna(mode_val, inplace=True)
                print(f"Filled {col} missing values with mode: {mode_val}")

        # Ensure correct data types
        df['incumbency'] = df['incumbency'].astype(int)
        df['winner'] = df['winner'].astype(int)
        df['num_candidates'] = df['num_candidates'].astype(int)

        # Clip vote shares to valid range
        df['previous_vote_share'] = df['previous_vote_share'].clip(0, 100)
        df['turnout'] = df['turnout'].clip(0, 100)

        print(f"Cleaned dataset: {len(df)} rows")
        return df

    def engineer_features(self, df):
        """Create additional features from existing data."""
        df = df.copy()

        # Vote share strength indicator
        df['vote_strength'] = pd.cut(
            df['previous_vote_share'],
            bins=[0, 20, 35, 50, 100],
            labels=[0, 1, 2, 3]
        ).astype(int)

        # Swing momentum (positive = gaining, negative = losing)
        df['swing_momentum'] = np.where(df['swing'] > 0, 1, 0)

        # Competitive index: inverse of margin
        df['competitiveness'] = 100 - df['margin_previous']
        df['competitiveness'] = df['competitiveness'].clip(0, 100)

        # Urbanization-literacy interaction
        df['urban_literacy_index'] = df['urban_rural_ratio'] * df['literacy_rate'] / 100

        # Effective vote share (adjusted by swing)
        df['effective_vote_share'] = df['previous_vote_share'] + df['swing']
        df['effective_vote_share'] = df['effective_vote_share'].clip(0, 100)

        return df

    def encode_categoricals(self, df, fit=True):
        """Encode categorical variables using LabelEncoder."""
        df = df.copy()

        for col in self.categorical_columns:
            encoded_col = f'{col}_encoded'
            if fit:
                le = LabelEncoder()
                df[encoded_col] = le.fit_transform(df[col].astype(str))
                self.label_encoders[col] = le
            else:
                le = self.label_encoders[col]
                # Handle unseen labels gracefully
                known_labels = set(le.classes_)
                df[encoded_col] = df[col].apply(
                    lambda x: le.transform([x])[0] if x in known_labels else -1
                )

        return df

    def scale_features(self, df, fit=True):
        """Scale numerical features using StandardScaler."""
        df = df.copy()
        feature_data = df[self.feature_columns].values

        if fit:
            scaled = self.scaler.fit_transform(feature_data)
        else:
            scaled = self.scaler.transform(feature_data)

        df[self.feature_columns] = scaled
        return df

    def get_features_and_target(self, df):
        """Extract feature matrix and target vector."""
        X = df[self.feature_columns].values
        y = df['winner'].values
        return X, y

    def preprocess_for_training(self, filepath):
        """Full preprocessing pipeline for training."""
        df = self.load_data(filepath)
        df = self.clean_data(df)
        df = self.engineer_features(df)
        df = self.encode_categoricals(df, fit=True)

        # Get features and target BEFORE scaling
        X_unscaled = df[self.feature_columns].values
        y = df['winner'].values

        # Scale features
        X = self.scaler.fit_transform(X_unscaled)

        self.is_fitted = True
        print(f"Preprocessing complete. Features shape: {X.shape}")
        return X, y, df

    def preprocess_single(self, data_dict):
        """
        Preprocess a single prediction input.
        data_dict should contain: party, alliance, state, and numerical features.
        """
        if not self.is_fitted:
            raise RuntimeError("Preprocessor must be fitted before making predictions")

        df = pd.DataFrame([data_dict])
        df = self.encode_categoricals(df, fit=False)

        # Ensure all feature columns exist
        for col in self.feature_columns:
            if col not in df.columns:
                df[col] = 0

        feature_data = df[self.feature_columns].values
        scaled = self.scaler.transform(feature_data)
        return scaled

    def save(self, filepath):
        """Save the fitted preprocessor to disk."""
        state = {
            'label_encoders': self.label_encoders,
            'scaler': self.scaler,
            'feature_columns': self.feature_columns,
            'categorical_columns': self.categorical_columns,
            'is_fitted': self.is_fitted
        }
        with open(filepath, 'wb') as f:
            pickle.dump(state, f)
        print(f"Preprocessor saved to {filepath}")

    @classmethod
    def load(cls, filepath):
        """Load a fitted preprocessor from disk."""
        preprocessor = cls()
        with open(filepath, 'rb') as f:
            state = pickle.load(f)
        preprocessor.label_encoders = state['label_encoders']
        preprocessor.scaler = state['scaler']
        preprocessor.feature_columns = state['feature_columns']
        preprocessor.categorical_columns = state['categorical_columns']
        preprocessor.is_fitted = state['is_fitted']
        print(f"Preprocessor loaded from {filepath}")
        return preprocessor


if __name__ == '__main__':
    # Test the preprocessor
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
    csv_path = os.path.join(data_dir, 'cleaned_dataset.csv')

    preprocessor = ElectionPreprocessor()
    X, y, df = preprocessor.preprocess_for_training(csv_path)

    print(f"\nFeature matrix shape: {X.shape}")
    print(f"Target distribution: {np.bincount(y)}")
    print(f"Feature columns: {preprocessor.feature_columns}")

    # Save preprocessor
    save_path = os.path.join(os.path.dirname(__file__), 'preprocessor.pkl')
    preprocessor.save(save_path)
