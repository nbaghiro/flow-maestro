import { getAuthToken } from "./api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface VersionRow {
    id: string;
    name: string | null;
    created_at: string;
    snapshot: Record<string, unknown>;
    description?: string | null;
}

export async function listVersions(workflowId: string) {
    const token = getAuthToken();

    const res = await fetch(`${API_BASE_URL}/api/versions/${workflowId}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error("Failed to fetch versions");
    const json = await res.json();
    return json.data.map((v: VersionRow) => ({
        id: v.id,
        name: v.name,
        createdAt: v.created_at,
        snapshot: v.snapshot,
        formatted: new Date(v.created_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        })
    }));
}

export async function createVersion(workflowId: string, name?: string) {
    const token = getAuthToken();

    const res = await fetch(`${API_BASE_URL}/api/versions/${workflowId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
    });

    if (!res.ok) throw new Error("Failed to create version");
    return res.json();
}

export async function revertVersion(versionId: string) {
    const token = getAuthToken();

    const res = await fetch(`${API_BASE_URL}/api/versions/revert/${versionId}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error("Failed to revert version");
    return res.json();
}

export async function deleteVersion(versionId: string, workflowId: string) {
    const token = getAuthToken();

    const res = await fetch(`${API_BASE_URL}/api/versions/${versionId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error("Failed to delete version");

    return listVersions(workflowId);
}

export async function renameVersion(id: string, newName: string) {
    const token = getAuthToken();

    const res = await fetch(`${API_BASE_URL}/api/versions/rename/${id}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName })
    });

    if (!res.ok) throw new Error("Failed to rename version");
    return res.json();
}
