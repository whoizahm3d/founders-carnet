
from pathlib import Path

import numpy as np
import pandas as pd
import scipy.sparse as sp

PROJECT_ROOT = Path(__file__).resolve().parents[3]

DATA_DIR = (
    PROJECT_ROOT
    / "classifier_data"
    / "preprocessed"
    / "startup_outcome_classifier"
)


def load_data():

    # Load feature matrices
    X_train = sp.load_npz(DATA_DIR / "X_train.npz")
    X_val = sp.load_npz(DATA_DIR / "X_val.npz")
    X_test = sp.load_npz(DATA_DIR / "X_test.npz")

    # Load target labels
    y_train = pd.read_csv(DATA_DIR / "y_train.csv").iloc[:, -1].to_numpy()
    y_val = pd.read_csv(DATA_DIR / "y_val.csv").iloc[:, -1].to_numpy()
    y_test = pd.read_csv(DATA_DIR / "y_test.csv").iloc[:, -1].to_numpy()

    # Convert labels to integers
    y_train = np.asarray(y_train, dtype=int)
    y_val = np.asarray(y_val, dtype=int)
    y_test = np.asarray(y_test, dtype=int)

    # Basic validation
    assert X_train.shape[0] == len(y_train), "Training data mismatch"
    assert X_val.shape[0] == len(y_val), "Validation data mismatch"
    assert X_test.shape[0] == len(y_test), "Test data mismatch"

    return {
        "X_train": X_train,
        "X_val": X_val,
        "X_test": X_test,
        "y_train": y_train,
        "y_val": y_val,
        "y_test": y_test
    }


if __name__ == "__main__":

    data = load_data()

    for key, value in data.items():
        print(f"{key}: {value.shape}")

    print("\nTraining class distribution:")
    print(pd.Series(data["y_train"]).value_counts().sort_index())

    print("\nValidation class distribution:")
    print(pd.Series(data["y_val"]).value_counts().sort_index())

    print("\nTest class distribution:")
    print(pd.Series(data["y_test"]).value_counts().sort_index())
