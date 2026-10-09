from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(80), nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    stats: Mapped[UserStats | None] = relationship(
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    skill_progress: Mapped[list["UserSkillProgress"]] = relationship(
        "UserSkillProgress",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    daily_activity: Mapped[list["DailyActivity"]] = relationship(
        "DailyActivity",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class UserStats(Base):
    __tablename__ = "user_stats"
    __table_args__ = (
        CheckConstraint("total_xp >= 0", name="ck_user_stats_total_xp"),
        CheckConstraint("current_streak >= 0", name="ck_user_stats_current_streak"),
        CheckConstraint("longest_streak >= 0", name="ck_user_stats_longest_streak"),
        CheckConstraint(
            "hearts >= 0 AND hearts <= max_hearts",
            name="ck_user_stats_hearts_range",
        ),
        CheckConstraint("daily_xp_goal >= 0", name="ck_user_stats_daily_goal"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    total_xp: Mapped[int] = mapped_column(default=0, nullable=False)
    current_streak: Mapped[int] = mapped_column(default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(default=0, nullable=False)
    hearts: Mapped[int] = mapped_column(default=5, nullable=False)
    max_hearts: Mapped[int] = mapped_column(default=5, nullable=False)
    daily_xp_goal: Mapped[int] = mapped_column(default=20, nullable=False)
    next_heart_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user: Mapped[User] = relationship(back_populates="stats")