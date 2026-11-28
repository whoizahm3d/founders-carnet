from typing import TypeVar

from sklearn.model_selection import StratifiedKFold, train_test_split

Features = TypeVar("Features")
Labels = TypeVar("Labels")


def stratified_train_test_split(
    features: Features,
    labels: Labels,
    *,
    test_size: float = 0.2,
    seed: int = 42,
) -> tuple[Features, Features, Labels, Labels]:
    return train_test_split(
        features,
        labels,
        test_size=test_size,
        random_state=seed,
        stratify=labels,
    )


def make_stratified_kfold(
    *, n_splits: int = 5, seed: int = 42
) -> StratifiedKFold:
    return StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=seed)
