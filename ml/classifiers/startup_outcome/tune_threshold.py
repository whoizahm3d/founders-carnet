
import json
import joblib
import numpy as np
import pandas as pd

from pathlib import Path
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    average_precision_score,
    balanced_accuracy_score,
    classification_report
)

from ml.classifiers.startup_outcome.load import load_data


# --------------------------------------------------
# PATHS
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[3]

ARTIFACT_DIR = (
    PROJECT_ROOT
    / "ml"
    / "classifiers"
    / "artifacts"
    / "startup_outcome"
    / "oversampling"
)

MODEL_PATH = ARTIFACT_DIR / "logistic_regression_oversampled.pkl"

RESULTS_PATH = ARTIFACT_DIR / "threshold_tuning_results.json"

BEST_RESULTS_PATH = ARTIFACT_DIR / "best_threshold_info.json"


# --------------------------------------------------
# LOAD MODEL AND VALIDATION DATA
# --------------------------------------------------

def main():

    print("Loading oversampled Logistic Regression model...")

    model = joblib.load(MODEL_PATH)

    print("Loading validation data...")

    data = load_data()

    X_val = data["X_val"]
    y_val = data["y_val"]

    print("\nValidation distribution:")
    print(pd.Series(y_val).value_counts().sort_index())

    # Probability of class 0 (Failed)
    failed_probabilities = model.predict_proba(X_val)[:, 0]

    # --------------------------------------------------
    # THRESHOLD EXPERIMENTS
    # --------------------------------------------------

    thresholds = [0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50]

    results = {}

    print("\nStarting threshold experiments...\n")

    for threshold in thresholds:

        # Predict failed if probability of class 0
        # is greater than or equal to threshold.
        y_pred = (failed_probabilities >= threshold).astype(int)

        # Convert predictions:
        # 1 = Failed
        # 0 = Successful
        y_pred = 1 - y_pred

        accuracy = accuracy_score(y_val, y_pred)

        macro_precision = precision_score(
            y_val, y_pred, average="macro", zero_division=0
        )

        macro_recall = recall_score(
            y_val, y_pred, average="macro", zero_division=0
        )

        macro_f1 = f1_score(
            y_val, y_pred, average="macro", zero_division=0
        )

        failed_precision = precision_score(
            y_val, y_pred, pos_label=0, zero_division=0
        )

        failed_recall = recall_score(
            y_val, y_pred, pos_label=0, zero_division=0
        )

        failed_f1 = f1_score(
            y_val, y_pred, pos_label=0, zero_division=0
        )

        failed_pr_auc = average_precision_score(
            (y_val == 0).astype(int),
            failed_probabilities
        )

        balanced_accuracy = balanced_accuracy_score(y_val, y_pred)

        results[str(threshold)] = {
            "accuracy": float(accuracy),
            "macro_precision": float(macro_precision),
            "macro_recall": float(macro_recall),
            "macro_f1": float(macro_f1),
            "failed_precision": float(failed_precision),
            "failed_recall": float(failed_recall),
            "failed_f1": float(failed_f1),
            "failed_pr_auc": float(failed_pr_auc),
            "balanced_accuracy": float(balanced_accuracy)
        }

        print(f"Threshold: {threshold:.2f}")
        print(f"Accuracy: {accuracy:.4f}")
        print(f"Macro F1: {macro_f1:.4f}")
        print(f"Failed Precision: {failed_precision:.4f}")
        print(f"Failed Recall: {failed_recall:.4f}")
        print(f"Failed F1: {failed_f1:.4f}")
        print(f"Failed PR-AUC: {failed_pr_auc:.4f}")
        print("-" * 50)

    # --------------------------------------------------
    # SELECT BEST THRESHOLD
    # --------------------------------------------------

    best_threshold = max(
        results,
        key=lambda t: results[t]["macro_f1"]
    )

    best_result = results[best_threshold]

    print("\nBEST THRESHOLD")
    print("=" * 50)

    print(f"Threshold: {best_threshold}")
    print(f"Macro F1: {best_result['macro_f1']:.4f}")
    print(f"Failed Precision: {best_result['failed_precision']:.4f}")
    print(f"Failed Recall: {best_result['failed_recall']:.4f}")
    print(f"Failed F1: {best_result['failed_f1']:.4f}")

    # --------------------------------------------------
    # SAVE RESULTS
    # --------------------------------------------------

    with open(RESULTS_PATH, "w") as file:
        json.dump(results, file, indent=4)

    best_info = {
        "best_threshold": float(best_threshold),
        "selection_metric": "validation_macro_f1",
        "best_metrics": best_result
    }

    with open(BEST_RESULTS_PATH, "w") as file:
        json.dump(best_info, file, indent=4)

    print("\nResults saved:")
    print(RESULTS_PATH)
    print(BEST_RESULTS_PATH)


if __name__ == "__main__":
    main()
