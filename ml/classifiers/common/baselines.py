from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC


def make_dummy_baseline() -> DummyClassifier:
    return DummyClassifier(strategy="most_frequent")


def make_logistic_regression_baseline(seed: int = 42) -> LogisticRegression:
    return LogisticRegression(
        class_weight="balanced",
        max_iter=1000,
        random_state=seed,
    )


def make_linear_svc_baseline(seed: int = 42) -> LinearSVC:
    return LinearSVC(class_weight="balanced", random_state=seed)
