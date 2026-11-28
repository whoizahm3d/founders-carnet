
import json
import joblib
import pandas as pd

from pathlib import Path
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
    balanced_accuracy_score,
    average_precision_score
)

from ml.classifiers.startup_outcome.load import load_data


PROJECT_ROOT = Path(__file__).resolve().parents[3]

ARTIFACT_DIR = (
    PROJECT_ROOT / "ml" / "classifiers" / "artifacts" / "startup_outcome"
)


def main():

    print("Loading baseline model...")

    model = joblib.load(ARTIFACT_DIR / "best_model.pkl")

    data = load_data()

    X_test = data["X_test"]
    y_test = data["y_test"]

    print("\nGenerating predictions...")

    y_pred = model.predict(X_test)
    failed_scores = model.predict_proba(X_test)[:, 0] if hasattr(
        model, "predict_proba"
    ) else -model.decision_function(X_test)

    metrics = {
        "accuracy": accuracy_score(y_test, y_pred),
        "macro_precision": precision_score(
            y_test, y_pred, average="macro", zero_division=0
        ),
        "macro_recall": recall_score(
            y_test, y_pred, average="macro", zero_division=0
        ),
        "macro_f1": f1_score(
            y_test, y_pred, average="macro", zero_division=0
        ),
        "weighted_f1": f1_score(
            y_test, y_pred, average="weighted", zero_division=0
        ),
        "balanced_accuracy": balanced_accuracy_score(y_test, y_pred),
        "failed_precision": precision_score(
            y_test, y_pred, pos_label=0, zero_division=0
        ),
        "failed_recall": recall_score(
            y_test, y_pred, pos_label=0, zero_division=0
        ),
        "failed_f1": f1_score(
            y_test, y_pred, pos_label=0, zero_division=0
        ),
        "failed_pr_auc": average_precision_score(
            (y_test == 0).astype(int), failed_scores
        )
    }

    report = classification_report(
        y_test,
        y_pred,
        labels=[0, 1],
        target_names=["Failed", "Successful"],
        output_dict=True,
        zero_division=0
    )

    print("\nCLASSIFICATION REPORT")
    print(classification_report(
        y_test,
        y_pred,
        labels=[0, 1],
        target_names=["Failed", "Successful"],
        zero_division=0
    ))

    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])

    cm_df = pd.DataFrame(
        cm,
        index=["Actual Failed", "Actual Successful"],
        columns=["Predicted Failed", "Predicted Successful"]
    )

    print("\nCONFUSION MATRIX")
    print(cm_df)

    print("\nOVERALL METRICS")
    for key, value in metrics.items():
        print(f"{key}: {value:.4f}")

    with open(ARTIFACT_DIR / "test_metrics.json", "w") as f:
        json.dump(metrics, f, indent=4)

    with open(ARTIFACT_DIR / "test_classification_report.json", "w") as f:
        json.dump(report, f, indent=4)

    cm_df.to_csv(ARTIFACT_DIR / "test_confusion_matrix.csv")

    print("\nBaseline evaluation completed!")


if __name__ == "__main__":
    main()
