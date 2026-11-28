import json
from pathlib import Path

import pytest
from ml.classifiers.common.metrics import classification_metrics
from ml.classifiers.common.report import write_results
from ml.classifiers.common.training import print_comparison_table


def test_binary_metrics_include_macro_f1_report_matrix_and_pr_auc() -> None:
    metrics = classification_metrics(
        ["no", "yes", "no", "yes"],
        ["no", "yes", "yes", "yes"],
        binary_scores=[0.1, 0.9, 0.7, 0.8],
        positive_label="yes",
    )

    assert metrics["macro_f1"] > 0
    assert "no" in metrics["per_class_report"]
    assert metrics["confusion_matrix"] == [[1, 1], [0, 2]]
    assert metrics["pr_auc"] == 1.0


def test_results_json_summarizes_three_seed_baseline_and_model_scores(
    tmp_path: Path,
) -> None:
    result_path = write_results(
        "sample",
        [42, 43, 44],
        [0.4, 0.5, 0.6],
        [0.6, 0.7, 0.8],
        comparison_scores={
            "Dummy": {"cv": [0.3, 0.4, 0.5], "test": [0.4, 0.5, 0.6]},
            "LinearSVC": {
                "cv": [0.6, 0.7, 0.8, 0.75],
                "test": [0.7, 0.8, 0.9],
            },
        },
        output_dir=tmp_path,
    )
    results = json.loads(result_path.read_text(encoding="utf-8"))

    assert result_path.name == "sample_results.json"
    assert results["seeds"] == [42, 43, 44]
    assert results["metric"] == "macro_f1"
    assert results["baseline"]["mean"] == pytest.approx(0.5)
    assert results["model"]["mean"] == pytest.approx(0.7)
    assert results["baseline"]["std"] > 0
    assert results["comparisons"]["LinearSVC"]["cv"]["mean"] == pytest.approx(
        0.7125
    )


def test_comparison_table_prints_cv_and_test_mean_plus_std(
    capsys: pytest.CaptureFixture[str],
) -> None:
    print_comparison_table(
        {
            "Dummy": {"cv": [0.2, 0.3], "test": [0.25, 0.35]},
            "LinearSVC": {"cv": [0.7, 0.8], "test": [0.75, 0.85]},
        }
    )

    output = capsys.readouterr().out
    assert "CV macro F1" in output
    assert "Test macro F1" in output
    assert "LinearSVC" in output
