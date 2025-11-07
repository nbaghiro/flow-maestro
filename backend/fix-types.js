#!/usr/bin/env node
/**
 * Batch TypeScript fix script
 * Fixes common patterns across repository and API route files
 */

const fs = require("fs");
const path = require("path");

// List of files to fix with their specific patterns
const fixes = [
    // Agent Repository
    {
        file: "src/storage/repositories/AgentRepository.ts",
        addImports: 'import type { JsonObject } from "@flowmaestro/shared";',
        addRowInterface: `
// Database row interface
interface AgentRow {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    model: string;
    provider: string;
    connection_id: string | null;
    system_prompt: string;
    temperature: number | string;
    max_tokens: number | string;
    max_iterations: number | string;
    available_tools: JsonObject[] | string;
    memory_config: JsonObject | string;
    metadata: JsonObject | string;
    created_at: string | Date;
    updated_at: string | Date;
    deleted_at: string | Date | null;
}
`,
        replacements: [
            { from: "await db.query<AgentModel>(query, values)", to: "await db.query(query, values)" },
            { from: "await db.query<AgentModel>(query, [id])", to: "await db.query(query, [id])" },
            { from: "await db.query<AgentModel>(query, [id, userId])", to: "await db.query(query, [id, userId])" },
            { from: "await db.query<AgentModel>(query, [userId, limit, offset])", to: "await db.query(query, [userId, limit, offset])" },
            { from: ".map((row) => this.mapRow(row))", to: ".map((row) => this.mapRow(row as AgentRow))" },
            { from: "this.mapRow(result.rows[0])", to: "this.mapRow(result.rows[0] as AgentRow)" },
            { from: "private mapRow(row: unknown): AgentModel {", to: "private mapRow(row: AgentRow): AgentModel {" }
        ]
    },
    // Agent Execution Repository
    {
        file: "src/storage/repositories/AgentExecutionRepository.ts",
        addImports: 'import type { JsonValue, JsonObject } from "@flowmaestro/shared";',
        addRowInterface: `
// Database row interfaces
interface AgentExecutionRow {
    id: string;
    agent_id: string;
    execution_id: string;
    status: string;
    inputs: JsonObject | string | null;
    outputs: JsonObject | string | null;
    conversation_history: JsonObject[] | string | null;
    error: string | null;
    started_at: string | Date | null;
    completed_at: string | Date | null;
    created_at: string | Date;
    updated_at: string | Date;
}

interface MessageRow {
    id: string;
    agent_execution_id: string;
    role: string;
    content: string;
    metadata: JsonObject | string | null;
    created_at: string | Date;
}
`,
        replacements: [
            { from: "await db.query<AgentExecution>(query, values)", to: "await db.query(query, values)" },
            { from: "await db.query<AgentExecution>(query, [id])", to: "await db.query(query, [id])" },
            { from: "await db.query<Message>(query, values)", to: "await db.query(query, values)" },
            { from: ".map((row) => this.mapExecutionRow(row))", to: ".map((row) => this.mapExecutionRow(row as AgentExecutionRow))" },
            { from: ".map((row) => this.mapMessageRow(row))", to: ".map((row) => this.mapMessageRow(row as MessageRow))" },
            { from: "this.mapExecutionRow(result.rows[0])", to: "this.mapExecutionRow(result.rows[0] as AgentExecutionRow)" },
            { from: "this.mapMessageRow(result.rows[0])", to: "this.mapMessageRow(result.rows[0] as MessageRow)" },
            { from: "private mapExecutionRow(row: unknown): AgentExecution {", to: "private mapExecutionRow(row: AgentExecutionRow): AgentExecution {" },
            { from: "private mapMessageRow(row: unknown): Message {", to: "private mapMessageRow(row: MessageRow): Message {" }
        ]
    }
];

// Apply fixes
fixes.forEach(({ file, addImports, addRowInterface, replacements }) => {
    const filePath = path.join(__dirname, file);

    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${file} - not found`);
        return;
    }

    let content = fs.readFileSync(filePath, "utf8");

    // Add imports after first import block
    if (addImports && !content.includes(addImports)) {
        const firstImportEnd = content.indexOf("\n\n");
        if (firstImportEnd > 0) {
            content = content.slice(0, firstImportEnd) + "\n" + addImports + content.slice(firstImportEnd);
        }
    }

    // Add row interface after imports, before export class
    if (addRowInterface && !content.includes("Database row interface")) {
        const exportClassIndex = content.indexOf("export class");
        if (exportClassIndex > 0) {
            content = content.slice(0, exportClassIndex) + addRowInterface + "\n" + content.slice(exportClassIndex);
        }
    }

    // Apply replacements
    replacements.forEach(({ from, to }) => {
        content = content.split(from).join(to);
    });

    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Fixed ${file}`);
});

console.log("Type fixes applied!");
