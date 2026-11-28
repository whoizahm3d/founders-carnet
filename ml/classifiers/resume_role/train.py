
from pathlib import Path
import json
import joblib

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score
)

from ml.classifiers.resume_role.load import load_data
from ml.classifiers.resume_role.features import build_models


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
# LOAD DATA
# --------------------------------------------

data = load_data()

X_train = data["X_train"]
X_val = data["X_val"]

y_train = data["y_train"]
y_val = data["y_val"]

print("Training data:", X_train.shape)
print("Validation data:", X_val.shape)


# --------------------------------------------
# BUILD MODELS
# --------------------------------------------

models = build_models()

results = {}


# --------------------------------------------
# TRAIN AND VALIDATE
# --------------------------------------------

for name, model in models.items():

    print("\n" + "=" * 50)
    print("Training:", name)
    print("=" * 50)

    model.fit(X_train, y_train)

    y_pred = model.predict(X_val)

    metrics = {
        "accuracy": float(accuracy_score(y_val, y_pred)),
        "precision_macro": float(
            precision_score(y_val, y_pred, average="macro", zero_division=0)
        ),
        "recall_macro": float(
            recall_score(y_val, y_pred, average="macro", zero_division=0)
        ),
        "f1_macro": float(
            f1_score(y_val, y_pred, average="macro", zero_division=0)
        ),
        "f1_weighted": float(
            f1_score(y_val, y_pred, average="weighted", zero_division=0)
        )
    }

    results[name] = metrics

    # Save individual trained model
    model_path = ARTIFACT_DIR / f"{name}.pkl"
    joblib.dump(model, model_path)

    print("Validation metrics:")
    for metric, value in metrics.items():
        print(f"{metric}: {value:.4f}")


# --------------------------------------------
# SELECT BEST MODEL USING MACRO F1
# --------------------------------------------

best_model_name = max(
    results,
    key=lambda name: results[name]["f1_macro"]
)

best_model = models[best_model_name]

joblib.dump(
    best_model,
    ARTIFACT_DIR / "best_model.pkl"
)

# Save best model information
best_model_info = {
    "best_model": best_model_name,
    "selection_metric": "validation_macro_f1",
    "validation_metrics": results[best_model_name]
}

with open(ARTIFACT_DIR / "best_model_info.json", "w") as file:
    json.dump(best_model_info, file, indent=4)


# --------------------------------------------
# SAVE ALL VALIDATION RESULTS
# --------------------------------------------

with open(ARTIFACT_DIR / "validation_results.json", "w") as file:
    json.dump(results, file, indent=4)


# --------------------------------------------
# DISPLAY RESULTS
# --------------------------------------------

print("\n" + "=" * 50)
print("MODEL COMPARISON")
print("=" * 50)

for name, metrics in results.items():
    print(
        f"{name}: "
        f"Macro F1 = {metrics['f1_macro']:.4f}"
    )

print("\nBest model:", best_model_name)
print("Best validation Macro F1:", 
      f"{results[best_model_name]['f1_macro']:.4f}")

print("\nArtifacts saved in:")
print(ARTIFACT_DIR)
