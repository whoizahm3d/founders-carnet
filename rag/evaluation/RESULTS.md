# Compliance RAG Evaluation Results

Run date: 2026-11-20

Commit hash: 7bb229ce5e7f95c71d9123922fd017240e677417

Working tree clean: false

## Evaluation Splits

- Development split: 12 questions (9 answerable, 3 out of scope)
- Test split: 14 questions (9 answerable, 5 out of scope)
- Total question count: 26 questions

## Pre-Registered Primary Configuration

- Model: intfloat/multilingual-e5-base
- Method: Hybrid retrieval (BM25 + Dense RRF with k=60, top 5)
- Refusal gate threshold: 0.8428 (E5 dense top-1 cosine similarity)
- Generator model: gemini-2.5-flash (temperature 0.0)
- Prompts: compliance-answer-v2, compliance-grounding-v1

## Retrieval Evaluation Summary

| Model | Retriever | Split | Answerable (N) | Recall@5 Hits | Recall@5 (%) | MRR | Wilson 95% CI |
| --- | --- | --- | --- | --- | --- | --- | --- |
| intfloat/multilingual-e5-base | bm25 | dev | 9 | 8 | 8/9 (88.9%) | 0.8333 | [0.565, 0.980] |
| intfloat/multilingual-e5-base | dense | dev | 9 | 6 | 6/9 (66.7%) | 0.6667 | [0.354, 0.879] |
| intfloat/multilingual-e5-base | hybrid | dev | 9 | 8 | 8/9 (88.9%) | 0.7407 | [0.565, 0.980] |
| sentence-transformers/paraphrase-multilingual-mpnet-base-v2 | bm25 | dev | 9 | 6 | 6/9 (66.7%) | 0.6667 | [0.354, 0.879] |
| sentence-transformers/paraphrase-multilingual-mpnet-base-v2 | dense | dev | 9 | 7 | 7/9 (77.8%) | 0.5926 | [0.453, 0.937] |
| sentence-transformers/paraphrase-multilingual-mpnet-base-v2 | hybrid | dev | 9 | 8 | 8/9 (88.9%) | 0.6556 | [0.565, 0.980] |

Test split retrieval status: Pending (held out until single test run).

## Abstention Threshold Tuning (Dev Split, N=3 Out-of-Scope)

| model_id | retriever | tuned_threshold | abstention_precision | abstention_recall | refusal_rate_on_answerable | middle_of_tied_range | tied_range_min | tied_range_max | abstention_precision_at_0.4 | abstention_recall_at_0.4 | refusal_rate_on_answerable_at_0.4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| intfloat/multilingual-e5-base | bm25 | 0.526903 |  |  |  |  |  |  | n/a | 0.0 | 0.0 |
| intfloat/multilingual-e5-base | dense | 0.842846 |  |  |  |  |  |  | n/a | 0.0 | 0.0 |
| intfloat/multilingual-e5-base | hybrid | 0.745968 |  |  |  |  |  |  | n/a | 0.0 | 0.0 |
| sentence-transformers/paraphrase-multilingual-mpnet-base-v2 | bm25 | 0.483092 |  |  |  |  |  |  | 0.0 | 0.0 | 0.111111 |
| sentence-transformers/paraphrase-multilingual-mpnet-base-v2 | dense | 0.532562 |  |  |  |  |  |  | n/a | 0.0 | 0.0 |
| sentence-transformers/paraphrase-multilingual-mpnet-base-v2 | hybrid | 0.968865 |  |  |  |  |  |  | n/a | 0.0 | 0.0 |

## End-to-End Evaluation versus No-Retrieval Baseline

_End-to-end evaluation pending._

### End-to-End Detailed Records

_No records recorded._

## Failure Causes

_No records recorded._

## Notes and Limitations

1. BAAI/bge-m3: Evaluated as missing usable weights in cache; excluded from primary comparison.
2. Development abstention tuning rests on 3 out-of-scope examples; confidence intervals are wide.
3. Test split is strictly held out and executed once under guard conditions.
