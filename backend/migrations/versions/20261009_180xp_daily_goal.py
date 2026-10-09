"""raise the daily XP goal to 180

Revision ID: daily_xp_goal_180
Revises: ee2e4d3b11dd
Create Date: 2026-10-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "daily_xp_goal_180"
down_revision: Union[str, Sequence[str], None] = "ee2e4d3b11dd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE user_stats SET daily_xp_goal = 180 "
            "WHERE daily_xp_goal = 20"
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE user_stats SET daily_xp_goal = 20 "
            "WHERE daily_xp_goal = 180"
        )
    )
