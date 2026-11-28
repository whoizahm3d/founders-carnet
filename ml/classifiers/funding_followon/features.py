
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.svm import LinearSVC


def get_models():
    models = {
       "logistic_regression": LogisticRegression(
            class_weight="balanced",
            max_iter=10000,
            tol=1e-3,
            random_state=42,
        ),
        "linear_svm": LinearSVC(
            class_weight="balanced",
            max_iter=5000,
            random_state=42,
        ),

        "sgd_classifier": SGDClassifier(
            loss="log_loss",
            class_weight="balanced",
            max_iter=2000,
            random_state=42,
            tol=1e-3,
        ),
    }

    return models
