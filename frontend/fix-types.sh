#!/bin/bash

# Script to fix TypeScript type assertions in node config files

# List of files to fix
FILES=(
    "src/canvas/panels/configs/IntegrationNodeConfig.tsx"
    "src/canvas/panels/configs/KnowledgeBaseQueryNodeConfig.tsx"
    "src/canvas/panels/configs/LLMNodeConfig.tsx"
    "src/canvas/panels/configs/LoopNodeConfig.tsx"
    "src/canvas/panels/configs/OutputNodeConfig.tsx"
    "src/canvas/panels/configs/SwitchNodeConfig.tsx"
    "src/canvas/panels/configs/TransformNodeConfig.tsx"
    "src/canvas/panels/configs/VariableNodeConfig.tsx"
    "src/canvas/panels/configs/VisionNodeConfig.tsx"
    "src/canvas/panels/configs/VoiceGreetNodeConfig.tsx"
    "src/canvas/panels/configs/VoiceHangupNodeConfig.tsx"
    "src/canvas/panels/configs/VoiceListenNodeConfig.tsx"
    "src/canvas/panels/configs/VoiceMenuNodeConfig.tsx"
    "src/canvas/panels/configs/WaitNodeConfig.tsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Fixing $file..."

        # Fix data.property accesses in useState calls - add type assertions
        # Pattern: data.property || -> (data.property as string) ||
        # We'll use perl for more sophisticated regex replacements

        # Fix nodeName in OutputSettingsSection
        perl -i -pe 's/nodeName=\{data\.label \|\|/nodeName={(data.label as string) ||/g' "$file"

        # This is a simplified approach - we'd need to analyze each file for specific patterns
        # Let's use sed for basic patterns

        echo "Done with $file"
    else
        echo "File not found: $file"
    fi
done

echo "All files processed!"
