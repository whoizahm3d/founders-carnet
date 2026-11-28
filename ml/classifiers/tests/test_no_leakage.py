from pathlib import Path

import pandas as pd
from ml.classifiers.common.splits import stratified_train_test_split
from ml.classifiers.funding_followon.load import (
    funding_feature_columns,
    load_funding_data,
)
from ml.classifiers.resume_role.load import (
    SOURCE_CATEGORY_MAP,
    TECH_CATEGORIES,
    load_resume_data,
)
from ml.classifiers.startup_outcome.load import load_startup_data


def test_resume_loader_returns_one_dimensional_text_strings(tmp_path: Path) -> None:
    csv_path = tmp_path / "resumes.csv"
    pd.DataFrame(
        [
            {"category": "Java Developers/Architects Resumes", "Text": "java resume"},
            {"category": "Web Developer Resumes", "Text": "web resume"},
        ]
    ).to_csv(csv_path, index=False)

    features, _ = load_resume_data(csv_path)

    assert isinstance(features, pd.Series)
    assert features.name == "Text"
    assert features.ndim == 1
    assert all(isinstance(text, str) for text in features)


def test_resume_text_duplicates_are_removed_before_splitting(tmp_path: Path) -> None:
    rows = [
        {"category": category, "job_title": "Engineer", "Text": f"{category} {i}"}
        for category in tuple(SOURCE_CATEGORY_MAP)[:2]
        for i in range(8)
    ]
    rows.append(rows[0].copy())
    csv_path = tmp_path / "resumes.csv"
    pd.DataFrame(rows).to_csv(csv_path, index=False)

    features, labels = load_resume_data(csv_path)
    x_train, x_test, _, _ = stratified_train_test_split(
        features, labels, test_size=0.25, seed=3
    )

    assert features.is_unique
    assert set(labels) == set(TECH_CATEGORIES[:2])
    assert not set(x_train).intersection(x_test)


def test_resume_cross_category_texts_are_removed(tmp_path: Path) -> None:
    csv_path = tmp_path / "resumes.csv"
    pd.DataFrame(
        [
            {"category": "Java Developers/Architects Resumes", "Text": "shared"},
            {"category": "Web Developer Resumes", "Text": "shared"},
            {"category": "Java Developers/Architects Resumes", "Text": "unique"},
        ]
    ).to_csv(csv_path, index=False)

    features, labels = load_resume_data(csv_path)

    assert "shared" not in set(features)
    assert set(features) == {"unique"}
    assert set(labels) == {"Java Developers"}


def test_startup_outcome_features_exclude_post_outcome_columns(
    tmp_path: Path,
) -> None:
    csv_path = tmp_path / "outcomes.csv"
    pd.DataFrame(
        {
            "status": ["closed", "acquired", "ipo", "operating"] * 5,
            "founded_at": ["2001-01-01", "2002-01-01", "2003-01-01", "2004-01-01"] * 5,
            "first_funding_at": ["2002-01-01", "2003-01-01", "2004-01-01", "2005-01-01"] * 5,
            "category_list": ["software", "mobile", "software", "mobile"] * 5,
            "country_code": ["US", "US", "US", "US"] * 5,
            "region": ["West", "East", "West", "East"] * 5,
            "funding_total_usd": [1000, 2000, 3000, 4000] * 5,
            "funding_rounds": [1, 2, 3, 4] * 5,
            "last_funding_at": ["2010-01-01", "2011-01-01", "2012-01-01", "2013-01-01"] * 5,
            "name": ["Example startup"] * 20,
            "permalink": ["example"] * 20,
        }
    ).to_csv(csv_path, index=False)

    features, labels = load_startup_data(csv_path)

    assert set(labels) == {0, 1}
    assert 0 in set(labels)
    assert 1 in set(labels)
    assert not {
        "status",
        "funding_total_usd",
        "funding_rounds",
        "last_funding_at",
        "closed_at",
        "exit_date",
        "name",
        "permalink",
    }.intersection(features.columns)
    assert len(features) == 15


def test_funding_features_exclude_post_event_fields() -> None:
    columns = [
        "market",
        "country_code",
        "status",
        "funding_total_usd",
        "funding_rounds",
        "round_A",
        "seed",
        "angel",
        "permalink",
    ]

    assert funding_feature_columns(columns) == ["market", "country_code", "seed"]


def test_funding_loader_defines_seed_population_and_binary_label(
    tmp_path: Path,
) -> None:
    csv_path = tmp_path / "investments.csv"
    pd.DataFrame(
        {
            "permalink": ["cafe", "market", "old"],
            "seed": [100, 100, 100],
            "round_A": [50, 0, 0],
            "market": ["software", "mobile", "software"],
            "category_list": ["Software", "Mobile", "Software"],
            "country_code": ["USA", "USA", "USA"],
            "state_code": ["CA", "CA", "CA"],
            "founded_year": [2010, 2010, 2010],
            "founded_at": ["2010-01-01", "2010-01-01", "2010-01-01"],
            "first_funding_at": ["2011-01-01", "2012-01-01", "2014-01-01"],
            "funding_rounds": [2, 1, 1],
            "last_funding_at": ["2012-01-01", "2012-01-01", "2014-01-01"],
            "status": ["operating", "operating", "operating"],
        }
    ).to_csv(csv_path, index=False, encoding="latin-1")

    features, labels = load_funding_data(csv_path)

    assert len(features) == 2
    assert set(labels) == {0, 1}
    assert not {
        "round_A",
        "round_B",
        "round_H",
        "venture",
        "funding_total_usd",
        "funding_rounds",
        "last_funding_at",
        "status",
        "post_ipo_equity",
        "private_equity",
    }.intersection(features.columns)
