import json
import re
import statistics
from collections.abc import Mapping, Sequence
from pathlib import Path

from ml.classifiers.config import ARTIFACTS_DIR


def write_results(
    name: str,
    seeds: Sequence[int],
    baseline_scores: Sequence[float],
    model_scores: Sequence[float],
    *,
    comparison_scores: Mapping[str, Mapping[str, Sequence[float]]] | None = None,
    output_dir: Path = ARTIFACTS_DIR,
) -> Path:
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", name):
        raise ValueError("name must be a lowercase filename-safe identifier")
    if not 3 <= len(seeds) <= 5:
        raise ValueError("results must include 3 to 5 seeds")
    if len(seeds) != len(baseline_scores) or len(seeds) != len(model_scores):
        raise ValueError("each seed must have one baseline and one model score")

    def summary(scores: Sequence[float]) -> dict[str, float]:
        return {
            "mean": statistics.mean(scores),
            "std": statistics.stdev(scores),
        }

    result: dict[str, object] = {
        "classifier": name,
        "metric": "macro_f1",
        "seeds": list(seeds),
        "baseline": summary(baseline_scores),
        "model": summary(model_scores),
    }
    if comparison_scores is not None:
        result["comparisons"] = {
            model_name: {
                metric_name: summary(scores)
                for metric_name, scores in metrics.items()
            }
            for model_name, metrics in comparison_scores.items()
        }
    output_dir.mkdir(parents=True, exist_ok=True)
    result_path = output_dir / f"{name}_results.json"
    result_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return result_path
