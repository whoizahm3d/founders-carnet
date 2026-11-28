
from pathlib import Path
import json
import time

import joblib
import numpy as np

from imblearn.over_sampling import RandomOverSampler

from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.svm import LinearSVC

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


PROJECT_ROOT = Path(__file__).resolve().parents[3]

ARTIFACT_DIR = (
    PROJECT_ROOT
    / "ml"
    / "classifiers"
    / "artifacts"
    / "startup_outcome"
    / "oversampling"
)

ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def get_failed_scores(model, X):

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(X)
        failed_index = list(model.classes_).index(0)
        return probabilities[:, failed_index]

    scores = model.decision_function(X)

    if list(model.classes_)[1] == 0:
        return scores

    return -scores


def main():

    print("Loading data...")

    data = load_data()

    X_train = data["X_train"]
    X_val = data["X_val"]

    y_train = data["y_train"]
    y_val = data["y_val"]

    print("Original training distribution:")
    print("Failed:", np.sum(y_train == 0))
    print("Successful:", np.sum(y_train == 1))

    # Oversampling training data only
    print("\nApplying Random Oversampling...")

    sampler = RandomOverSampler(
        sampling_strategy=0.5,
        random_state=42
    )

    X_train_resampled, y_train_resampled = sampler.fit_resample(
        X_train,
        y_train
    )

    print("\nResampled training distribution:")
    print("Failed:", np.sum(y_train_resampled == 0))
    print("Successful:", np.sum(y_train_resampled == 1))

    # Models trained on oversampled data.
    # No class_weight balancing because oversampling already
    # changes the class distribution.
    models = {
        "logistic_regression": LogisticRegression(
            max_iter=5000,
            random_state=42
        ),

        "linear_svm": LinearSVC(
            max_iter=5000,
            random_state=42
        ),

        "sgd_classifier": SGDClassifier(
            loss="log_loss",
            max_iter=2000,
            random_state=42,
            tol=1e-3
        )
    }

    results = {}

    best_model = None
    best_model_name = None
    best_macro_f1 = -1

    print("\nStarting oversampling experiments...\n")

    for name, model in models.items():

        print(f"Training {name} with oversampling...")

        start_time = time.time()

        model.fit(X_train_resampled, y_train_resampled)

        training_time = time.time() - start_time

        y_pred = model.predict(X_val)
        failed_scores = get_failed_scores(model, X_val)

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

        joblib.dump(
            model,
            ARTIFACT_DIR / f"{name}_oversampled.pkl"
        )

        print(f"Accuracy: {metrics['accuracy']:.4f}")
        print(f"Macro F1: {metrics['macro_f1']:.4f}")
        print(f"Failed Recall: {metrics['failed_recall']:.4f}")
        print(f"Failed PR-AUC: {metrics['failed_pr_auc']:.4f}")
        print(f"Training time: {training_time:.2f} seconds")
        print("-" * 50)

        if metrics["macro_f1"] > best_macro_f1:
            best_macro_f1 = metrics["macro_f1"]
            best_model = model
            best_model_name = name

    # Save experiment results separately from baseline results
    with open(ARTIFACT_DIR / "oversampling_results.json", "w") as file:
        json.dump(results, file, indent=4)

    joblib.dump(
        best_model,
        ARTIFACT_DIR / "best_oversampled_model.pkl"
    )

    best_info = {
        "best_model": best_model_name,
        "selection_metric": "macro_f1",
        "validation_macro_f1": float(best_macro_f1),
        "sampling_strategy": 0.5
    }

    with open(ARTIFACT_DIR / "best_oversampled_model_info.json", "w") as file:
        json.dump(best_info, file, indent=4)

    print("\nOversampling experiments completed!")
    print("Best model:", best_model_name)
    print(f"Best validation Macro F1: {best_macro_f1:.4f}")
    print("\nResults saved in:")
    print(ARTIFACT_DIR)


if __name__ == "__main__":
    main()
