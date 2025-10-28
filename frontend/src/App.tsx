import { Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Workflows } from "./pages/Workflows";
import { Credentials } from "./pages/Credentials";
import { Integrations } from "./pages/Integrations";
import { Templates } from "./pages/Templates";
import { Executions } from "./pages/Executions";
import { Settings } from "./pages/Settings";
import { Account } from "./pages/Account";
import { Workspace } from "./pages/Workspace";
import { FlowBuilder } from "./pages/FlowBuilder";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";

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
                <Route path="credentials" element={<Credentials />} />
                <Route path="integrations" element={<Integrations />} />
                <Route path="templates" element={<Templates />} />
                <Route path="executions" element={<Executions />} />
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

            {/* Catch all - redirect to root */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
