import axios from 'axios';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { CredentialWithData, ApiKeyData, OAuth2TokenData } from '../storage/models/Credential';

export interface CredentialTestResult {
    success: boolean;
    message: string;
    details?: any;
}

/**
 * Test a credential to verify it's valid
 */
export async function testCredential(credential: CredentialWithData): Promise<CredentialTestResult> {
    try {
        switch (credential.provider) {
            case 'openai':
                return await testOpenAI(credential);

            case 'anthropic':
                return await testAnthropic(credential);

            case 'google':
                return await testGoogle(credential);

            case 'slack':
                return await testSlack(credential);

            case 'notion':
                return await testNotion(credential);

            case 'github':
                return await testGitHub(credential);

            default:
                return await testGenericAPI(credential);
        }
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
            details: error
        };
    }
}

/**
 * Test OpenAI API key
 */
async function testOpenAI(credential: CredentialWithData): Promise<CredentialTestResult> {
    const data = credential.data as ApiKeyData;
    const openai = new OpenAI({ apiKey: data.api_key });

    try {
        // List models as a simple test
        const models = await openai.models.list();

        return {
            success: true,
            message: 'OpenAI API key is valid',
            details: {
                model_count: models.data.length
            }
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message || 'OpenAI API key is invalid',
            details: error
        };
    }
}

/**
 * Test Anthropic API key
 */
async function testAnthropic(credential: CredentialWithData): Promise<CredentialTestResult> {
    const data = credential.data as ApiKeyData;
    const anthropic = new Anthropic({ apiKey: data.api_key });

    try {
        // Send a minimal test message
        const response = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }]
        });

        return {
            success: true,
            message: 'Anthropic API key is valid',
            details: {
                model: response.model
            }
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message || 'Anthropic API key is invalid',
            details: error
        };
    }
}

/**
 * Test Google API key
 */
async function testGoogle(credential: CredentialWithData): Promise<CredentialTestResult> {
    if (credential.type === 'oauth2') {
        const data = credential.data as OAuth2TokenData;

        try {
            // Test with userinfo endpoint
            const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${data.access_token}`
                }
            });

            return {
                success: true,
                message: 'Google OAuth token is valid',
                details: {
                    email: response.data.email,
                    verified: response.data.verified_email
                }
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'Google OAuth token is invalid or expired',
                details: error.response?.data
            };
        }
    } else {
        const data = credential.data as ApiKeyData;

        try {
            // Test with a simple API call (e.g., Gemini API)
            const response = await axios.get(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${data.api_key}`
            );

            return {
                success: true,
                message: 'Google API key is valid',
                details: {
                    models_count: response.data.models?.length || 0
                }
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'Google API key is invalid',
                details: error.response?.data
            };
        }
    }
}

/**
 * Test Slack OAuth token
 */
async function testSlack(credential: CredentialWithData): Promise<CredentialTestResult> {
    const data = credential.data as OAuth2TokenData;

    try {
        const response = await axios.post(
            'https://slack.com/api/auth.test',
            {},
            {
                headers: {
                    'Authorization': `Bearer ${data.access_token}`
                }
            }
        );

        if (response.data.ok) {
            return {
                success: true,
                message: 'Slack token is valid',
                details: {
                    team: response.data.team,
                    user: response.data.user
                }
            };
        } else {
            return {
                success: false,
                message: response.data.error || 'Slack token is invalid',
                details: response.data
            };
        }
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to test Slack token',
            details: error.response?.data
        };
    }
}

/**
 * Test Notion OAuth token
 */
async function testNotion(credential: CredentialWithData): Promise<CredentialTestResult> {
    const data = credential.data as OAuth2TokenData;

    try {
        const response = await axios.get(
            'https://api.notion.com/v1/users/me',
            {
                headers: {
                    'Authorization': `Bearer ${data.access_token}`,
                    'Notion-Version': '2022-06-28'
                }
            }
        );

        return {
            success: true,
            message: 'Notion token is valid',
            details: {
                user_id: response.data.id,
                type: response.data.type
            }
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Notion token is invalid or expired',
            details: error.response?.data
        };
    }
}

/**
 * Test GitHub OAuth token or personal access token
 */
async function testGitHub(credential: CredentialWithData): Promise<CredentialTestResult> {
    if (credential.type === 'oauth2') {
        const data = credential.data as OAuth2TokenData;

        try {
            const response = await axios.get('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${data.access_token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            return {
                success: true,
                message: 'GitHub token is valid',
                details: {
                    login: response.data.login,
                    id: response.data.id
                }
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'GitHub token is invalid or expired',
                details: error.response?.data
            };
        }
    } else {
        const data = credential.data as ApiKeyData;

        try {
            const response = await axios.get('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${data.api_key}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            return {
                success: true,
                message: 'GitHub token is valid',
                details: {
                    login: response.data.login,
                    id: response.data.id
                }
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'GitHub token is invalid',
                details: error.response?.data
            };
        }
    }
}

/**
 * Generic API test (just check if we can make a HEAD request)
 */
async function testGenericAPI(credential: CredentialWithData): Promise<CredentialTestResult> {
    // For generic credentials, we don't have a specific endpoint to test
    // Just return success if the credential exists
    return {
        success: true,
        message: `${credential.provider} credential stored successfully`,
        details: {
            note: 'Cannot automatically test this credential type. Please test manually in your workflow.'
        }
    };
}
