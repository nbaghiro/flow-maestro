import { executeHTTPNode, HTTPNodeConfig, HTTPNodeResult } from './http-executor';
import { executeLLMNode, LLMNodeConfig, LLMNodeResult } from './llm-executor';
import { executeTransformNode, TransformNodeConfig, TransformNodeResult } from './transform-executor';
import { executeFileOperationsNode, FileOperationsNodeConfig, FileOperationsNodeResult } from './file-executor';
import { executeVariableNode, VariableNodeConfig, VariableNodeResult } from './variable-executor';
import { executeOutputNode, OutputNodeConfig } from './output-executor';
import { executeConditionalNode, ConditionalNodeConfig, ConditionalNodeResult } from './conditional-executor';
import { executeSwitchNode, SwitchNodeConfig, SwitchNodeResult } from './switch-executor';
import { executeLoopNode, LoopNodeConfig, LoopNodeResult } from './loop-executor';
import { executeEchoNode, EchoNodeConfig, EchoNodeResult } from './echo-executor';
import { executeWaitNode, WaitNodeConfig, WaitNodeResult } from './wait-executor';
import { executeCodeNode, CodeNodeConfig, CodeNodeResult } from './code-executor';
import { executeVisionNode, VisionNodeConfig, VisionNodeResult } from './vision-executor';
import { executeAudioNode, AudioNodeConfig, AudioNodeResult } from './audio-executor';
import { executeEmbeddingsNode, EmbeddingsNodeConfig, EmbeddingsNodeResult } from './embeddings-executor';
import { executeDatabaseNode, DatabaseNodeConfig, DatabaseNodeResult } from './database-executor';
import { executeIntegrationNode, IntegrationNodeConfig, IntegrationNodeResult } from './integration-executor';

export type NodeConfig =
    | { type: 'http'; config: HTTPNodeConfig }
    | { type: 'llm'; config: LLMNodeConfig }
    | { type: 'transform'; config: TransformNodeConfig }
    | { type: 'fileOperations'; config: FileOperationsNodeConfig }
    | { type: 'variable'; config: VariableNodeConfig }
    | { type: 'output'; config: OutputNodeConfig }
    | { type: 'input'; config: any } // Input is handled differently
    | { type: string; config: any }; // Other node types not yet implemented

export type NodeResult =
    | HTTPNodeResult
    | LLMNodeResult
    | TransformNodeResult
    | FileOperationsNodeResult
    | VariableNodeResult
    | { outputs: Record<string, any> };

export interface ExecuteNodeInput {
    nodeType: string;
    nodeConfig: any;
    context: Record<string, any>;
    globalStore?: Map<string, any>;
}

/**
 * Main node executor - routes to appropriate node type executor
 */
export async function executeNode(input: ExecuteNodeInput): Promise<NodeResult> {
    const { nodeType, nodeConfig, context, globalStore } = input;

    console.log(`[NodeExecutor] Executing ${nodeType} node`);

    switch (nodeType) {
        case 'http':
            return await executeHTTPNode(nodeConfig as HTTPNodeConfig, context);

        case 'llm':
            return await executeLLMNode(nodeConfig as LLMNodeConfig, context);

        case 'transform':
            return await executeTransformNode(nodeConfig as TransformNodeConfig, context);

        case 'fileOperations':
            return await executeFileOperationsNode(nodeConfig as FileOperationsNodeConfig, context);

        case 'variable':
            return await executeVariableNode(nodeConfig as VariableNodeConfig, context, globalStore);

        case 'output':
            return await executeOutputNode(nodeConfig as OutputNodeConfig, context);

        case 'input':
            // Input nodes are handled at workflow start
            console.log('[NodeExecutor] Input node - returning stored input value');
            return { [nodeConfig.inputName]: context[nodeConfig.inputName] };

        case 'conditional':
        case 'switch':
        case 'loop':
            // Control flow nodes are handled by the workflow orchestrator
            throw new Error(`${nodeType} nodes must be handled by workflow orchestrator`);

        case 'echo':
            return await executeEchoNode(nodeConfig as EchoNodeConfig, context);

        case 'wait':
            return await executeWaitNode(nodeConfig as WaitNodeConfig, context);

        case 'code':
            return await executeCodeNode(nodeConfig as CodeNodeConfig, context);

        case 'vision':
            return await executeVisionNode(nodeConfig as VisionNodeConfig, context);

        case 'audio':
            return await executeAudioNode(nodeConfig as AudioNodeConfig, context);

        case 'embeddings':
            return await executeEmbeddingsNode(nodeConfig as EmbeddingsNodeConfig, context);

        case 'database':
            return await executeDatabaseNode(nodeConfig as DatabaseNodeConfig, context);

        case 'integration':
            return await executeIntegrationNode(nodeConfig as IntegrationNodeConfig, context);

        default:
            throw new Error(`Node type '${nodeType}' not yet implemented`);
    }
}

// Export all executors
export {
    executeHTTPNode,
    executeLLMNode,
    executeTransformNode,
    executeFileOperationsNode,
    executeVariableNode,
    executeOutputNode,
    executeConditionalNode,
    executeSwitchNode,
    executeLoopNode,
    executeEchoNode,
    executeWaitNode,
    executeCodeNode,
    executeVisionNode,
    executeAudioNode,
    executeEmbeddingsNode,
    executeDatabaseNode,
    executeIntegrationNode
};

// Export types
export type {
    HTTPNodeConfig,
    HTTPNodeResult,
    LLMNodeConfig,
    LLMNodeResult,
    TransformNodeConfig,
    TransformNodeResult,
    FileOperationsNodeConfig,
    FileOperationsNodeResult,
    VariableNodeConfig,
    VariableNodeResult,
    OutputNodeConfig,
    ConditionalNodeConfig,
    ConditionalNodeResult,
    SwitchNodeConfig,
    SwitchNodeResult,
    LoopNodeConfig,
    LoopNodeResult,
    EchoNodeConfig,
    EchoNodeResult,
    WaitNodeConfig,
    WaitNodeResult,
    CodeNodeConfig,
    CodeNodeResult,
    VisionNodeConfig,
    VisionNodeResult,
    AudioNodeConfig,
    AudioNodeResult,
    EmbeddingsNodeConfig,
    EmbeddingsNodeResult,
    DatabaseNodeConfig,
    DatabaseNodeResult,
    IntegrationNodeConfig,
    IntegrationNodeResult
};
