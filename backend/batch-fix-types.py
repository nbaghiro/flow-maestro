#!/usr/bin/env python3
"""
Batch TypeScript error fixer
Systematically fixes type errors across backend codebase
"""

import os
import re
from pathlib import Path

BACKEND_DIR = Path(__file__).parent

# Common patterns to fix in API routes
def fix_api_route_file(filepath):
    """Fix common patterns in API route files"""
    with open(filepath, 'r') as f:
        content = f.read()

    original = content

    # Pattern 1: request.params accessing unknown type
    # From: request.params.id
    # To: (request.params as { id: string }).id
    content = re.sub(
        r'request\.params\.(\w+)',
        r'(request.params as { \1: string }).\1',
        content
    )

    # Pattern 2: request.query accessing unknown type
    # Need to handle multiple properties
    if 'request.query' in content:
        # Add interface at top if not exists
        if 'interface QueryParams' not in content:
            # Find first function and add interface before it
            match = re.search(r'(export async function)', content)
            if match:
                interface_def = '\ninterface QueryParams {\n    [key: string]: string | undefined;\n}\n\n'
                content = content[:match.start()] + interface_def + content[match.start():]

        # Replace request.query references
        content = re.sub(
            r'request\.query\.(\w+)',
            r'(request.query as QueryParams).\1',
            content
        )

    # Pattern 3: request.body accessing unknown type
    content = re.sub(
        r'request\.body\.(\w+)',
        r'(request.body as Record<string, unknown>).\1',
        content
    )

    # Pattern 4: error is of type unknown in catch blocks
    content = re.sub(
        r'catch \(error\) \{[\s\S]*?error\.message',
        lambda m: m.group(0).replace('error.message', '(error as Error).message'),
        content
    )

    # Only write if changed
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

# Fix all API route files
routes_dir = BACKEND_DIR / 'src' / 'api' / 'routes'
fixed_count = 0

for root, dirs, files in os.walk(routes_dir):
    for file in files:
        if file.endswith('.ts') and not file.endswith('.test.ts'):
            filepath = Path(root) / file
            if fix_api_route_file(filepath):
                fixed_count += 1
                print(f"Fixed: {filepath.relative_to(BACKEND_DIR)}")

print(f"\nTotal files fixed: {fixed_count}")
