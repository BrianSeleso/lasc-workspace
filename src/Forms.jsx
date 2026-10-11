import { useState } from "react";
import { Attendance, getAttendance, summary } from "./Attendance.jsx";
import { ATTENDEES as ATT_NAMES } from "./phases.js";

export function Modal({ title, onClose, children }) {
  return (
    <div className="backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function useForm(initial, onSave, validate) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    const problem = validate(v);
    if (problem) return setErr(problem);
    onSave(v);
  };
  return { v, setV, set, submit, err };
}

export function TaskForm({ task, section, onSave, onClose }) {
  const f = useForm(
    { section, title: "", description: "", category: "", assignee: "", dueDate: "", priority: "medium", status: "todo", outcome: "", ...task },
    onSave,
    (x) => (!x.title.trim() ? "Enter a task title." : "")
  );
  const { v, set } = f;
  return (
    <Modal title={task ? "Edit task" : "New task"} onClose={onClose}>
      <form onSubmit={f.submit}>
        <label>Title<input value={v.title} onChange={set("title")} autoFocus placeholder="What needs to be done?" /></label>
        <label>Details<textarea rows="3" value={v.description} onChange={set("description")} /></label>
        <div className="row">
          <label>Section
            <select value={v.section} onChange={set("section")}>
              <option value="project">Project</option>
              <option value="development">Development</option>
            </select>
          </label>
          <label>Status
            <select value={v.status} onChange={set("status")}>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>
        <div className="row">
          <label>Assigned to
            <select value={v.assignee} onChange={set("assignee")}>
              <option value="">Unassigned</option>
              {ATT_NAMES.map((n) => <option key={n}>{n}</option>)}
              {v.assignee && !ATT_NAMES.includes(v.assignee) && <option>{v.assignee}</option>}
            </select>
          </label>
          <label>Due date<input type="date" value={v.dueDate} onChange={set("dueDate")} /></label>
        </div>
        <div className="row">
          <label>Priority
            <select value={v.priority} onChange={set("priority")}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label>Category<input value={v.category} onChange={set("category")} placeholder="e.g. Research" /></label>
        </div>
        <label>Outcome / notes<textarea rows="2" value={v.outcome} onChange={set("outcome")} placeholder="What was delivered, or why it slipped" /></label>
        {f.err && <p className="error">{f.err}</p>}
        <div className="actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary">Save task</button>
        </div>
      </form>
    </Modal>
  );
}

export function MeetingForm({ meeting, onSave, onClose }) {
  const [guest, setGuest] = useState("");
  const f = useForm(
    { title: "", date: "", time: "", location: "", organiser: "", agenda: "", notes: "", decisions: "", status: "planned", ...meeting, attendance: getAttendance(meeting) },
    onSave,
    (x) => (!x.title.trim() ? "Enter a meeting title." : !x.date ? "Pick a date." : "")
  );
  const { v, set, setV } = f;
  const s = summary(v.attendance);
  const setList = (attendance) => setV((p) => ({ ...p, attendance }));
  const addGuest = () => {
    const name = guest.trim();
    if (!name || v.attendance.some((a) => a.name.toLowerCase() === name.toLowerCase())) return setGuest("");
    setList([...v.attendance, { name, status: "present" }]);
    setGuest("");
  };
  return (
    <Modal title={meeting ? "Edit meeting" : "New meeting"} onClose={onClose}>
      <form onSubmit={f.submit}>
        <label>Title<input value={v.title} onChange={set("title")} autoFocus /></label>
        <div className="row">
          <label>Date<input type="date" value={v.date} onChange={set("date")} /></label>
          <label>Time<input type="time" value={v.time} onChange={set("time")} /></label>
        </div>
        <div className="row">
          <label>Location or link<input value={v.location} onChange={set("location")} /></label>
          <label>Organiser
            <select value={v.organiser} onChange={set("organiser")}>
              <option value="">Not set</option>
              {ATT_NAMES.map((n) => <option key={n}>{n}</option>)}
              {v.organiser && !ATT_NAMES.includes(v.organiser) && <option>{v.organiser}</option>}
            </select>
          </label>
        </div>

        <div className="att-box">
          <div className="att-head">
            <b>Attendance <span className="muted">{s.present} present, {s.absent} absent of {s.total}</span></b>
            <button type="button" className="sm" onClick={() => setList(v.attendance.map((a) => ({ ...a, status: "present" })))}>Mark all present</button>
          </div>
          <Attendance list={v.attendance} onChange={setList} onRemove={(i) => setList(v.attendance.filter((_, k) => k !== i))} />
          <div className="guest">
            <input placeholder="Add another attendee" value={guest} onChange={(e) => setGuest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGuest())} />
            <button type="button" onClick={addGuest}>Add</button>
          </div>
        </div>

        <label>Agenda<textarea rows="3" value={v.agenda} onChange={set("agenda")} /></label>
        <label>Minutes<textarea rows="3" value={v.notes} onChange={set("notes")} /></label>
        <label>Decisions and actions<textarea rows="3" value={v.decisions} onChange={set("decisions")} /></label>
        <label>Status
          <select value={v.status} onChange={set("status")}>
            <option value="planned">Planned</option>
            <option value="held">Held</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        {f.err && <p className="error">{f.err}</p>}
        <div className="actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary">Save meeting</button>
        </div>
      </form>
    </Modal>
  );
}
