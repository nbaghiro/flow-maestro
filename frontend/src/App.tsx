import { Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { WorkflowLibrary } from "./pages/WorkflowLibrary";
import { FlowBuilder } from "./pages/FlowBuilder";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App() {
    return (
        <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <WorkflowLibrary />
                    </ProtectedRoute>
                }
            />

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
