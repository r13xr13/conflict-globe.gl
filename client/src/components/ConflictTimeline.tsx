import React, { useEffect, useState } from "react";
import { fetchConflicts, ConflictEvent } from "../services/api";

export default function ConflictTimeline() {
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConflicts()
      .then(setEvents)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <div style={{ color: "red" }}>Error: {error}</div>;
  }

  if (!events.length) {
    return <div>Loading events…</div>;
  }

  return (
    <div style={{ overflowY: "auto", height: "calc(100vh - 60px)" }}>
      {events.map((ev) => (
        <div
          key={ev.id}
          style={{
            marginBottom: "8px",
            paddingBottom: "8px",
            borderBottom: "1px solid #ddd"
          }}
        >
          <div style={{ fontWeight: 600 }}>{ev.type}</div>
          <div style={{ fontSize: "12px", color: "#666" }}>{ev.date}</div>
          <div style={{ fontSize: "12px" }}>{ev.description}</div>
          <div style={{ fontSize: "11px", color: "#999" }}>
            {ev.lat.toFixed(3)}, {ev.lon.toFixed(3)}
          </div>
        </div>
      ))}
    </div>
  );
}
