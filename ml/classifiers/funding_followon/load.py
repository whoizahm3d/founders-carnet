
from pathlib import Path

import pandas as pd
from scipy.sparse import load_npz


PROJECT_ROOT = Path(__file__).resolve().parents[3]

DATA_DIR = (
    PROJECT_ROOT
    / "classifier_data"
    / "preprocessed"
    / "startup_investment_classifier"
)


def load_data():
    print("Loading Startup Investment data...")

    X_train = load_npz(DATA_DIR / "X_train.npz")
    X_val = load_npz(DATA_DIR / "X_val.npz")
    X_test = load_npz(DATA_DIR / "X_test.npz")

    y_train = pd.read_csv(DATA_DIR / "y_train.csv").iloc[:, -1].astype(int)
    y_val = pd.read_csv(DATA_DIR / "y_val.csv").iloc[:, -1].astype(int)
    y_test = pd.read_csv(DATA_DIR / "y_test.csv").iloc[:, -1].astype(int)

    assert X_train.shape[0] == len(y_train)
    assert X_val.shape[0] == len(y_val)
    assert X_test.shape[0] == len(y_test)

    print("\nDataset shapes:")
    print("Training:", X_train.shape)
    print("Validation:", X_val.shape)
    print("Testing:", X_test.shape)

    print("\nTraining distribution:")
    print(y_train.value_counts().sort_index())

    print("\nValidation distribution:")
    print(y_val.value_counts().sort_index())

    print("\nTesting distribution:")
    print(y_test.value_counts().sort_index())

    return {
        "X_train": X_train,
        "X_val": X_val,
        "X_test": X_test,
        "y_train": y_train,
        "y_val": y_val,
        "y_test": y_test,
    }


if __name__ == "__main__":
    load_data()
