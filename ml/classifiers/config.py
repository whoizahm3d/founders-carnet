import os
from pathlib import Path

DATA_DIR = Path(
    os.environ.get("CARNET_DATA_DIR") or r"C:\Users\Dell\Desktop\carnet_data"
)
SEED = 42
ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
