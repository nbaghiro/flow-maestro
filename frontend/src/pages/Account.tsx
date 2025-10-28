import { User, Lock, Bell } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { useAuth } from "../contexts/AuthContext";

export function Account() {
    const { user } = useAuth();

    const accountSections = [
        {
            icon: User,
            title: "Profile",
            description: "Manage your personal information",
            fields: [
                { label: "Name", value: user?.name || "Not set" },
                { label: "Email", value: user?.email || "Not set" },
            ]
        },
        {
            icon: Lock,
            title: "Security",
            description: "Password and authentication settings",
            fields: [
                { label: "Password", value: "••••••••" },
                { label: "Two-factor authentication", value: "Disabled" },
            ]
        },
        {
            icon: Bell,
            title: "Preferences",
            description: "Communication and privacy preferences",
            fields: [
                { label: "Email notifications", value: "Enabled" },
                { label: "Privacy settings", value: "Default" },
            ]
        },
    ];

    return (
        <div className="max-w-4xl mx-auto px-6 py-8">
            <PageHeader
                title="Account"
                description="Manage your account settings and preferences"
            />

            <div className="space-y-6">
                {accountSections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <div key={section.title} className="bg-white border border-border rounded-lg p-6">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-foreground mb-1">
                                        {section.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {section.description}
                                    </p>
                                    <div className="space-y-3">
                                        {section.fields.map((field) => (
                                            <div key={field.label} className="flex items-center justify-between py-2">
                                                <span className="text-sm text-muted-foreground">{field.label}</span>
                                                <span className="text-sm text-foreground font-medium">{field.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="mt-4 text-sm text-primary hover:text-primary/80 font-medium">
                                        Edit {section.title.toLowerCase()} →
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
