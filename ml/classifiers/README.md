# Supporting classifiers

These are offline FYP-2 studies, not product predictions. Do not show startup
outcome or funding results to users as probabilities of success, failure, or
funding.

## Data sources

Place the approved CSVs under `CARNET_DATA_DIR` (default:
`C:\Users\Dell\Desktop\carnet_data`):

| Classifier | Kaggle slug | Local path |
| --- | --- | --- |
| Resume role | `haidermaseeh/resume-dataset` | `resume/Resume dataset.csv` |
| Startup outcome | `yanmaksi/big-startup-secsees-fail-dataset-from-crunchbase` | `outcome/big_startup_secsees_dataset.csv` |
| Follow-on funding | `arindam235/startup-investments-crunchbase` | `funding/investments_VC.csv` |

Raw data stays outside the repository. Result JSON is written to
`artifacts/<classifier>_results.json`, an ignored directory.

## Run

Use Python 3.11 in the ML virtual environment. From the repository root:

```powershell
cd ml
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
cd ..
python -m ml.classifiers.resume_role.train --seeds 5
python -m ml.classifiers.startup_outcome.train --seeds 5
python -m ml.classifiers.funding_followon.train --seeds 5
```

`--seeds` accepts 3 to 5 and defaults to 5. The resume role run compares a
most-frequent dummy, balanced logistic regression, and balanced LinearSVC. It
reports five-fold CV and held-out macro F1 across the requested seeds.

Run the focused tests with:

```powershell
python -m pytest ml\classifiers\tests
```

## Leakage rules

- Resume texts are deduplicated before splitting, and only the six technical
  categories are retained.
- Startup outcome uses closed as class 0 and acquired or IPO as class 1.
  Operating rows are excluded. The 1990 to 2015 founding-date filter is retained
  only when at least 10,000 labeled rows remain. Features are limited to first
  category, country, region, founding year, and elapsed years to first funding.
  Total funding, round count, and last-funding date are not features.
- Follow-on funding uses companies with positive seed funding, labels whether
  `round_A` is positive, and restricts first funding to 2013 or earlier.
  Negative elapsed founding-to-first-funding intervals are dropped. Features
  include seed amount, market, first category, country, state, founding year,
  and elapsed years to first funding. Later-round and other funding fields are
  excluded.
- Imputers, encoders, scalers, and TF-IDF are fitted through sklearn pipelines
  on each training split only. Logistic regression uses balanced class weights.
  No resampling is configured.
- The split helper is stratified. Any future resampling must happen inside CV
  training folds only.
