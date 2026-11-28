
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.naive_bayes import MultinomialNB


def build_models():
    """Create models for resume classification."""

    models = {
        "logistic_regression": LogisticRegression(
            max_iter=2000,
            class_weight="balanced",
            random_state=42
        ),

        "linear_svm": LinearSVC(
            class_weight="balanced",
            random_state=42,
            max_iter=5000
        ),

        "multinomial_nb": MultinomialNB(
            alpha=0.5
        )
    }

    return models
