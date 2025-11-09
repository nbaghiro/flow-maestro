import {
    Save,
    Play,
    Download,
    Settings,
    ChevronDown,
    Loader2,
    CheckCircle,
    XCircle,
    LogOut,
    User
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useWorkflowStore } from "../stores/workflowStore";

export function HeaderBar() {
    const { executeWorkflow, isExecuting, executionResult, executionError } = useWorkflowStore();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const handleRun = async () => {
        // TODO: Collect inputs from input nodes if needed
        await executeWorkflow();
    };

    return (
        <header className="bg-white border-b border-border shadow-sm">
            <div className="flex items-center justify-between px-6 py-3">
                {/* Left: Logo and Workflow Name */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            FM
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-foreground">FlowMaestro</h1>
                            <p className="text-xs text-muted-foreground">Workflow Builder</p>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-border" />

                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            defaultValue="Untitled Workflow"
                            className="text-sm font-medium bg-transparent border-none outline-none focus:bg-muted/50 px-2 py-1 rounded transition-colors"
                        />
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>

                    {/* Execution Status */}
                    {isExecuting && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Executing...</span>
                        </div>
                    )}
                    {executionResult && !isExecuting && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm">
                            <CheckCircle className="w-4 h-4" />
                            <span>Success</span>
                        </div>
                    )}
                    {executionError && !isExecuting && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-lg text-sm">
                            <XCircle className="w-4 h-4" />
                            <span>{executionError}</span>
                        </div>
                    )}
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* User Info */}
                    {user && (
                        <>
                            <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 rounded-lg">
                                <User className="w-4 h-4" />
                                <span>{user.email}</span>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>

                            <div className="h-6 w-px bg-border mx-1" />
                        </>
                    )}

                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                        Export
                    </button>

                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                        <Settings className="w-4 h-4" />
                        Settings
                    </button>

                    <div className="h-6 w-px bg-border mx-1" />

                    <button className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-foreground hover:bg-muted border border-border rounded-lg transition-colors">
                        <Save className="w-4 h-4" />
                        Save
                    </button>

                    <button
                        onClick={handleRun}
                        disabled={isExecuting}
                        className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
                    >
                        {isExecuting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                        {isExecuting ? "Running..." : "Run"}
                    </button>
                </div>
            </div>
        </header>
    );
}
