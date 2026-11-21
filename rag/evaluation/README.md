# Compliance evaluation

`gold_questions.jsonl` contains 26 authored questions with fixed `split` values:
- Development split: 12 questions (9 answerable, 3 out of scope)
- Test split: 14 questions (9 answerable, 5 out of scope)

All answerable questions have verified supporting chunk IDs. The test split is strictly held out behind guard conditions and cannot be run without explicit confirmation.

## Evaluation scripts and commands

Run these exact commands from the repository root using the active `rag/.venv`:

```powershell
# 1. Development retrieval evaluation and threshold tuning
rag/.venv/Scripts/python.exe rag/evaluation/run_dev_retrieval.py --split dev

# 2. End-to-end evaluation on dev split (fake provider for local execution)
rag/.venv/Scripts/python.exe rag/evaluation/run_e2e.py --split dev --provider fake

# 3. Unit test suite and JUnit XML export
rag/.venv/Scripts/python.exe -m pytest rag/tests --junitxml=rag/evaluation/results/pytest.xml

# 4. Record test cases CSV
rag/.venv/Scripts/python.exe -m rag.evaluation.record_tests rag/evaluation/results/pytest.xml

# 5. Render results report from CSVs only
rag/.venv/Scripts/python.exe rag/evaluation/make_report.py
```

## Held-out test split evaluation (Strict guards enforced)

The test split runs once under pre-registered conditions and cannot be re-run:
1. Git working tree must be clean for .py code under rag/ and backend/.
2. Lock files (`test_run_lock.json` and `e2e_test_run_lock.json`) must not exist.
3. The explicit flag `--confirm-test-run` must be passed.

```powershell
# Test retrieval evaluation across all 6 configurations (MPNet and E5 x dense, BM25, hybrid)
rag/.venv/Scripts/python.exe rag/evaluation/run_test_retrieval.py --confirm-test-run

# End-to-end evaluation on test split (primary configuration vs baseline)
rag/.venv/Scripts/python.exe rag/evaluation/run_e2e.py --split test --provider fake --confirm-test-run
```

## Generated CSV files

| CSV | Command that produces it |
| --- | --- |
| `retrieval.csv`, `retrieval_summary.csv`, `abstention_tuning.csv` | `rag/.venv/Scripts/python.exe rag/evaluation/run_dev_retrieval.py --split dev` |
| `e2e.csv` | `rag/.venv/Scripts/python.exe rag/evaluation/run_e2e.py --split dev --provider fake` |
| `test_cases.csv` | `rag/.venv/Scripts/python.exe -m rag.evaluation.record_tests rag/evaluation/results/pytest.xml` |
| `split_sizes.csv`, `run_metadata.csv` | Managed by evaluation runners |

`make_report.py` reads only the CSV files in `rag/evaluation/results/` and generates `rag/evaluation/RESULTS.md`. No test split results are ever used to alter configuration choices.
