import axios from 'axios';
import type { JsonObject } from '@flowmaestro/shared';
import * as fs from 'fs/promises';
import * as path from 'path';
import { interpolateVariables } from './utils';

// pdf-parse - require directly, will be mocked in tests
const pdf = require('pdf-parse');

export interface FileOperationsNodeConfig {
    operation: 'read' | 'write' | 'parsePDF' | 'parseCSV' | 'parseJSON';
    fileSource?: 'upload' | 'url' | 'path'; // For read/parse operations
    filePath?: string; // Local file path or URL
    fileData?: string; // Base64 encoded file data
    content?: string; // Content to write
    format?: 'csv' | 'json' | 'xml' | 'text' | 'pdf' | 'markdown';
    outputPath?: string; // Where to write file
    outputVariable?: string; // Variable name to store result
}

export interface FileOperationsNodeResult {
    content?: string;
    filePath?: string;
    metadata?: {
        size: number;
        pages?: number;
        format?: string;
    };
}

/**
 * Execute File Operations node - handles file reading, writing, and parsing
 */
export async function executeFileOperationsNode(
    config: FileOperationsNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    console.log(`[FileOps] Operation: ${config.operation}`);

    let result: FileOperationsNodeResult;

    switch (config.operation) {
        case 'read':
            result = await readFile(config, context);
            break;
        case 'write':
            result = await writeFile(config, context);
            break;
        case 'parsePDF':
            result = await parsePDF(config, context);
            break;
        case 'parseCSV':
            result = await parseCSV(config, context);
            break;
        case 'parseJSON':
            result = await parseJSONFile(config, context);
            break;
        default:
            throw new Error(`Unsupported file operation: ${config.operation}`);
    }

    // Wrap result in outputVariable if specified
    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }

    return result as unknown as JsonObject;
}

async function readFile(
    config: FileOperationsNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const filePath = interpolateVariables(config.filePath || '', context);

    if (config.fileSource === 'url') {
        // Download file from URL
        console.log(`[FileOps] Downloading from URL: ${filePath}`);
        const response = await axios.get(filePath, { responseType: 'text' });
        return {
            content: response.data,
            metadata: {
                size: response.data.length
            }
        } as unknown as JsonObject;
    } else {
        // Read from local filesystem
        console.log(`[FileOps] Reading from path: ${filePath}`);
        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);
        return {
            content,
            filePath,
            metadata: {
                size: stats.size
            }
        } as unknown as JsonObject;
    }
}

async function writeFile(
    config: FileOperationsNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const content = interpolateVariables(config.content || '', context);
    const outputPath = interpolateVariables(config.outputPath || '', context);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    console.log(`[FileOps] Writing to: ${outputPath}`);
    await fs.writeFile(outputPath, content, 'utf-8');

    const stats = await fs.stat(outputPath);

    return {
        filePath: outputPath,
        metadata: {
            size: stats.size,
            format: config.format
        }
    } as unknown as JsonObject;
}

async function parsePDF(
    config: FileOperationsNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    let buffer: Buffer;

    if (config.fileSource === 'url') {
        // Download PDF from URL
        const url = interpolateVariables(config.filePath || '', context);
        console.log(`[FileOps] Downloading PDF from: ${url}`);

        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                'User-Agent': 'FlowMaestro/1.0'
            }
        });

        buffer = Buffer.from(response.data);
    } else if (config.fileSource === 'path') {
        // Read from local path
        const filePath = interpolateVariables(config.filePath || '', context);
        console.log(`[FileOps] Reading PDF from: ${filePath}`);
        buffer = await fs.readFile(filePath);
    } else if (config.fileData) {
        // Decode from base64
        console.log(`[FileOps] Decoding PDF from base64 data`);
        buffer = Buffer.from(config.fileData, 'base64');
    } else {
        throw new Error('PDF source not specified (url, path, or fileData required)');
    }

    console.log(`[FileOps] Parsing PDF (${buffer.length} bytes)...`);

    // Parse PDF
    const data = await pdf(buffer);

    console.log(`[FileOps] Extracted ${data.numpages} pages, ${data.text.length} characters`);

    return {
        content: data.text,
        metadata: {
            size: buffer.length,
            pages: data.numpages,
            format: 'pdf'
        }
    } as unknown as JsonObject;
}

async function parseCSV(
    config: FileOperationsNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    // First read the file
    const fileResult = await readFile(config, context);
    const content = fileResult.content;

    if (typeof content !== 'string') {
        throw new Error('CSV content must be a string');
    }

    const csvText = content || '';

    // Simple CSV parsing (for production, use a library like papaparse)
    const lines = csvText.split('\n').filter((line: string) => line.trim());
    if (lines.length === 0) {
        return { content: JSON.stringify([]) } as unknown as JsonObject;
    }

    const headers = lines[0].split(',').map((h: string) => h.trim());
    const rows = lines.slice(1).map((line: string) => {
        const values = line.split(',').map((v: string) => v.trim());
        const obj: Record<string, string> = {};
        headers.forEach((header: string, i: number) => {
            obj[header] = values[i] || '';
        });
        return obj;
    });

    return {
        content: JSON.stringify(rows, null, 2),
        metadata: {
            size: csvText.length,
            format: 'csv'
        }
    } as unknown as JsonObject;
}

async function parseJSONFile(
    config: FileOperationsNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const fileResult = await readFile(config, context);
    const content = fileResult.content;

    if (typeof content !== 'string') {
        throw new Error('JSON content must be a string');
    }

    const jsonText = content || '';

    try {
        const parsed = JSON.parse(jsonText);
        return {
            content: JSON.stringify(parsed, null, 2),
            metadata: {
                size: jsonText.length,
                format: 'json'
            }
        } as unknown as JsonObject;
    } catch (error) {
        throw new Error(`Invalid JSON in file: ${error}`);
    }
}

/**
 * Interpolate ${variableName} references in strings with actual values from context
 */
