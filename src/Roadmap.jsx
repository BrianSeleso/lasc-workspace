import { useMemo, useState } from "react";
import { PHASES, TOTAL_TASKS, taskKey, phaseDone, totalDone } from "./phases.js";
import { deleteField } from "./firebase.js";
import { Icon } from "./ui.jsx";

export default function Roadmap({ checked, onSet }) {
  const [open, setOpen] = useState(() => new Set([0]));
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const done = totalDone(checked);
  const pct = Math.round((done / TOTAL_TASKS) * 100);
  const searching = q.trim() !== "" || filter !== "all";

  const toggleOpen = (i) =>
    setOpen((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const bulk = (pi, on) => {
    const map = {};
    PHASES[pi].tasks.forEach((_, ti) => (map[taskKey(pi, ti)] = on ? true : deleteField()));
    onSet(map);
  };

  const phases = useMemo(() => {
    const s = q.trim().toLowerCase();
    return PHASES.map((p, pi) => ({
      p, pi,
      tasks: p.tasks.map((t, ti) => ({ t, ti, on: !!checked[taskKey(pi, ti)] }))
        .filter((x) => (filter === "all" || (filter === "done" ? x.on : !x.on)) && x.t.toLowerCase().includes(s)),
    })).filter((x) => x.tasks.length);
  }, [checked, filter, q]);

  return (
    <>
      <div className="summary">
        <div><b>{done}</b> of {TOTAL_TASKS} tasks done</div>
        <div className="bar"><i style={{ width: pct + "%" }} /></div>
      </div>
      <div className="search"><Icon name="search" size={18} />
        <input placeholder="Search the roadmap" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="chips">
        {[["all", "All"], ["todo", "Remaining"], ["done", "Completed"]].map(([id, l]) => (
          <button key={id} className={filter === id ? "on" : ""} onClick={() => setFilter(id)}>{l}</button>
        ))}
      </div>

      {phases.map(({ p, pi, tasks }) => {
        const d = phaseDone(pi, checked), n = p.tasks.length, full = d === n;
        const isOpen = searching || open.has(pi);
        return (
          <section className={"phase" + (full ? " full" : "")} key={pi}>
            <button className="phase-head" onClick={() => toggleOpen(pi)} aria-expanded={isOpen}>
              <span className="phase-no">{full ? "✓" : pi + 1}</span>
              <span className="phase-txt"><b>{p.title}</b><small>{p.desc}</small></span>
              <span className="phase-count">{d}/{n}</span>
              <span className={"chev" + (isOpen ? " up" : "")}><Icon name="chevron" size={18} /></span>
            </button>
            <div className="bar slim"><i style={{ width: (d / n) * 100 + "%" }} /></div>
            {isOpen && (
              <div className="phase-body">
                {tasks.map(({ t, ti, on }) => (
                  <label className={"check" + (on ? " on" : "")} key={ti}>
                    <input type="checkbox" checked={on}
                      onChange={(e) => onSet({ [taskKey(pi, ti)]: e.target.checked ? true : deleteField() })} />
                    <span>{t}</span>
                  </label>
                ))}
                {!searching && (
                  <div className="phase-actions">
                    <button onClick={() => bulk(pi, true)}>Mark phase complete</button>
                    <button onClick={() => confirm(`Clear progress for "${p.title}"?`) && bulk(pi, false)}>Clear phase</button>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
      {!phases.length && <p className="empty">No tasks match. Try another search or filter.</p>}
    </>
  );
}
