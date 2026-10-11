import { useEffect, useMemo, useState } from "react";
import { configured, useCollection, useDocData, addItem, updateItem, removeItem, setChecked } from "./firebase.js";
import { TaskForm, MeetingForm } from "./Forms.jsx";
import { Attendance, getAttendance, summary } from "./Attendance.jsx";
import Roadmap from "./Roadmap.jsx";
import { PHASES, TOTAL_TASKS, phaseDone, totalDone } from "./phases.js";
import { Icon, Ring, todayStr, fmt } from "./ui.jsx";

const STATUS = { todo: "To do", in_progress: "In progress", blocked: "Blocked", completed: "Completed" };
const isOverdue = (t) => t.status !== "completed" && t.dueDate && t.dueDate < todayStr();
const byDue = (a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
const TABS = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "tasks", label: "Tasks", icon: "tasks" },
  { id: "roadmap", label: "Roadmap", icon: "roadmap" },
  { id: "meetings", label: "Meetings", icon: "meetings" },
];

export default function App() {
  const [tab, setTab] = useState("overview");
  const [form, setForm] = useState(null);
  const [toast, setToast] = useState("");
  const [slow, setSlow] = useState(false);
  const tasks = useCollection("tasks");
  const meetings = useCollection("meetings");
  const road = useDocData("tracker", "roadmap");
  const ready = tasks.ready && meetings.ready && road.ready;
  const error = tasks.error || meetings.error || road.error;
  const checked = road.data.checked || {};

  useEffect(() => { const t = setTimeout(() => setSlow(true), 7000); return () => clearTimeout(t); }, []);
  if (!configured) return <Setup />;

  const fail = (e) => { setToast(e?.message || "Could not save"); setTimeout(() => setToast(""), 4000); };
  const clean = (v) => { const d = { ...v }; delete d.id; delete d.createdAt; return d; };

  // Writes are optimistic: the UI updates instantly and syncs in the background.
  const saveTask = (v) => {
    const data = clean(v);
    data.completionDate = v.status === "completed" ? v.completionDate || todayStr() : "";
    (form.item ? updateItem("tasks", form.item.id, data) : addItem("tasks", data)).catch(fail);
    setForm(null);
  };
  const saveMeeting = (v) => {
    (form.item ? updateItem("meetings", form.item.id, clean(v)) : addItem("meetings", clean(v))).catch(fail);
    setForm(null);
  };
  const complete = (t) => updateItem("tasks", t.id, { status: "completed", completionDate: todayStr() }).catch(fail);
  const delTask = (t) => confirm(`Delete "${t.title}"?`) && removeItem("tasks", t.id).catch(fail);
  const delMeeting = (m) => confirm(`Delete "${m.title}"?`) && removeItem("meetings", m.id).catch(fail);
  const setAttendance = (m, list) => updateItem("meetings", m.id, { attendance: list }).catch(fail);
  const editTask = (t) => setForm({ type: "task", item: t });
  const editMeeting = (m) => setForm({ type: "meeting", item: m });

  const showFab = tab === "tasks" || tab === "meetings";
  const addNew = () => setForm(tab === "meetings" ? { type: "meeting" } : { type: "task", section: "project" });

  return (
    <div className="shell">
      <nav className="nav" aria-label="Main">
        <div className="brand"><span className="mark">LS</span><b>LASC<br />Workspace</b></div>
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} /><span>{t.label}</span>
          </button>
        ))}
      </nav>

      <div className="content">
        <header className="top">
          <span className="mark">LS</span>
          <h1>{TABS.find((t) => t.id === tab).label}</h1>
        </header>
        <main>
          {error && <p className="banner err">Database error: {error}. Check that Firestore is created and the rules are published.</p>}
          {!ready && slow && !error && (
            <p className="banner warn">Still connecting to Firebase. Make sure the Firestore database exists and the rules from <code>firestore.rules</code> are published.</p>
          )}

          {tab === "overview" && (
            <Overview tasks={tasks.items} meetings={meetings.items} checked={checked} ready={ready} go={setTab}
              onAddTask={() => setForm({ type: "task", section: "project" })} onAddMeeting={() => setForm({ type: "meeting" })}
              onEdit={editTask} onComplete={complete} />
          )}
          {tab === "tasks" && <Tasks tasks={tasks.items} ready={tasks.ready} onEdit={editTask} onDelete={delTask} onComplete={complete} />}
          {tab === "roadmap" && <Roadmap checked={checked} onSet={(m) => setChecked(m).catch(fail)} />}
          {tab === "meetings" && (
            <Meetings meetings={meetings.items} ready={meetings.ready} onEdit={editMeeting} onDelete={delMeeting} onAttendance={setAttendance} />
          )}
        </main>
      </div>

      {showFab && <button className="fab" onClick={addNew} aria-label={tab === "meetings" ? "New meeting" : "New task"}><Icon name="plus" size={26} /></button>}
      {toast && <div className="toast">{toast}</div>}

      {form?.type === "task" && (
        <TaskForm task={form.item} section={form.section || form.item?.section || "project"} onSave={saveTask} onClose={() => setForm(null)} />
      )}
      {form?.type === "meeting" && <MeetingForm meeting={form.item} onSave={saveMeeting} onClose={() => setForm(null)} />}
    </div>
  );
}

function Skeleton() {
  return <>{[0, 1, 2].map((i) => <div className="skel" key={i} />)}</>;
}

function Overview({ tasks, meetings, checked, ready, go, onAddTask, onAddMeeting, onEdit, onComplete }) {
  const today = todayStr();
  const done = totalDone(checked);
  const pct = Math.round((done / TOTAL_TASKS) * 100);
  const focus = PHASES.findIndex((_, i) => phaseDone(i, checked) < PHASES[i].tasks.length);
  const open = tasks.filter((t) => t.status !== "completed");
  const overdue = open.filter(isOverdue).length;
  const upcoming = meetings.filter((m) => m.status === "planned" && m.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const next = [...open].sort(byDue).slice(0, 4);

  return (
    <>
      <section className="hero">
        <Ring pct={pct}><b>{pct}%</b></Ring>
        <div className="hero-txt">
          <h2>Roadmap progress</h2>
          <p>{done} of {TOTAL_TASKS} tasks complete</p>
          <p className="focus">{focus < 0 ? "Every phase is complete." : `Now: ${PHASES[focus].title}`}</p>
          <button onClick={() => go("roadmap")}>Open roadmap</button>
        </div>
      </section>

      <div className="stats">
        <Stat n={open.length} label="Open tasks" />
        <Stat n={overdue} label="Overdue" warn={overdue > 0} />
        <Stat n={tasks.length - open.length} label="Done" />
        <Stat n={upcoming.length} label="Meetings ahead" />
      </div>
      <div className="quick">
        <button onClick={onAddTask}><Icon name="plus" size={16} /> Task</button>
        <button onClick={onAddMeeting}><Icon name="plus" size={16} /> Meeting</button>
      </div>

      <h2 className="sub">Next up</h2>
      {!ready ? <Skeleton /> : next.length
        ? next.map((t) => <TaskCard key={t.id} t={t} onEdit={onEdit} onComplete={onComplete} />)
        : <p className="empty">Nothing open. Add the next task above.</p>}

      <h2 className="sub">Upcoming meetings</h2>
      {!ready ? <Skeleton /> : upcoming.length
        ? upcoming.slice(0, 3).map((m) => <MeetingCard key={m.id} m={m} />)
        : <p className="empty">No meetings scheduled.</p>}
    </>
  );
}

const Stat = ({ n, label, warn }) => (
  <div className={"stat" + (warn ? " warn" : "")}><b>{n}</b><span>{label}</span></div>
);

function Tasks({ tasks, ready, onEdit, onDelete, onComplete }) {
  const [sec, setSec] = useState("all");
  const [filter, setFilter] = useState("open");
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.toLowerCase();
    return tasks
      .filter((t) => sec === "all" || t.section === sec)
      .filter((t) => filter === "all" ? true : filter === "open" ? t.status !== "completed" : filter === "overdue" ? isOverdue(t) : t.status === "completed")
      .filter((t) => `${t.title} ${t.description} ${t.category} ${t.assignee}`.toLowerCase().includes(s))
      .sort(byDue);
  }, [tasks, sec, filter, q]);

  return (
    <>
      <div className="search"><Icon name="search" size={18} />
        <input placeholder="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="seg wide">
        {[["all", "All"], ["project", "Project"], ["development", "Development"]].map(([id, l]) => (
          <button key={id} className={sec === id ? "on" : ""} onClick={() => setSec(id)}>{l}</button>
        ))}
      </div>
      <div className="chips">
        {[["open", "Open"], ["overdue", "Overdue"], ["completed", "Done"], ["all", "Everything"]].map(([id, l]) => (
          <button key={id} className={filter === id ? "on" : ""} onClick={() => setFilter(id)}>{l}</button>
        ))}
      </div>
      {!ready ? <Skeleton /> : shown.length
        ? shown.map((t) => <TaskCard key={t.id} t={t} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} />)
        : <p className="empty">No tasks here yet. Tap the + button to add one.</p>}
    </>
  );
}

function TaskCard({ t, onEdit, onDelete, onComplete }) {
  const late = isOverdue(t);
  return (
    <article className={"card st-" + t.status}>
      <div className="card-top">
        <h3>{t.title}</h3>
        <span className={"tag s-" + t.status}>{STATUS[t.status]}</span>
      </div>
      {t.description && <p className="body">{t.description}</p>}
      <p className="meta">
        <span className={"prio p-" + t.priority}>{t.priority}</span>
        <span>{t.section === "development" ? "Development" : "Project"}</span>
        {t.category && <span>{t.category}</span>}
        {t.assignee && <span>{t.assignee}</span>}
        <span className={late ? "late" : ""}>
          {t.status === "completed" ? `Done ${fmt(t.completionDate)}` : t.dueDate ? `${late ? "Was due" : "Due"} ${fmt(t.dueDate)}` : "No due date"}
        </span>
      </p>
      {t.status === "completed" && t.outcome && <p className="body">Outcome: {t.outcome}</p>}
      <div className="card-actions">
        {t.status !== "completed" && <button className="ok" onClick={() => onComplete(t)}>Mark done</button>}
        <button onClick={() => onEdit(t)}>Edit</button>
        {onDelete && <button className="danger" onClick={() => onDelete(t)}>Delete</button>}
      </div>
    </article>
  );
}

function Meetings({ meetings, ready, onEdit, onDelete, onAttendance }) {
  const sorted = [...meetings].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  if (!ready) return <Skeleton />;
  return sorted.length
    ? sorted.map((m) => <MeetingCard key={m.id} m={m} onEdit={onEdit} onDelete={onDelete} onAttendance={onAttendance} />)
    : <p className="empty">No meetings yet. Tap the + button to add one.</p>;
}

function MeetingCard({ m, onEdit, onDelete, onAttendance }) {
  const [showAtt, setShowAtt] = useState(false);
  const list = getAttendance(m);
  const s = summary(list);
  const d = new Date((m.date || todayStr()) + "T12:00:00");
  return (
    <article className="card meeting">
      <div className="date-block">
        <b>{d.toLocaleDateString(undefined, { day: "2-digit" })}</b>
        <span>{d.toLocaleDateString(undefined, { month: "short" })}</span>
      </div>
      <div className="m-main">
        <div className="card-top">
          <h3>{m.title}</h3>
          <span className={"tag m-" + m.status}>{m.status}</span>
        </div>
        <p className="meta">
          <span>{fmt(m.date)}{m.time ? ` at ${m.time}` : ""}</span>
          {m.location && <span>{m.location}</span>}
          {m.organiser && <span>Organiser: {m.organiser}</span>}
        </p>
        {onEdit && (
          <>
            <button className="att-toggle" onClick={() => setShowAtt((x) => !x)} aria-expanded={showAtt}>
              <Icon name="users" size={16} />
              {s.present + s.absent === 0 ? "Attendance not marked" : `${s.present} of ${s.total} present`}
              <span className={"chev" + (showAtt ? " up" : "")}><Icon name="chevron" size={16} /></span>
            </button>
            {showAtt && <Attendance list={list} onChange={(l) => onAttendance(m, l)} />}
            {m.agenda && <p className="body"><b>Agenda:</b> {m.agenda}</p>}
            {m.notes && <p className="body"><b>Minutes:</b> {m.notes}</p>}
            {m.decisions && <p className="body"><b>Decisions:</b> {m.decisions}</p>}
            <div className="card-actions">
              <button onClick={() => onEdit(m)}>Edit minutes</button>
              <button className="danger" onClick={() => onDelete(m)}>Delete</button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function Setup() {
  return (
    <div className="setup">
      <h1>One more step</h1>
      <p>Firebase isn’t connected yet. Copy <code>.env.example</code> to <code>.env</code>, paste in your Firebase keys, then restart <code>npm run dev</code>.</p>
    </div>
  );
}
