from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from ml.classifiers.common.splits import (
    make_stratified_kfold,
    stratified_train_test_split,
)
from ml.classifiers.common import training
from ml.classifiers.common.training import prepare_model_input
from ml.classifiers.resume_role.features import make_model_pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline


def test_train_test_split_is_stratified_and_disjoint() -> None:
    features = np.arange(80).reshape(40, 2)
    labels = np.repeat(["alpha", "beta"], 20)

    x_train, x_test, y_train, y_test = stratified_train_test_split(
        features, labels, test_size=0.25, seed=7
    )

    assert len(x_test) == len(y_test) == 10
    assert len(x_train) == len(y_train) == 30
    assert set(y_train) == set(y_test) == {"alpha", "beta"}
    assert not set(x_train[:, 0]).intersection(x_test[:, 0])
    assert np.count_nonzero(y_test == "alpha") == 5
    assert np.count_nonzero(y_test == "beta") == 5


def test_stratified_kfold_has_disjoint_balanced_folds() -> None:
    features = np.arange(80).reshape(40, 2)
    labels = np.repeat(["alpha", "beta"], 20)
    splitter = make_stratified_kfold(n_splits=4, seed=7)
    observed_test_rows: list[int] = []

    for train_indices, test_indices in splitter.split(features, labels):
        assert not set(train_indices).intersection(test_indices)
        assert np.count_nonzero(labels[test_indices] == "alpha") == 5
        assert np.count_nonzero(labels[test_indices] == "beta") == 5
        observed_test_rows.extend(test_indices.tolist())

    assert sorted(observed_test_rows) == list(range(len(labels)))


def test_resume_training_input_is_one_dimensional_strings() -> None:
    features = pd.DataFrame(
        {"Text": [f"resume {index}" for index in range(30)]}
    )
    labels = np.repeat(["a", "b"], 15)
    split = stratified_train_test_split(
        prepare_model_input(features), labels, test_size=0.2, seed=7
    )
    x_train, _, y_train, _ = split

    assert isinstance(x_train, pd.Series)
    assert x_train.ndim == 1
    assert len(x_train) == len(y_train) == 24
    assert all(isinstance(text, str) for text in x_train)


def test_resume_pipeline_rejects_too_few_training_documents() -> None:
    with pytest.raises(ValueError, match="at least 2 training documents"):
        make_model_pipeline(n_documents=1)


def test_model_input_keeps_tabular_features_two_dimensional() -> None:
    features = pd.DataFrame({"amount": [1, 2], "sector": ["a", "b"]})

    model_input = prepare_model_input(features)

    assert isinstance(model_input, pd.DataFrame)
    assert model_input.shape == (2, 2)


def test_model_input_preserves_dataframe_with_text_and_tabular_columns() -> None:
    features = pd.DataFrame(
        {"Text": ["one resume", "another resume"], "amount": [1, 2]}
    )

    model_input = prepare_model_input(features)

    assert isinstance(model_input, pd.DataFrame)
    assert model_input.shape == (2, 2)


def test_seeded_resume_training_passes_one_dimensional_train_text(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    texts = [
        f"resume {label} document {index}"
        for label in ("a", "b")
        for index in range(15)
    ]
    features = pd.DataFrame({"Text": texts})
    labels = pd.Series(["a"] * 15 + ["b"] * 15)
    observed_train_inputs: list[pd.Series] = []

    def make_text_model(x_train: pd.Series, seed: int) -> Pipeline:
        observed_train_inputs.append(x_train)
        return Pipeline(
            [
                ("tfidf", TfidfVectorizer(min_df=1)),
                ("classifier", LogisticRegression(random_state=seed)),
            ]
        )

    monkeypatch.setattr(
        training,
        "write_results",
        lambda *args, **kwargs: tmp_path / "resume_role_results.json",
    )

    training.run_seeded_training(
        "resume_role",
        lambda: (features, labels),
        make_text_model,
        seed_count=3,
        cv_folds=3,
    )

    assert len(observed_train_inputs) == 3
    for x_train in observed_train_inputs:
        assert x_train.ndim == 1
        assert len(x_train) == 24
        assert all(isinstance(text, str) for text in x_train)


def test_seeded_training_preserves_tabular_train_features(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    features = pd.DataFrame({"amount": np.arange(30)})
    labels = pd.Series(["a"] * 15 + ["b"] * 15)
    observed_train_inputs: list[pd.DataFrame] = []

    def make_tabular_model(x_train: pd.DataFrame, seed: int) -> LogisticRegression:
        observed_train_inputs.append(x_train)
        return LogisticRegression(random_state=seed)

    monkeypatch.setattr(
        training,
        "write_results",
        lambda *args, **kwargs: tmp_path / "tabular_results.json",
    )

    training.run_seeded_training(
        "tabular",
        lambda: (features, labels),
        make_tabular_model,
        seed_count=3,
        cv_folds=3,
    )

    assert len(observed_train_inputs) == 3
    assert all(x_train.shape == (24, 1) for x_train in observed_train_inputs)
