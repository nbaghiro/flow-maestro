import * as fs from "fs/promises";
import * as path from "path";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import * as cheerio from "cheerio";
import axios from "axios";
import { DocumentFileType } from "../../storage/models/KnowledgeDocument";

export interface ExtractedText {
    content: string;
    metadata: {
        pages?: number;
        wordCount?: number;
        language?: string;
        [key: string]: any;
    };
}

export class TextExtractor {
    /**
     * Extract text from a file based on its type
     */
    async extractFromFile(filePath: string, fileType: DocumentFileType): Promise<ExtractedText> {
        switch (fileType) {
            case "pdf":
                return this.extractFromPDF(filePath);
            case "docx":
            case "doc":
                return this.extractFromDocx(filePath);
            case "txt":
            case "md":
                return this.extractFromText(filePath);
            case "html":
                const htmlContent = await fs.readFile(filePath, "utf-8");
                return this.extractFromHTML(htmlContent);
            case "json":
                return this.extractFromJSON(filePath);
            case "csv":
                return this.extractFromCSV(filePath);
            default:
                throw new Error(`Unsupported file type: ${fileType}`);
        }
    }

    /**
     * Extract text from a URL (fetches and processes HTML)
     */
    async extractFromURL(url: string): Promise<ExtractedText> {
        try {
            const response = await axios.get(url, {
                timeout: 30000, // 30 seconds
                headers: {
                    "User-Agent": "Mozilla/5.0 (FlowMaestro Knowledge Base Bot)"
                },
                maxRedirects: 5
            });

            const contentType = response.headers["content-type"] || "";

            if (contentType.includes("text/html")) {
                return this.extractFromHTML(response.data, url);
            } else if (contentType.includes("text/plain")) {
                return {
                    content: response.data,
                    metadata: {
                        wordCount: this.countWords(response.data),
                        source: url
                    }
                };
            } else if (contentType.includes("application/pdf")) {
                // For PDFs from URLs, we'd need to save temporarily
                throw new Error("PDF URLs are not yet supported. Please download and upload the file.");
            } else {
                throw new Error(`Unsupported content type: ${contentType}`);
            }
        } catch (error: any) {
            throw new Error(`Failed to fetch URL: ${error.message}`);
        }
    }

    /**
     * Extract text from PDF files
     */
    private async extractFromPDF(filePath: string): Promise<ExtractedText> {
        try {
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdf(dataBuffer);

            return {
                content: data.text,
                metadata: {
                    pages: data.numpages,
                    wordCount: this.countWords(data.text),
                    info: data.info
                }
            };
        } catch (error: any) {
            throw new Error(`Failed to extract text from PDF: ${error.message}`);
        }
    }

    /**
     * Extract text from DOCX files
     */
    private async extractFromDocx(filePath: string): Promise<ExtractedText> {
        try {
            const buffer = await fs.readFile(filePath);
            const result = await mammoth.extractRawText({ buffer });

            return {
                content: result.value,
                metadata: {
                    wordCount: this.countWords(result.value),
                    messages: result.messages // Any warnings during extraction
                }
            };
        } catch (error: any) {
            throw new Error(`Failed to extract text from DOCX: ${error.message}`);
        }
    }

    /**
     * Extract text from plain text or markdown files
     */
    private async extractFromText(filePath: string): Promise<ExtractedText> {
        try {
            const content = await fs.readFile(filePath, "utf-8");

            return {
                content,
                metadata: {
                    wordCount: this.countWords(content)
                }
            };
        } catch (error: any) {
            throw new Error(`Failed to read text file: ${error.message}`);
        }
    }

    /**
     * Extract text from HTML content
     */
    private extractFromHTML(html: string, sourceUrl?: string): ExtractedText {
        try {
            const $ = cheerio.load(html);

            // Remove script and style elements
            $("script, style, noscript").remove();

            // Extract title
            const title = $("title").text().trim();

            // Extract meta description
            const description = $('meta[name="description"]').attr("content") || "";

            // Extract main content
            // Prefer main content areas over headers/footers
            const contentSelectors = [
                "main",
                "article",
                '[role="main"]',
                ".content",
                ".main-content",
                "#content"
            ];

            let content = "";
            for (const selector of contentSelectors) {
                const element = $(selector);
                if (element.length > 0) {
                    content = element.text();
                    break;
                }
            }

            // Fallback to body if no main content found
            if (!content) {
                content = $("body").text();
            }

            // Clean up whitespace
            content = content
                .replace(/\s+/g, " ") // Replace multiple spaces with single space
                .replace(/\n+/g, "\n") // Replace multiple newlines with single newline
                .trim();

            // Combine title, description, and content
            const fullText = [title, description, content]
                .filter(Boolean)
                .join("\n\n");

            return {
                content: fullText,
                metadata: {
                    title,
                    description,
                    wordCount: this.countWords(fullText),
                    source: sourceUrl
                }
            };
        } catch (error: any) {
            throw new Error(`Failed to extract text from HTML: ${error.message}`);
        }
    }

    /**
     * Extract text from JSON files
     */
    private async extractFromJSON(filePath: string): Promise<ExtractedText> {
        try {
            const content = await fs.readFile(filePath, "utf-8");
            const data = JSON.parse(content);

            // Extract all text values from the JSON recursively
            const textParts = this.extractTextFromObject(data);
            const fullText = textParts.join("\n");

            return {
                content: fullText,
                metadata: {
                    wordCount: this.countWords(fullText),
                    structure: "json"
                }
            };
        } catch (error: any) {
            throw new Error(`Failed to extract text from JSON: ${error.message}`);
        }
    }

    /**
     * Extract text from CSV files
     */
    private async extractFromCSV(filePath: string): Promise<ExtractedText> {
        try {
            const content = await fs.readFile(filePath, "utf-8");

            // Simple CSV parsing (for production, consider using a library like csv-parser)
            const lines = content.split("\n");
            const rows: string[][] = [];

            for (const line of lines) {
                if (line.trim()) {
                    // Basic CSV splitting (doesn't handle quoted commas)
                    const cells = line.split(",").map((cell) => cell.trim());
                    rows.push(cells);
                }
            }

            // Convert to text format
            const textParts: string[] = [];

            if (rows.length > 0) {
                // First row as headers
                const headers = rows[0];
                textParts.push(`Headers: ${headers.join(", ")}`);

                // Remaining rows as data
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    const rowText = headers
                        .map((header, index) => `${header}: ${row[index] || ""}`)
                        .join(", ");
                    textParts.push(rowText);
                }
            }

            const fullText = textParts.join("\n");

            return {
                content: fullText,
                metadata: {
                    rowCount: rows.length - 1, // Excluding header
                    columnCount: rows[0]?.length || 0,
                    wordCount: this.countWords(fullText)
                }
            };
        } catch (error: any) {
            throw new Error(`Failed to extract text from CSV: ${error.message}`);
        }
    }

    /**
     * Recursively extract text from JSON objects
     */
    private extractTextFromObject(obj: any, depth: number = 0): string[] {
        const textParts: string[] = [];
        const maxDepth = 10; // Prevent infinite recursion

        if (depth > maxDepth) {
            return textParts;
        }

        if (typeof obj === "string") {
            textParts.push(obj);
        } else if (Array.isArray(obj)) {
            for (const item of obj) {
                textParts.push(...this.extractTextFromObject(item, depth + 1));
            }
        } else if (typeof obj === "object" && obj !== null) {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    // Include the key as context
                    textParts.push(`${key}:`);
                    textParts.push(...this.extractTextFromObject(obj[key], depth + 1));
                }
            }
        } else if (typeof obj === "number" || typeof obj === "boolean") {
            textParts.push(String(obj));
        }

        return textParts;
    }

    /**
     * Count words in text
     */
    private countWords(text: string): number {
        return text.trim().split(/\s+/).length;
    }
}
