# rag

Compliance assistant: corpus, section-aware chunking, embedding, retrieval, answer validation. Report: FR-8, NFR-12, NFR-13, NFR-14. Rules: `docs/context/corpus.md`.

## Layout

| Path | What |
| --- | --- |
| `data/` | The 11 corpus documents. Committed. |
| `corpus_manifest.md` | File names, source URLs, dates and SHA-256 hashes. In git. |
| `corpus_profile/` | The profiling script and report used to check the files. |
| `evaluation/` | Question set, retrieval and end-to-end evaluation runners, guards, results. |

## Before you index

1. Run `python rag/corpus_profile/profile_corpus.py` and compare the hashes with `corpus_manifest.md`.
2. Follow the indexing limits in `docs/context/corpus.md` (Companies Act parts, PSEB tax sections stripped, VOSS needs OCR).

## Evaluation

A hand-verified gold question set (26 questions: 12 dev, 14 test) measures retrieval recall, correct abstention, and baseline comparison. Primary configuration is pre-registered as multilingual-e5-base hybrid with refusal gate at 0.8428. Test split is strictly held out. See `rag/evaluation/README.md` for reproduction commands and guard specifications.
