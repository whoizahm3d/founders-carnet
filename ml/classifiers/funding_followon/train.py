
import json
import time
from pathlib import Path

import joblib
import numpy as np

from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    classification_report,
)

from ml.classifiers.funding_followon.load import load_data
from ml.classifiers.funding_followon.features import get_models


PROJECT_ROOT = Path(__file__).resolve().parents[3]
ARTIFACT_DIR = PROJECT_ROOT / "ml" / "classifiers" / "artifacts" / "funding_followon"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def get_positive_scores(model, X):
    if hasattr(model, "predict_proba"):
        return model.predict_proba(X)[:, 1]

    scores = model.decision_function(X)

    if len(model.classes_) == 2 and model.classes_[1] == 1:
        return scores

    return -scores


def evaluate_validation(model, X, y):
    predictions = model.predict(X)
    scores = get_positive_scores(model, X)

    return {
        "accuracy": float(accuracy_score(y, predictions)),
        "macro_precision": float(precision_score(y, predictions, average="macro", zero_division=0)),
        "macro_recall": float(recall_score(y, predictions, average="macro", zero_division=0)),
        "macro_f1": float(f1_score(y, predictions, average="macro", zero_division=0)),
        "weighted_f1": float(f1_score(y, predictions, average="weighted", zero_division=0)),
        "balanced_accuracy": float(balanced_accuracy_score(y, predictions)),
        "follow_on_precision": float(precision_score(y, predictions, pos_label=1, zero_division=0)),
        "follow_on_recall": float(recall_score(y, predictions, pos_label=1, zero_division=0)),
        "follow_on_f1": float(f1_score(y, predictions, pos_label=1, zero_division=0)),
        "follow_on_pr_auc": float(average_precision_score(y, scores)),
    }


def main():
    data = load_data()

    X_train = data["X_train"]
    X_val = data["X_val"]
    y_train = data["y_train"]
    y_val = data["y_val"]

    models = get_models()
    results = {}

    best_model = None
    best_model_name = None
    best_macro_f1 = -1

    print("\nStarting model training...\n")

    for name, model in models.items():
        print(f"Training {name}...")

        start_time = time.perf_counter()
        model.fit(X_train, y_train)
        training_time = time.perf_counter() - start_time

        metrics = evaluate_validation(model, X_val, y_val)
        metrics["training_time_seconds"] = round(training_time, 2)

        results[name] = metrics

        joblib.dump(model, ARTIFACT_DIR / f"{name}.pkl")

        print(f"Accuracy: {metrics['accuracy']:.4f}")
        print(f"Macro F1: {metrics['macro_f1']:.4f}")
        print(f"Follow-on Recall: {metrics['follow_on_recall']:.4f}")
        print(f"PR-AUC: {metrics['follow_on_pr_auc']:.4f}")
        print(f"Training time: {training_time:.2f} seconds\n")

        if metrics["macro_f1"] > best_macro_f1:
            best_macro_f1 = metrics["macro_f1"]
            best_model = model
            best_model_name = name

    joblib.dump(best_model, ARTIFACT_DIR / "best_model.pkl")

    best_info = {
        "best_model": best_model_name,
        "selection_metric": "validation_macro_f1",
        "validation_macro_f1": best_macro_f1,
        "positive_class": 1,
        "positive_class_meaning": "Follow-on funding",
    }

    with open(ARTIFACT_DIR / "best_model_info.json", "w") as file:
        json.dump(best_info, file, indent=4)

    with open(ARTIFACT_DIR / "validation_results.json", "w") as file:
        json.dump(results, file, indent=4)

    print("=" * 50)
    print("TRAINING COMPLETED")
    print("=" * 50)
    print("Best model:", best_model_name)
    print("Validation Macro F1:", round(best_macro_f1, 4))
    print("Artifacts saved in:", ARTIFACT_DIR)


if __name__ == "__main__":
    main()
