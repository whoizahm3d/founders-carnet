import csv
from pathlib import Path


def main() -> None:
    sample_path = Path(__file__).with_name("sample_ideas.csv")
    with sample_path.open(newline="", encoding="utf-8") as sample_file:
        sample_ideas = list(csv.DictReader(sample_file))
    # TODO: Compute Spearman correlation from sample_ideas.


if __name__ == "__main__":
    main()
