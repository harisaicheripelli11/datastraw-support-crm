from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base

IST = ZoneInfo("Asia/Kolkata")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String(20), unique=True, index=True, nullable=False)
    customer_name = Column(String(120), nullable=False)
    customer_email = Column(String(160), nullable=False)
    subject = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(30), default="Open", nullable=False)
    priority = Column(String(20), default="Medium", nullable=False)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(IST).replace(tzinfo=None),
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(IST).replace(tzinfo=None),
        nullable=False,
    )

    notes = relationship(
        "Note",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="desc(Note.created_at)",
    )


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    note_text = Column(Text, nullable=False)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(IST).replace(tzinfo=None),
        nullable=False,
    )

    ticket = relationship("Ticket", back_populates="notes")