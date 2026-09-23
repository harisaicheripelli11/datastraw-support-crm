from datetime import datetime
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Note, Ticket

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SupportCRM",
    description="Customer Support Ticketing CRM",
    version="1.0.0",
)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def serve_app():
    return FileResponse("templates/index.html")


class TicketCreate(BaseModel):
    customer_name: str
    customer_email: EmailStr
    subject: str
    description: str
    priority: str = "Medium"


class TicketUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class NoteCreate(BaseModel):
    note_text: str


def next_ticket_id(db: Session) -> str:
    count = db.query(Ticket).count() + 1
    candidate = f"TKT-{count:03d}"
    while db.query(Ticket).filter(Ticket.ticket_id == candidate).first():
        count += 1
        candidate = f"TKT-{count:03d}"
    return candidate


def serialize_ticket(ticket: Ticket):
    return {
        "ticket_id": ticket.ticket_id,
        "customer_name": ticket.customer_name,
        "customer_email": ticket.customer_email,
        "subject": ticket.subject,
        "description": ticket.description,
        "status": ticket.status,
        "priority": ticket.priority,
        "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
        "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None,
    }


@app.post("/api/tickets", status_code=201)
def create_ticket(payload: TicketCreate, db: Session = Depends(get_db)):
    ticket = Ticket(
        ticket_id=next_ticket_id(db),
        customer_name=payload.customer_name.strip(),
        customer_email=str(payload.customer_email),
        subject=payload.subject.strip(),
        description=payload.description.strip(),
        priority=payload.priority if payload.priority in {"Low", "Medium", "High"} else "Medium",
        status="Open",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return {
        "ticket_id": ticket.ticket_id,
        "created_at": ticket.created_at.isoformat(),
    }


@app.get("/api/tickets")
def list_tickets(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Ticket)
    if status and status != "All":
        query = query.filter(Ticket.status == status)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Ticket.ticket_id.ilike(term),
                Ticket.customer_name.ilike(term),
                Ticket.customer_email.ilike(term),
                Ticket.subject.ilike(term),
                Ticket.description.ilike(term),
            )
        )
    tickets = query.order_by(Ticket.created_at.desc()).all()
    return [serialize_ticket(t) for t in tickets]


@app.get("/api/tickets/{ticket_id}")
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    data = serialize_ticket(ticket)
    data["notes"] = [
        {
            "id": note.id,
            "note_text": note.note_text,
            "created_at": note.created_at.isoformat(),
        }
        for note in sorted(ticket.notes, key=lambda n: n.created_at, reverse=True)
    ]
    return data


@app.put("/api/tickets/{ticket_id}")
def update_ticket(ticket_id: str, payload: TicketUpdate, db: Session = Depends(get_db)):
    if payload.status not in {"Open", "In Progress", "Closed"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = payload.status
    ticket.updated_at = datetime.utcnow()

    if payload.notes and payload.notes.strip():
        db.add(Note(ticket_id=ticket.id, note_text=payload.notes.strip()))

    db.commit()
    db.refresh(ticket)
    return {"success": True, "updated_at": ticket.updated_at.isoformat()}


@app.post("/api/tickets/{ticket_id}/notes", status_code=201)
def add_note(ticket_id: str, payload: NoteCreate, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not payload.note_text.strip():
        raise HTTPException(status_code=400, detail="Note cannot be empty")

    note = Note(ticket_id=ticket.id, note_text=payload.note_text.strip())
    ticket.updated_at = datetime.utcnow()
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"success": True, "id": note.id, "created_at": note.created_at.isoformat()}
