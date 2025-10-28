import { Palette, Bell, Key, Shield } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";

export function Settings() {
    const settingsSections = [
        {
            icon: Palette,
            title: "Appearance",
            description: "Customize the look and feel",
            items: ["Theme", "Language", "Density"]
        },
        {
            icon: Bell,
            title: "Notifications",
            description: "Manage your notification preferences",
            items: ["Email notifications", "Workflow alerts", "Execution reports"]
        },
        {
            icon: Key,
            title: "API & Webhooks",
            description: "API keys and webhook configuration",
            items: ["API keys", "Webhooks", "Rate limits"]
        },
        {
            icon: Shield,
            title: "Security",
            description: "Security and privacy settings",
            items: ["Two-factor authentication", "Active sessions", "Audit log"]
        },
    ];

    return (
        <div className="max-w-4xl mx-auto px-6 py-8">
            <PageHeader
                title="Settings"
                description="Manage your application preferences and configuration"
            />

            <div className="space-y-6">
                {settingsSections.map((section) => {
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
                                    <div className="space-y-2">
                                        {section.items.map((item) => (
                                            <div
                                                key={item}
                                                className="flex items-center justify-between py-2 px-3 hover:bg-muted rounded-lg transition-colors cursor-pointer"
                                            >
                                                <span className="text-sm text-foreground">{item}</span>
                                                <span className="text-xs text-muted-foreground">Configure →</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
