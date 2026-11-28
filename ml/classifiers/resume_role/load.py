
from pathlib import Path
import joblib
import scipy.sparse as sp
import numpy as np


PROJECT_ROOT = Path(__file__).resolve().parents[3]

DATA_DIR = (
    PROJECT_ROOT
    / "classifier_data"
    / "preprocessed"
    / "resume_classifier"
)


def load_data():
    """Load preprocessed resume classification data."""

    # Load TF-IDF feature matrices
    X_train = sp.load_npz(DATA_DIR / "X_train_tfidf.npz")
    X_val = sp.load_npz(DATA_DIR / "X_val_tfidf.npz")
    X_test = sp.load_npz(DATA_DIR / "X_test_tfidf.npz")

    # Load labels
    splits = joblib.load(DATA_DIR / "data_splits.pkl")

    y_train = np.asarray(splits["y_train"])
    y_val = np.asarray(splits["y_val"])
    y_test = np.asarray(splits["y_test"])

    # Load label encoder
    label_encoder = joblib.load(
        DATA_DIR / "label_encoder.pkl"
    )

    return {
        "X_train": X_train,
        "X_val": X_val,
        "X_test": X_test,
        "y_train": y_train,
        "y_val": y_val,
        "y_test": y_test,
        "label_encoder": label_encoder
    }
