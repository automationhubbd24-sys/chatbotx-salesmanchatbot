#!/bin/sh

# --enable-source-maps resolves production stack traces back to original TypeScript source.
NODE_OPTIONS="--no-node-snapshot --enable-source-maps" SALESMANCHATBOT_MCP_HOST=${SALESMANCHATBOT_MCP_HOST:-0.0.0.0} SALESMANCHATBOT_MCP_PORT=${SALESMANCHATBOT_MCP_PORT:-3333} node apps/mcp-server/dist/index.mjs;
