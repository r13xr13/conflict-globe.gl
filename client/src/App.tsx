import React from "react";
import Globe from "./components/Globe";
import ConflictTimeline from "./components/ConflictTimeline";

export default function App() {
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ flex: 3 }}>
        <Globe />
      </div>
      <div style={{ flex: 1, borderLeft: "1px solid #333", padding: "8px" }}>
        <h2>Conflict Events</h2>
        <ConflictTimeline />
      </div>
    </div>
  );
}
