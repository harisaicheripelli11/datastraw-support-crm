let currentStatus = "All";
let currentTicketId = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[ch]));
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function statusClass(status) {
  return status === "Open" ? "status-open" :
    status === "In Progress" ? "status-progress" : "status-closed";
}

function showToast(message, error = false) {
  const toast = document.createElement("div");
  toast.className = `toast${error ? " error" : ""}`;
  toast.textContent = message;
  $("#toast-container").appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

function showView(id) {
  $$(".view").forEach(v => v.classList.add("hidden"));
  $(id).classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showDashboard() {
  showView("#dashboard-view");
  loadTickets();
}

function showCreate() {
  $("#create-form").reset();
  showView("#create-view");
}

async function loadTickets() {
  const search = $("#search-input").value.trim();
  const params = new URLSearchParams();
  if (currentStatus !== "All") params.set("status", currentStatus);
  if (search) params.set("search", search);

  try {
    const response = await fetch(`/api/tickets?${params.toString()}`);
    if (!response.ok) throw new Error("Unable to load tickets");
    const tickets = await response.json();
    renderTickets(tickets);
    updateStats();
  } catch (error) {
    $("#tickets-area").innerHTML = `<div class="empty-state"><div class="empty-icon">⚠</div><h3>Unable to load tickets</h3><p>${escapeHtml(error.message)}</p></div>`;
  }
}

async function updateStats() {
  try {
    const response = await fetch("/api/tickets");
    const tickets = await response.json();
    $("#total-count").textContent = tickets.length;
    $("#open-count").textContent = tickets.filter(t => t.status === "Open").length;
    $("#progress-count").textContent = tickets.filter(t => t.status === "In Progress").length;
    $("#closed-count").textContent = tickets.filter(t => t.status === "Closed").length;
  } catch (_) {}
}

function renderTickets(tickets) {
  if (!tickets.length) {
    $("#tickets-area").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎫</div>
        <h3>No tickets found</h3>
        <p>Create a ticket or change your search/filter.</p>
      </div>`;
    return;
  }

  const rows = tickets.map(t => `
    <div class="table-row ticket-row" onclick="openTicket('${escapeHtml(t.ticket_id)}')">
      <div class="ticket-id">${escapeHtml(t.ticket_id)}</div>
      <div class="customer-name">${escapeHtml(t.customer_name)}</div>
      <div class="subject">${escapeHtml(t.subject)}</div>
      <div><span class="status-badge ${statusClass(t.status)}">${escapeHtml(t.status)}</span></div>
      <div class="date">${formatDate(t.created_at)}</div>
      <div class="arrow">›</div>
    </div>
  `).join("");

  $("#tickets-area").innerHTML = `
    <div class="ticket-table">
      <div class="table-row table-head">
        <div>ID</div><div>Customer</div><div>Subject</div><div>Status</div><div>Date</div><div></div>
      </div>
      ${rows}
    </div>`;
}

async function openTicket(ticketId) {
  currentTicketId = ticketId;
  showView("#detail-view");

  try {
    const response = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}`);
    if (!response.ok) throw new Error("Ticket not found");
    const ticket = await response.json();
    renderDetail(ticket);
  } catch (error) {
    showToast(error.message, true);
    showDashboard();
  }
}

function renderDetail(ticket) {
  $("#detail-title").textContent = ticket.subject;
  $("#detail-ticket-id").textContent = ticket.ticket_id;
  $("#detail-status").textContent = ticket.status;
  $("#detail-status").className = `status-badge ${statusClass(ticket.status)}`;

  $("#detail-avatar").textContent = ticket.customer_name.charAt(0).toUpperCase();
  $("#detail-customer").textContent = ticket.customer_name;
  $("#detail-email").textContent = ticket.customer_email;
  $("#detail-email").href = `mailto:${ticket.customer_email}`;
  $("#detail-description").textContent = ticket.description;

  $("#info-id").textContent = ticket.ticket_id;
  $("#info-priority").textContent = ticket.priority;
  $("#info-priority").className = `priority-${ticket.priority.toLowerCase()}`;
  $("#info-created").textContent = formatDate(ticket.created_at);
  $("#info-updated").textContent = formatDate(ticket.updated_at);

  $("#status-select").value = ticket.status;

  const notes = ticket.notes || [];
  $("#notes-count").textContent = notes.length;
  $("#notes-list").innerHTML = notes.length ? notes.map(n => `
    <div class="note">
      <p>${escapeHtml(n.note_text)}</p>
      <time>${formatDate(n.created_at)}</time>
    </div>
  `).join("") : `<div class="note-empty">No notes yet. Add the first internal note.</div>`;
}

$("#search-input").addEventListener("input", loadTickets);

$("#status-filters").addEventListener("click", (event) => {
  const button = event.target.closest(".filter-btn");
  if (!button) return;
  currentStatus = button.dataset.status;
  $$(".filter-btn").forEach(b => b.classList.remove("active"));
  button.classList.add("active");
  loadTickets();
});

$("#create-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const payload = Object.fromEntries(form.entries());

  try {
    const response = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not create ticket");
    showToast(`Ticket ${data.ticket_id} created successfully`);
    event.target.reset();
    await openTicket(data.ticket_id);
  } catch (error) {
    showToast(error.message, true);
  }
});

$("#status-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentTicketId) return;

  const status = $("#status-select").value;

  try {
    const response = await fetch(`/api/tickets/${encodeURIComponent(currentTicketId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes: null })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not update status");
    showToast("Ticket status updated");
    await openTicket(currentTicketId);
  } catch (error) {
    showToast(error.message, true);
  }
});

$("#note-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentTicketId) return;

  const noteText = $("#note-input").value.trim();
  if (!noteText) {
    showToast("Please enter a note", true);
    return;
  }

  try {
    const response = await fetch(`/api/tickets/${encodeURIComponent(currentTicketId)}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note_text: noteText })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not add note");
    $("#note-input").value = "";
    showToast("Note added");
    await openTicket(currentTicketId);
  } catch (error) {
    showToast(error.message, true);
  }
});

loadTickets();
