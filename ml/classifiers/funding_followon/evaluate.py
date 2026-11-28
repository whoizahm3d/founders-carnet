
import json
from pathlib import Path

import joblib
import pandas as pd

from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

from ml.classifiers.funding_followon.load import load_data


PROJECT_ROOT = Path(__file__).resolve().parents[3]

ARTIFACT_DIR = (
    PROJECT_ROOT
    / "ml"
    / "classifiers"
    / "artifacts"
    / "funding_followon"
)

ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def get_positive_scores(model, X):
    if hasattr(model, "predict_proba"):
        return model.predict_proba(X)[:, 1]

    scores = model.decision_function(X)

    if model.classes_[1] == 1:
        return scores

    return -scores


def main():
    data = load_data()

    X_test = data["X_test"]
    y_test = data["y_test"]

    print("\nLoading best model...")

    model = joblib.load(ARTIFACT_DIR / "best_model.pkl")

    with open(ARTIFACT_DIR / "best_model_info.json", "r") as file:
        model_info = json.load(file)

    print("Selected model:", model_info["best_model"])

    print("\nEvaluating on test data...")

    predictions = model.predict(X_test)
    scores = get_positive_scores(model, X_test)

    metrics = {
        "model": model_info["best_model"],
        "accuracy": float(accuracy_score(y_test, predictions)),
        "macro_precision": float(
            precision_score(y_test, predictions, average="macro", zero_division=0)
        ),
        "macro_recall": float(
            recall_score(y_test, predictions, average="macro", zero_division=0)
        ),
        "macro_f1": float(
            f1_score(y_test, predictions, average="macro", zero_division=0)
        ),
        "weighted_f1": float(
            f1_score(y_test, predictions, average="weighted", zero_division=0)
        ),
        "balanced_accuracy": float(
            balanced_accuracy_score(y_test, predictions)
        ),
        "follow_on_precision": float(
            precision_score(y_test, predictions, pos_label=1, zero_division=0)
        ),
        "follow_on_recall": float(
            recall_score(y_test, predictions, pos_label=1, zero_division=0)
        ),
        "follow_on_f1": float(
            f1_score(y_test, predictions, pos_label=1, zero_division=0)
        ),
        "follow_on_pr_auc": float(
            average_precision_score(y_test, scores)
        ),
    }

    report = classification_report(
        y_test,
        predictions,
        labels=[0, 1],
        target_names=["No Follow-on Funding", "Follow-on Funding"],
        output_dict=True,
        zero_division=0,
    )

    matrix = confusion_matrix(y_test, predictions, labels=[0, 1])

    matrix_df = pd.DataFrame(
        matrix,
        index=["Actual_No_Follow_on", "Actual_Follow_on"],
        columns=["Predicted_No_Follow_on", "Predicted_Follow_on"],
    )

    with open(ARTIFACT_DIR / "test_metrics.json", "w") as file:
        json.dump(metrics, file, indent=4)

    with open(ARTIFACT_DIR / "test_classification_report.json", "w") as file:
        json.dump(report, file, indent=4)

    matrix_df.to_csv(ARTIFACT_DIR / "test_confusion_matrix.csv")

    print("\n" + "=" * 55)
    print("STARTUP INVESTMENT CLASSIFIER - TEST RESULTS")
    print("=" * 55)

    for metric, value in metrics.items():
        if isinstance(value, float):
            print(f"{metric}: {value:.4f}")
        else:
            print(f"{metric}: {value}")

    print("\nCLASSIFICATION REPORT")
    print("=" * 55)

    print(
        classification_report(
            y_test,
            predictions,
            labels=[0, 1],
            target_names=["No Follow-on Funding", "Follow-on Funding"],
            zero_division=0,
        )
    )

    print("\nCONFUSION MATRIX")
    print("=" * 55)
    print(matrix_df)

    print("\nResults saved in:", ARTIFACT_DIR)


if __name__ == "__main__":
    main()
