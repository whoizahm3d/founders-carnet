
from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay
)

from ml.classifiers.resume_role.load import load_data


# --------------------------------------------
# PATHS
# --------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[3]

ARTIFACT_DIR = (
    PROJECT_ROOT
    / "ml"
    / "classifiers"
    / "artifacts"
    / "resume_role"
)

ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


# --------------------------------------------
# LOAD TEST DATA AND BEST MODEL
# --------------------------------------------

data = load_data()

X_test = data["X_test"]
y_test = data["y_test"]

label_encoder = data["label_encoder"]

model = joblib.load(
    ARTIFACT_DIR / "best_model.pkl"
)

with open(ARTIFACT_DIR / "best_model_info.json", "r") as file:
    best_model_info = json.load(file)

best_model_name = best_model_info["best_model"]

print("Best model:", best_model_name)
print("Test data:", X_test.shape)


# --------------------------------------------
# PREDICTIONS
# --------------------------------------------

y_pred = model.predict(X_test)


# --------------------------------------------
# CALCULATE METRICS
# --------------------------------------------

metrics = {
    "accuracy": float(accuracy_score(y_test, y_pred)),
    "precision_macro": float(
        precision_score(y_test, y_pred, average="macro", zero_division=0)
    ),
    "recall_macro": float(
        recall_score(y_test, y_pred, average="macro", zero_division=0)
    ),
    "f1_macro": float(
        f1_score(y_test, y_pred, average="macro", zero_division=0)
    ),
    "f1_weighted": float(
        f1_score(y_test, y_pred, average="weighted", zero_division=0)
    )
}

print("\nTEST METRICS")
print("=" * 45)

for metric, value in metrics.items():
    print(f"{metric}: {value:.4f}")


# --------------------------------------------
# CLASSIFICATION REPORT
# --------------------------------------------

class_names = label_encoder.classes_.tolist()

report = classification_report(
    y_test,
    y_pred,
    labels=np.arange(len(class_names)),
    target_names=class_names,
    output_dict=True,
    zero_division=0
)

print("\nCLASSIFICATION REPORT")
print("=" * 45)

print(
    classification_report(
        y_test,
        y_pred,
        labels=np.arange(len(class_names)),
        target_names=class_names,
        zero_division=0
    )
)

with open(ARTIFACT_DIR / "test_classification_report.json", "w") as file:
    json.dump(report, file, indent=4)



# --------------------------------------------
# CONFUSION MATRIX (NORMALIZED)
# --------------------------------------------

# Raw confusion matrix
cm_counts = confusion_matrix(
    y_test,
    y_pred,
    labels=np.arange(len(class_names))
)

# Normalized confusion matrix (each row sums to 1)
cm_normalized = confusion_matrix(
    y_test,
    y_pred,
    labels=np.arange(len(class_names)),
    normalize="true"
)

# Save raw counts separately
cm_counts_df = pd.DataFrame(
    cm_counts,
    index=class_names,
    columns=class_names
)

cm_counts_df.to_csv(
    ARTIFACT_DIR / "test_confusion_matrix_counts.csv"
)

# Save normalized percentages
cm_normalized_df = pd.DataFrame(
    cm_normalized,
    index=class_names,
    columns=class_names
)

cm_normalized_df.to_csv(
    ARTIFACT_DIR / "test_confusion_matrix_normalized.csv"
)

# Create normalized confusion matrix plot
display = ConfusionMatrixDisplay(
    confusion_matrix=cm_normalized,
    display_labels=class_names
)

fig, ax = plt.subplots(figsize=(16, 12))

display.plot(
    ax=ax,
    cmap="Blues",
    values_format=".1%",
    xticks_rotation=45,
    colorbar=True
)

# Axis labels
ax.set_xlabel("Predicted label", fontsize=12, labelpad=15)
ax.set_ylabel("True label", fontsize=12, labelpad=15)

# Title
ax.set_title(
    f"Normalized Confusion Matrix - {best_model_name}",
    fontsize=15,
    pad=20
)

# Improve class label readability
plt.setp(
    ax.get_xticklabels(),
    rotation=45,
    ha="right",
    rotation_mode="anchor",
    fontsize=9
)

plt.setp(
    ax.get_yticklabels(),
    fontsize=9
)

# Adjust plot spacing
fig.subplots_adjust(
    left=0.28,
    bottom=0.30,
    right=0.97,
    top=0.90
)

# Save high-resolution figure
plt.savefig(
    ARTIFACT_DIR / "test_confusion_matrix.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
plt.close()


# --------------------------------------------
# SAVE TEST METRICS
# --------------------------------------------

with open(ARTIFACT_DIR / "test_metrics.json", "w") as file:
    json.dump(metrics, file, indent=4)


# --------------------------------------------
# FINAL OUTPUT
# --------------------------------------------

print("\nEvaluation completed.")
print("Best model:", best_model_name)
print("Artifacts saved in:")
print(ARTIFACT_DIR)
