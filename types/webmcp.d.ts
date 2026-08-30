declare global {
  type WebMcpSchema = Record<string, unknown>;
  type WebMcpTool = {
    name: string;
    title?: string;
    description: string;
    inputSchema?: WebMcpSchema;
    annotations?: { readOnlyHint: boolean; untrustedContentHint: boolean };
    execute: (input: Record<string, unknown>, options?: { signal?: AbortSignal }) => unknown;
  };
  type WebMcpRegisteredTool = WebMcpTool & { origin?: string; window?: Window };
  type ModelContext = {
    registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal; exposedTo?: string[] }) => Promise<void>;
    getTools?: (options?: { fromOrigins?: string[] }) => Promise<WebMcpRegisteredTool[]>;
    executeTool?: (tool: WebMcpRegisteredTool, input?: Record<string, unknown>, options?: { signal?: AbortSignal }) => Promise<string | null>;
  };
  interface Document { modelContext?: ModelContext }
  interface Navigator { modelContext?: ModelContext }
}

export {};
