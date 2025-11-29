import { Button, Section, Text } from "@react-email/components";
import React from "react";
import { EmailLayout } from "./components/EmailLayout";

interface PasswordResetEmailProps {
    resetUrl: string;
    userName?: string;
}

export function PasswordResetEmail({ resetUrl, userName }: PasswordResetEmailProps) {
    return (
        <EmailLayout preview="Reset your FlowMaestro password" heading="Reset your password">
            <Section style={content}>
                <Text style={paragraph}>{userName ? `Hi ${userName},` : "Hi,"}</Text>

                <Text style={paragraph}>
                    We received a request to reset your password for your FlowMaestro account. Click
                    the button below to create a new password.
                </Text>

                <Button style={button} href={resetUrl}>
                    Reset Password
                </Button>

                <Text style={paragraph}>
                    This link will expire in 15 minutes for security reasons.
                </Text>

                <Text style={paragraph}>
                    If you didn't request a password reset, you can safely ignore this email. Your
                    password will remain unchanged.
                </Text>

                <Text style={paragraph}>
                    For security reasons, if you continue to receive these emails without requesting
                    them, please contact our support team.
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

const button = {
    backgroundColor: "#1a1a1a",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "block",
    width: "100%",
    padding: "12px 0",
    marginTop: "24px",
    marginBottom: "24px"
};
