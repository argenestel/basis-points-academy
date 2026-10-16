"""SQLite storage: one row per (venue, coin, timestamp)."""

from __future__ import annotations

import sqlite3

from .core import Snapshot

SCHEMA = """
create table if not exists funding (
  ts integer not null,
  venue text not null,
  coin text not null,
  rate real not null,
  interval_hours real not null,
  apr real not null,
  mark real,
  open_interest_usd real,
  primary key (venue, coin, ts)
);
"""


def connect(path: str) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.executescript(SCHEMA)
    return db


def insert(db: sqlite3.Connection, snaps: list[Snapshot]) -> int:
    rows = [(s.ts, s.venue, s.coin, s.rate, s.interval_hours, s.apr, s.mark, s.open_interest_usd) for s in snaps]
    db.executemany("insert or replace into funding values (?,?,?,?,?,?,?,?)", rows)
    db.commit()
    return len(rows)
