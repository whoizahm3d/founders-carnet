
from pathlib import Path
import json
import time

import joblib
import numpy as np

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    balanced_accuracy_score,
    average_precision_score,
    classification_report
)

from ml.classifiers.startup_outcome.load import load_data
from ml.classifiers.startup_outcome.features import build_models


PROJECT_ROOT = Path(__file__).resolve().parents[3]

ARTIFACT_DIR = (
    PROJECT_ROOT
    / "ml"
    / "classifiers"
    / "artifacts"
    / "startup_outcome"
)

ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def get_failed_scores(model, X):
    """
    Return scores for class 0 (Failed).
    Higher scores mean a higher likelihood of failure.
    """

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(X)
        failed_index = list(model.classes_).index(0)
        return probabilities[:, failed_index]

    decision_scores = model.decision_function(X)

    # For binary classification, decision_function scores
    # are oriented toward classes_[1].
    if list(model.classes_)[1] == 0:
        return decision_scores

    return -decision_scores


def main():

    print("Loading startup outcome data...")

    data = load_data()

    X_train = data["X_train"]
    X_val = data["X_val"]

    y_train = data["y_train"]
    y_val = data["y_val"]

    print(f"Training samples: {X_train.shape[0]}")
    print(f"Validation samples: {X_val.shape[0]}")
    print(f"Features: {X_train.shape[1]}")

    models = build_models()

    results = {}
    best_model = None
    best_model_name = None
    best_macro_f1 = -1

    print("\nStarting model training...\n")

    for name, model in models.items():

        print(f"Training {name}...")

        start_time = time.time()

        model.fit(X_train, y_train)

        training_time = time.time() - start_time

        # Validation predictions
        y_pred = model.predict(X_val)

        # Scores for failed class (0)
        failed_scores = get_failed_scores(model, X_val)

        # Validation metrics
        metrics = {
            "accuracy": float(accuracy_score(y_val, y_pred)),
            "macro_precision": float(
                precision_score(y_val, y_pred, average="macro", zero_division=0)
            ),
            "macro_recall": float(
                recall_score(y_val, y_pred, average="macro", zero_division=0)
            ),
            "macro_f1": float(
                f1_score(y_val, y_pred, average="macro", zero_division=0)
            ),
            "weighted_f1": float(
                f1_score(y_val, y_pred, average="weighted", zero_division=0)
            ),
            "balanced_accuracy": float(
                balanced_accuracy_score(y_val, y_pred)
            ),
            "failed_precision": float(
                precision_score(y_val, y_pred, pos_label=0, zero_division=0)
            ),
            "failed_recall": float(
                recall_score(y_val, y_pred, pos_label=0, zero_division=0)
            ),
            "failed_f1": float(
                f1_score(y_val, y_pred, pos_label=0, zero_division=0)
            ),
            "failed_pr_auc": float(
                average_precision_score(
                    (y_val == 0).astype(int),
                    failed_scores
                )
            ),
            "training_time_seconds": float(training_time)
        }

        results[name] = metrics

        # Save individual model
        joblib.dump(model, ARTIFACT_DIR / f"{name}.pkl")

        print(f"Accuracy: {metrics['accuracy']:.4f}")
        print(f"Macro F1: {metrics['macro_f1']:.4f}")
        print(f"Failed Recall: {metrics['failed_recall']:.4f}")
        print(f"Failed PR-AUC: {metrics['failed_pr_auc']:.4f}")
        print(f"Training time: {training_time:.2f} seconds")
        print("-" * 50)

        # Select best model using validation Macro F1
        if metrics["macro_f1"] > best_macro_f1:

            best_macro_f1 = metrics["macro_f1"]
            best_model = model
            best_model_name = name

    # Save all validation results
    with open(ARTIFACT_DIR / "validation_results.json", "w") as file:
        json.dump(results, file, indent=4)

    # Save best model
    joblib.dump(best_model, ARTIFACT_DIR / "best_model.pkl")

    best_model_info = {
        "best_model": best_model_name,
        "selection_metric": "macro_f1",
        "validation_macro_f1": float(best_macro_f1)
    }

    with open(ARTIFACT_DIR / "best_model_info.json", "w") as file:
        json.dump(best_model_info, file, indent=4)

    # Save best model validation classification report
    best_predictions = best_model.predict(X_val)

    report = classification_report(
        y_val,
        best_predictions,
        labels=[0, 1],
        target_names=["Failed", "Successful"],
        output_dict=True,
        zero_division=0
    )

    with open(ARTIFACT_DIR / "validation_classification_report.json", "w") as file:
        json.dump(report, file, indent=4)

    print("\nTraining completed!")
    print(f"Best model: {best_model_name}")
    print(f"Best validation Macro F1: {best_macro_f1:.4f}")
    print(f"\nArtifacts saved in:\n{ARTIFACT_DIR}")


if __name__ == "__main__":
    main()
