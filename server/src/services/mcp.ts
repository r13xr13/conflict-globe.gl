import axios from "axios";
import { EventData } from "./conflict";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL;
const MCP_API_KEY = process.env.MCP_API_KEY;

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface MCPResource {
  uri: string;
  name: string;
  mimeType: string;
  text?: string;
}

export async function fetchMCPTools(): Promise<MCPTool[]> {
  if (!MCP_SERVER_URL) return [];

  try {
    const headers: Record<string, string> = {};
    if (MCP_API_KEY) {
      headers["Authorization"] = `Bearer ${MCP_API_KEY}`;
    }

    const resp = await axios.get(`${MCP_SERVER_URL}/tools`, { headers, timeout: 10000 });
    return resp.data?.tools || [];
  } catch (err: any) {
    console.error("[MCP] Error fetching tools:", err.message);
    return [];
  }
}

export async function callMCPTool(toolName: string, args: Record<string, any>): Promise<any> {
  if (!MCP_SERVER_URL) return null;

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (MCP_API_KEY) {
      headers["Authorization"] = `Bearer ${MCP_API_KEY}`;
    }

    const resp = await axios.post(
      `${MCP_SERVER_URL}/tools/${toolName}/call`,
      { arguments: args },
      { headers, timeout: 30000 }
    );
    return resp.data;
  } catch (err: any) {
    console.error(`[MCP] Error calling tool ${toolName}:`, err.message);
    return null;
  }
}

export async function fetchMCPResources(): Promise<MCPResource[]> {
  if (!MCP_SERVER_URL) return [];

  try {
    const headers: Record<string, string> = {};
    if (MCP_API_KEY) {
      headers["Authorization"] = `Bearer ${MCP_API_KEY}`;
    }

    const resp = await axios.get(`${MCP_SERVER_URL}/resources`, { headers, timeout: 10000 });
    return resp.data?.resources || [];
  } catch (err: any) {
    console.error("[MCP] Error fetching resources:", err.message);
    return [];
  }
}

export async function fetchMCPResourceContent(uri: string): Promise<string | null> {
  if (!MCP_SERVER_URL) return null;

  try {
    const headers: Record<string, string> = {};
    if (MCP_API_KEY) {
      headers["Authorization"] = `Bearer ${MCP_API_KEY}`;
    }

    const resp = await axios.get(`${MCP_SERVER_URL}/resources/${encodeURIComponent(uri)}`, { headers, timeout: 15000 });
    return resp.data?.contents?.[0]?.text || null;
  } catch (err: any) {
    console.error(`[MCP] Error fetching resource ${uri}:`, err.message);
    return null;
  }
}

export async function queryMCPForEvents(query: string): Promise<EventData[]> {
  const result = await callMCPTool("query_events", { query });
  if (!result?.events) return [];

  return result.events.map((e: any) => ({
    id: e.id || `mcp-${Date.now()}`,
    lat: parseFloat(e.lat),
    lon: parseFloat(e.lon),
    date: e.date || new Date().toISOString(),
    type: e.type || "MCP Event",
    description: e.description || "",
    source: "MCP",
    category: e.category || "conflict",
    severity: e.severity || "medium",
  }));
}
