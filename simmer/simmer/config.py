"""Where Simmer keeps its files. Override the data dir with SIMMER_DATA_DIR."""

import os
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("SIMMER_DATA_DIR", PROJECT_DIR / "data"))
DB_PATH = DATA_DIR / "simmer.db"
LOG_PATH = DATA_DIR / "simmer.log"
