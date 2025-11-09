import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Account } from "./pages/Account";
import { AgentBuilder } from "./pages/AgentBuilder";
import { Agents } from "./pages/Agents";
import { Connections } from "./pages/Connections";
import { FlowBuilder } from "./pages/FlowBuilder";
import { KnowledgeBaseList, KnowledgeBaseDetail } from "./pages/KnowledgeBases";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Settings } from "./pages/Settings";
import { Templates } from "./pages/Templates";
import { Workflows } from "./pages/Workflows";
import { Workspace } from "./pages/Workspace";

function App() {
    return (
        <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes with sidebar layout */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <AppLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Workflows />} />
                <Route path="agents" element={<Agents />} />
                <Route path="connections" element={<Connections />} />
                <Route path="knowledge-bases" element={<KnowledgeBaseList />} />
                <Route path="knowledge-bases/:id" element={<KnowledgeBaseDetail />} />
                <Route path="templates" element={<Templates />} />
                <Route path="settings" element={<Settings />} />
                <Route path="account" element={<Account />} />
                <Route path="workspace" element={<Workspace />} />
            </Route>

            {/* Full-screen builder without sidebar */}
            <Route
                path="/builder/:workflowId"
                element={
                    <ProtectedRoute>
                        <FlowBuilder />
                    </ProtectedRoute>
                }
            />

            {/* Full-screen agent builder without sidebar */}
            <Route
                path="/agents/:agentId"
                element={
                    <ProtectedRoute>
                        <AgentBuilder />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/agents/:agentId/test"
                element={
                    <ProtectedRoute>
                        <AgentBuilder />
                    </ProtectedRoute>
                }
            />

            {/* Catch all - redirect to root */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
