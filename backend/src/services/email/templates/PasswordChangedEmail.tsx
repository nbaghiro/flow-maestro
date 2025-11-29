import { Section, Text } from "@react-email/components";
import React from "react";
import { EmailLayout } from "./components/EmailLayout";

interface PasswordChangedEmailProps {
    userName?: string;
}

export function PasswordChangedEmail({ userName }: PasswordChangedEmailProps) {
    return (
        <EmailLayout preview="Your FlowMaestro password was changed" heading="Password Changed">
            <Section style={content}>
                <Text style={paragraph}>{userName ? `Hi ${userName},` : "Hi,"}</Text>

                <Text style={paragraph}>
                    This email confirms that your FlowMaestro account password was successfully
                    changed.
                </Text>

                <Text style={paragraph}>
                    If you made this change, no further action is required.
                </Text>

                <Text style={alertParagraph}>
                    If you did NOT change your password, please contact our support team immediately
                    at support@flowmaestro.com or reset your password right away.
                </Text>

                <Text style={paragraph}>
                    For your security, we recommend using a strong, unique password for your
                    FlowMaestro account.
                </Text>
            </Section>
        </EmailLayout>
    );
}

const content = {
    padding: "0 40px"
};

const paragraph = {
    color: "#525f7f",
    fontSize: "16px",
    lineHeight: "24px",
    textAlign: "left" as const,
    marginBottom: "16px"
};

const alertParagraph = {
    color: "#991b1b",
    fontSize: "16px",
    lineHeight: "24px",
    textAlign: "left" as const,
    marginBottom: "16px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "16px"
};
