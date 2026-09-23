# SupportCRM — Datastraw AI + Tech Intern Assessment

A responsive customer support ticketing CRM built with FastAPI, SQLite, HTML, CSS and Vanilla JavaScript.

## Features

- Create customer support tickets
- Automatic ticket IDs such as TKT-001
- Ticket timestamps
- Search by ticket ID, customer, email, subject and description
- Filter by Open, In Progress and Closed
- Ticket detail view
- Update ticket status
- Add internal notes
- Priority indicator
- Responsive desktop/tablet/mobile UI
- REST API with FastAPI
- SQLite database

## Run locally

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Open:

- App: http://127.0.0.1:8000
- API docs: http://127.0.0.1:8000/docs

## API

- POST `/api/tickets`
- GET `/api/tickets`
- GET `/api/tickets/{ticket_id}`
- PUT `/api/tickets/{ticket_id}`
- POST `/api/tickets/{ticket_id}/notes`

## Project structure

```text
datastraw-support-crm/
├── main.py
├── database.py
├── models.py
├── requirements.txt
├── README.md
├── .env.example
├── .gitignore
├── templates/
│   └── index.html
└── static/
    ├── css/
    │   └── style.css
    └── js/
        └── app.js
```

## Design decision

The project keeps the database intentionally small, using tickets and notes. Priority is included as a practical support-team addition without introducing another table.

## Demo flow

1. Create a ticket.
2. Show it on the dashboard.
3. Search for it.
4. Filter by status.
5. Open ticket details.
6. Change status to In Progress.
7. Add a note.
8. Close the ticket.
9. Show the responsive mobile layout.
