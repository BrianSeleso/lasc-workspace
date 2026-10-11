import { ATTENDEES } from "./phases.js";

export const defaultAttendance = () => ATTENDEES.map((name) => ({ name, status: "" }));
export const getAttendance = (m) => (Array.isArray(m?.attendance) ? m.attendance : defaultAttendance());
export const summary = (list) => ({
  present: list.filter((a) => a.status === "present").length,
  absent: list.filter((a) => a.status === "absent").length,
  total: list.length,
});
const initials = (n) => n.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function Attendance({ list, onChange, onRemove }) {
  const set = (i, status) =>
    onChange(list.map((a, k) => (k === i ? { ...a, status: a.status === status ? "" : status } : a)));
  return (
    <div className="att">
      {list.map((a, i) => (
        <div className="att-row" key={a.name + i}>
          <span className="avatar">{initials(a.name)}</span>
          <span className="att-name">{a.name}</span>
          {onRemove && !ATTENDEES.includes(a.name) && (
            <button type="button" className="ghost sm" onClick={() => onRemove(i)} aria-label={`Remove ${a.name}`}>✕</button>
          )}
          <div className="seg">
            <button type="button" className={a.status === "present" ? "on present" : ""} onClick={() => set(i, "present")}>Present</button>
            <button type="button" className={a.status === "absent" ? "on absent" : ""} onClick={() => set(i, "absent")}>Absent</button>
          </div>
        </div>
      ))}
    </div>
  );
}
