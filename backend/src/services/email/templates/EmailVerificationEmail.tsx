import { Button, Section, Text } from "@react-email/components";
import React from "react";
import { EmailLayout } from "./components/EmailLayout";

interface EmailVerificationEmailProps {
    verificationUrl: string;
    userName?: string;
}

export function EmailVerificationEmail({ verificationUrl, userName }: EmailVerificationEmailProps) {
    return (
        <EmailLayout preview="Verify your FlowMaestro email address" heading="Verify your email">
            <Section style={content}>
                <Text style={paragraph}>{userName ? `Welcome ${userName}!` : "Welcome!"}</Text>

                <Text style={paragraph}>
                    Thanks for signing up for FlowMaestro. To complete your registration and get
                    full access to all features, please verify your email address by clicking the
                    button below.
                </Text>

                <Button style={button} href={verificationUrl}>
                    Verify Email Address
                </Button>

                <Text style={paragraph}>This link will expire in 15 minutes.</Text>

                <Text style={paragraph}>
                    If you didn't create a FlowMaestro account, you can safely ignore this email.
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
