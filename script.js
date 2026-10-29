const STORAGE_EVENTS = "campuscue_v2_events";
const STORAGE_REGISTRATIONS = "campuscue_v2_registrations";

const starterEvents = [
    { id: "e1", title: "Autumn Cultural Night", category: "Cultural", date: "2026-11-12", time: "17:00", venue: "Open Air Theatre", description: "An evening of music, dance and performances by students.", capacity: 120, symbol: "✦" },
    { id: "e2", title: "Creative Minds Workshop", category: "Workshop", date: "2026-11-15", time: "11:00", venue: "Design Studio", description: "Try fresh ideas and learn creative problem-solving.", capacity: 40, symbol: "✳" },
    { id: "e3", title: "Web Dev Meetup", category: "Technical", date: "2026-11-18", time: "14:00", venue: "Computer Lab 2", description: "Explore web technologies with fellow students.", capacity: 60, symbol: "⌘" },
    { id: "e4", title: "Career Connect", category: "Career", date: "2026-11-20", time: "12:00", venue: "Seminar Hall", description: "Get practical tips for interviews and internships.", capacity: 80, symbol: "↗" },
    { id: "e5", title: "Poster Design Challenge", category: "Workshop", date: "2026-11-23", time: "10:30", venue: "Design Studio", description: "Create a poster and share your visual ideas.", capacity: 35, symbol: "✎" },
    { id: "e6", title: "Campus Tech Quiz", category: "Technical", date: "2026-11-26", time: "13:00", venue: "Lecture Hall 4", description: "Put your technology knowledge to the test.", capacity: 50, symbol: "⌘" }
];

function readStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

let events = readStorage(STORAGE_EVENTS, starterEvents);
let registrations = readStorage(STORAGE_REGISTRATIONS, []);
let selectedEventId = null;
let toastTimer;

const $ = id => document.getElementById(id);

function saveData() {
    try {
        localStorage.setItem(STORAGE_EVENTS, JSON.stringify(events));
        localStorage.setItem(STORAGE_REGISTRATIONS, JSON.stringify(registrations));
        return true;
    } catch {
        notify("Could not save data. Check your browser storage settings.");
        return false;
    }
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function formatDate(date) {
    return new Date(date + "T12:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function formatTime(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit"
    });
}

function seatsLeft(event) {
    return Math.max(0, Number(event.capacity) -
        registrations.filter(r => r.eventId === event.id).length);
}

function notify(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

// Dashboard navigation
function showPage(page) {
    const titles = {
        dashboard: "Your campus, in one place.",
        events: "Find something worth attending.",
        registrations: "Your reserved places.",
        manage: "Make campus events happen."
    };

    document.querySelectorAll(".page-view").forEach(section => {
        section.classList.toggle("active", section.id === page + "Page");
    });

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle("active", button.dataset.page === page);
    });

    $("pageTitle").textContent = titles[page];
    $("breadcrumbPage").textContent = page.toUpperCase();

    if (page === "dashboard") renderDashboard();
    if (page === "events") renderAllEvents();
    if (page === "registrations") renderRegistrations();
    if (page === "manage") renderManagedEvents();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.go));
});

function eventCard(event) {
    const left = seatsLeft(event);
    const full = left === 0;
    const categoryClass = {
        Cultural: "art-cultural",
        Workshop: "art-workshop",
        Technical: "art-technical",
        Career: "art-career"
    }[event.category] || "art-technical";

    return `
        <article class="event-card">
            <div class="event-art ${categoryClass}">
                <span class="category-chip">${escapeHTML(event.category)}</span>
                <span class="art-symbol" aria-hidden="true">${escapeHTML(event.symbol || "✦")}</span>
            </div>
            <div class="event-info">
                <p class="event-date">${escapeHTML(formatDate(event.date))}</p>
                <h3>${escapeHTML(event.title)}</h3>
                <p class="event-description">${escapeHTML(event.description)}</p>
                <div class="event-meta">
                    <span>◷ ${escapeHTML(formatTime(event.time))}</span>
                    <span>⌖ ${escapeHTML(event.venue)}</span>
                </div>
                <div class="seat-line">
                    <span>Seat availability</span>
                    <strong>${left} / ${Number(event.capacity)}</strong>
                </div>
                <button class="register-button" data-register="${escapeHTML(event.id)}" ${full ? "disabled" : ""}>
                    ${full ? "Fully booked" : "Reserve a place →"}
                </button>
            </div>
        </article>
    `;
}

function renderDashboard() {
    $("statEvents").textContent = events.length;
    $("statRegistrations").textContent = registrations.length;
    $("statSeats").textContent = events.reduce((sum, event) => sum + seatsLeft(event), 0);

    $("featuredEvents").innerHTML = [...events]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3)
        .map(eventCard)
        .join("") || `<div class="empty-state"><strong>No events yet</strong>Add an event from the organizer workspace.</div>`;
}

function renderAllEvents() {
    const query = $("searchInput").value.trim().toLowerCase();
    const category = $("categoryFilter").value;
    const sort = $("sortFilter").value;

    let result = events.filter(event => {
        const text = [event.title, event.venue, event.description, event.category]
            .join(" ").toLowerCase();
        return text.includes(query) && (category === "All" || event.category === category);
    });

    if (sort === "seats") result.sort((a, b) => seatsLeft(b) - seatsLeft(a));
    else if (sort === "name") result.sort((a, b) => a.title.localeCompare(b.title));
    else result.sort((a, b) => a.date.localeCompare(b.date));

    $("resultsLine").textContent = `${result.length} event${result.length === 1 ? "" : "s"} found`;

    $("allEvents").innerHTML = result.map(eventCard).join("") ||
        `<div class="empty-state"><strong>No matching events</strong>Try changing your search or category.</div>`;
}

$("searchInput").addEventListener("input", renderAllEvents);
$("categoryFilter").addEventListener("change", renderAllEvents);
$("sortFilter").addEventListener("change", renderAllEvents);

// Open the registration form
document.addEventListener("click", event => {
    const button = event.target.closest("[data-register]");
    if (!button) return;
    openRegistration(button.dataset.register);
});

function openRegistration(id) {
    const event = events.find(item => item.id === id);
    if (!event) return;

    if (seatsLeft(event) < 1) {
        notify("This event is fully booked.");
        return;
    }

    selectedEventId = id;
    $("registrationEventId").value = id;
    $("modalEventName").textContent =
        `${event.title} · ${formatDate(event.date)} · ${event.venue}`;
    $("registrationModal").hidden = false;
    $("studentName").focus();
}

function closeRegistration() {
    $("registrationModal").hidden = true;
    $("registrationForm").reset();
    selectedEventId = null;
}

$("closeModal").addEventListener("click", closeRegistration);

$("registrationModal").addEventListener("click", event => {
    if (event.target === $("registrationModal")) closeRegistration();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("registrationModal").hidden) {
        closeRegistration();
    }
});

$("registrationForm").addEventListener("submit", event => {
    event.preventDefault();

    const id = selectedEventId;
    const campusEvent = events.find(item => item.id === id);
    if (!campusEvent) {
        notify("This event is no longer available.");
        closeRegistration();
        return;
    }

    const name = $("studentName").value.trim();
    const email = $("studentEmail").value.trim().toLowerCase();
    const regNo = $("studentRegNo").value.trim();

    if (name.length < 2 || !email || !regNo) {
        notify("Please complete all fields.");
        return;
    }

    if (seatsLeft(campusEvent) < 1) {
        notify("Sorry, no seats remain for this event.");
        closeRegistration();
        renderAll();
        return;
    }

    const duplicate = registrations.some(r =>
        r.eventId === id &&
        (r.email.toLowerCase() === email || r.regNo.toLowerCase() === regNo.toLowerCase())
    );

    if (duplicate) {
        notify("These student details are already registered for this event.");
        return;
    }

    const registration = {
        id: "CC-" + Date.now().toString().slice(-8),
        eventId: id,
        eventTitle: campusEvent.title,
        name,
        email,
        regNo,
        registeredAt: new Date().toISOString()
    };

    registrations.push(registration);

    if (!saveData()) {
        registrations.pop();
        return;
    }

    closeRegistration();
    renderAll();
    showPage("registrations");
    notify("Registration confirmed! Your confirmation ID is " + registration.id);
});

// Student registrations and printable confirmation
function renderRegistrations() {
    if (!registrations.length) {
        $("myRegistrations").innerHTML = `
            <div class="empty-state">
                <strong>No registrations yet</strong>
                Explore campus events and reserve your first place.
                <p style="margin-top:15px"><button class="button button-lime" data-go="events">Explore events</button></p>
            </div>`;
        return;
    }

    $("myRegistrations").innerHTML = registrations.map(r => `
        <article class="registration-row">
            <div>
                <h3>${escapeHTML(r.eventTitle)}</h3>
                <p>${escapeHTML(r.name)} · ${escapeHTML(r.regNo)}</p>
                <p>${escapeHTML(r.email)}</p>
                <p class="confirmation-id">Confirmation: ${escapeHTML(r.id)}</p>
            </div>
            <div class="registration-actions">
                <button class="mini-button" data-print="${escapeHTML(r.id)}">Print slip</button>
                <button class="mini-button danger" data-cancel="${escapeHTML(r.id)}">Cancel</button>
            </div>
        </article>
    `).join("");
}

document.addEventListener("click", event => {
    const printButton = event.target.closest("[data-print]");
    if (printButton) printSlip(printButton.dataset.print);

    const cancelButton = event.target.closest("[data-cancel]");
    if (cancelButton) cancelRegistration(cancelButton.dataset.cancel);
});

function printSlip(id) {
    const r = registrations.find(item => item.id === id);
    if (!r) return;

    const campusEvent = events.find(item => item.id === r.eventId);
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        notify("Allow pop-ups in your browser to print the slip.");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
        <title>CampusCue Confirmation</title>
        <style>
        body{font:16px Arial,sans-serif;max-width:650px;margin:50px auto;padding:25px;color:#222}
        h1{color:#286c55}hr{border:0;border-top:1px solid #ddd;margin:22px 0}
        p{margin:14px 0}.id{font-weight:bold;color:#286c55}
        </style></head><body>
        <h1>CampusCue</h1><h2>Event Registration Confirmation</h2>
        <p class="id">Confirmation ID: ${escapeHTML(r.id)}</p><hr>
        <p><b>Student:</b> ${escapeHTML(r.name)}</p>
        <p><b>Registration number:</b> ${escapeHTML(r.regNo)}</p>
        <p><b>Email:</b> ${escapeHTML(r.email)}</p>
        <p><b>Event:</b> ${escapeHTML(r.eventTitle)}</p>
        <p><b>Date:</b> ${campusEvent ? escapeHTML(formatDate(campusEvent.date)) : "Event details unavailable"}</p>
        <p><b>Time:</b> ${campusEvent ? escapeHTML(formatTime(campusEvent.time)) : "-"}</p>
        <p><b>Venue:</b> ${campusEvent ? escapeHTML(campusEvent.venue) : "-"}</p>
        <hr><p>Please keep this confirmation for your records.</p>
        <script>window.onload=()=>window.print();<\/script>
        </body></html>
    `);
    printWindow.document.close();
}

function cancelRegistration(id) {
    const registration = registrations.find(r => r.id === id);
    if (!registration) return;

    if (!confirm(`Cancel your registration for "${registration.eventTitle}"?`)) return;

    const previous = registrations;
    registrations = registrations.filter(r => r.id !== id);

    if (!saveData()) {
        registrations = previous;
        return;
    }

    renderAll();
    notify("Registration cancelled.");
}

// Organizer event management
$("eventForm").addEventListener("submit", event => {
    event.preventDefault();

    const editId = $("editEventId").value;
    const capacity = Number($("eventCapacity").value);
    const title = $("eventName").value.trim();

    if (!title || capacity < 1 || !Number.isInteger(capacity)) {
        notify("Enter a valid event name and whole-number seat limit.");
        return;
    }

    const oldEvent = editId ? events.find(item => item.id === editId) : null;
    const currentRegistrations = editId
        ? registrations.filter(r => r.eventId === editId).length
        : 0;

    if (capacity < currentRegistrations) {
        notify(`Capacity cannot be less than ${currentRegistrations} existing registrations.`);
        return;
    }

    const campusEvent = {
        id: editId || "e" + Date.now(),
        title,
        category: $("eventCategory").value,
        date: $("eventDate").value,
        time: $("eventTime").value,
        venue: $("eventVenue").value.trim(),
        description: $("eventDescription").value.trim(),
        capacity,
        symbol: oldEvent?.symbol || "✦"
    };

    if (!campusEvent.date || !campusEvent.time || !campusEvent.venue || !campusEvent.description) {
        notify("Please complete every event field.");
        return;
    }

    const previous = [...events];

    if (editId) {
        events = events.map(item => item.id === editId ? campusEvent : item);
    } else {
        events.push(campusEvent);
    }

    if (!saveData()) {
        events = previous;
        return;
    }

    resetEventForm();
    renderAll();
    notify(editId ? "Event updated." : "Event created successfully.");
});

function renderManagedEvents() {
    $("managedCount").textContent = `${events.length} event${events.length === 1 ? "" : "s"}`;

    $("managedEvents").innerHTML = events.map(event => `
        <article class="managed-item">
            <h4>${escapeHTML(event.title)}</h4>
            <p>${escapeHTML(formatDate(event.date))} · ${escapeHTML(event.venue)}</p>
            <p>${registrations.filter(r => r.eventId === event.id).length} registered · ${seatsLeft(event)} seats left</p>
            <div class="managed-actions">
                <button class="mini-button" data-edit="${escapeHTML(event.id)}">Edit</button>
                <button class="mini-button danger" data-delete="${escapeHTML(event.id)}">Delete</button>
            </div>
        </article>
    `).join("") || `<div class="empty-state"><strong>No events listed</strong>Create your first event using the form.</div>`;
}

document.addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit]");
    if (editButton) editEvent(editButton.dataset.edit);

    const deleteButton = event.target.closest("[data-delete]");
    if (deleteButton) deleteEvent(deleteButton.dataset.delete);
});

function editEvent(id) {
    const event = events.find(item => item.id === id);
    if (!event) return;

    $("editEventId").value = event.id;
    $("eventName").value = event.title;
    $("eventCategory").value = event.category;
    $("eventCapacity").value = event.capacity;
    $("eventDate").value = event.date;
    $("eventTime").value = event.time;
    $("eventVenue").value = event.venue;
    $("eventDescription").value = event.description;
    $("formHeading").textContent = "Edit event";
    $("saveEventButton").textContent = "Save changes";
    $("cancelEditButton").hidden = false;
    $("eventName").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteEvent(id) {
    const campusEvent = events.find(item => item.id === id);
    if (!campusEvent) return;

    if (!confirm(`Delete "${campusEvent.title}" and its saved registrations?`)) return;

    const previousEvents = events;
    const previousRegistrations = registrations;
    events = events.filter(item => item.id !== id);
    registrations = registrations.filter(r => r.eventId !== id);

    if (!saveData()) {
        events = previousEvents;
        registrations = previousRegistrations;
        return;
    }

    renderAll();
    notify("Event deleted.");
}

function resetEventForm() {
    $("eventForm").reset();
    $("editEventId").value = "";
    $("formHeading").textContent = "Create an event";
    $("saveEventButton").textContent = "Create event";
    $("cancelEditButton").hidden = true;
    $("eventCapacity").value = 50;
}

$("cancelEditButton").addEventListener("click", resetEventForm);

function renderAll() {
    renderDashboard();
    renderAllEvents();
    renderRegistrations();
    renderManagedEvents();
}

// Set the date field to today's date for new events.
$("eventDate").value = new Date().toLocaleDateString("en-CA");

renderAll();