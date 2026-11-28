from collections.abc import Callable, Mapping
from pathlib import Path

import numpy as np
import pandas as pd
from ml.classifiers.common.baselines import make_dummy_baseline
from ml.classifiers.common.metrics import macro_f1
from ml.classifiers.common.report import write_results
from ml.classifiers.common.splits import (
    make_stratified_kfold,
    stratified_train_test_split,
)
from ml.classifiers.config import SEED
from sklearn.base import BaseEstimator
from sklearn.model_selection import cross_val_score

DataLoader = Callable[[], tuple[pd.DataFrame | pd.Series, pd.Series]]
FeatureInput = pd.DataFrame | pd.Series
ModelFactory = Callable[[FeatureInput, int], BaseEstimator]


def prepare_model_input(features: FeatureInput) -> FeatureInput:
    if isinstance(features, pd.DataFrame) and list(features.columns) == ["Text"]:
        return features["Text"].fillna("").astype(str)
    if isinstance(features, pd.Series):
        if features.name == "Text":
            return features.fillna("").astype(str)
        return features
    return features


def run_seeded_training(
    name: str,
    load_data: DataLoader,
    make_model: ModelFactory,
    *,
    seed_count: int,
    model_factories: Mapping[str, ModelFactory] | None = None,
    cv_folds: int = 5,
) -> Path:
    if not 3 <= seed_count <= 5:
        raise ValueError("seed_count must be between 3 and 5")
    if cv_folds < 2:
        raise ValueError("cv_folds must be at least 2")

    features, labels = load_data()
    features = prepare_model_input(features)
    labels = labels.to_numpy()
    factories = model_factories or {"LogisticRegression": make_model}
    seeds = list(range(SEED, SEED + seed_count))
    comparisons: dict[str, dict[str, list[float]]] = {
        "Dummy": {"cv": [], "test": []}
    }
    for model_name in factories:
        comparisons[model_name] = {"cv": [], "test": []}

    for seed in seeds:
        x_train, x_test, y_train, y_test = stratified_train_test_split(
            features, labels, seed=seed
        )
        splitter = make_stratified_kfold(n_splits=cv_folds, seed=seed)
        dummy_train = np.zeros((len(y_train), 1))
        dummy_test = np.zeros((len(y_test), 1))

        baseline = make_dummy_baseline()
        comparisons["Dummy"]["cv"].extend(
            cross_val_score(
                baseline,
                dummy_train,
                y_train,
                cv=splitter,
                scoring="f1_macro",
                error_score="raise",
            ).tolist()
        )
        baseline.fit(dummy_train, y_train)
        comparisons["Dummy"]["test"].append(
            macro_f1(y_test, baseline.predict(dummy_test))
        )

        for model_name, factory in factories.items():
            model = factory(x_train, seed)
            comparisons[model_name]["cv"].extend(
                cross_val_score(
                    model,
                    x_train,
                    y_train,
                    cv=splitter,
                    scoring="f1_macro",
                    error_score="raise",
                ).tolist()
            )
            model.fit(x_train, y_train)
            comparisons[model_name]["test"].append(
                macro_f1(y_test, model.predict(x_test))
            )

    print_comparison_table(comparisons)
    primary_model = next(iter(factories))

    return write_results(
        name,
        seeds,
        comparisons["Dummy"]["test"],
        comparisons[primary_model]["test"],
        comparison_scores=comparisons,
    )


def print_comparison_table(
    comparisons: Mapping[str, Mapping[str, list[float]]],
) -> None:
    print(f"{'Model':<22} {'CV macro F1':>19} {'Test macro F1':>19}")
    for model_name, scores in comparisons.items():
        cv_mean = np.mean(scores["cv"])
        cv_std = np.std(scores["cv"], ddof=1)
        test_mean = np.mean(scores["test"])
        test_std = np.std(scores["test"], ddof=1)
        print(
            f"{model_name:<22} "
            f"{cv_mean:>7.4f} ± {cv_std:<7.4f} "
            f"{test_mean:>7.4f} ± {test_std:<7.4f}"
        )
