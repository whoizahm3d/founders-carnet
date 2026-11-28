
from numpy.typing import ArrayLike
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    confusion_matrix,
    f1_score,
)


def macro_f1(y_true: ArrayLike, y_pred: ArrayLike) -> float:
    return float(f1_score(y_true, y_pred, average="macro", zero_division=0))


def positive_class_scores(
    estimator: object,
    features: ArrayLike,
    *,
    positive_label: object,
) -> ArrayLike:
    classes = getattr(estimator, "classes_", None)
    if classes is None or positive_label not in classes:
        raise ValueError(f"positive label {positive_label!r} is not in estimator classes")

    if hasattr(estimator, "predict_proba"):
        probabilities = estimator.predict_proba(features)
        return probabilities[:, list(classes).index(positive_label)]
    if hasattr(estimator, "decision_function"):
        decision_scores = estimator.decision_function(features)
        if len(classes) != 2:
            raise ValueError("decision scores are only supported for binary classifiers")
        return decision_scores if classes[1] == positive_label else -decision_scores
    raise TypeError("estimator must implement predict_proba or decision_function")


def classification_metrics(
    y_true: ArrayLike,
    y_pred: ArrayLike,
    *,
    binary_scores: ArrayLike | None = None,
    positive_label: object = 1,
) -> dict[str, object]:
    labels = sorted(set(y_true) | set(y_pred))
    result: dict[str, object] = {
        "macro_f1": macro_f1(y_true, y_pred),
        "per_class_report": classification_report(
            y_true, y_pred, output_dict=True, zero_division=0
        ),
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=labels).tolist(),
        "labels": [str(label) for label in labels],
    }
    if binary_scores is not None:
        if len(labels) != 2:
            raise ValueError("PR-AUC requires exactly two classes")
        if positive_label not in labels:
            raise ValueError(f"positive label {positive_label!r} is not in the targets")
        result["pr_auc"] = float(
            average_precision_score(
                [int(label == positive_label) for label in y_true], binary_scores
            )
        )
    return result
