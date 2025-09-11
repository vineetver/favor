export const DEFAULT_MODEL_NAME: string = 'gpt-5-nano';

export interface ChatModel {
  id: string;
  label: string;
  apiIdentifier: string;
  description: string;
  disabled?: boolean;
  reasoning?: boolean;
  context?: number;
}

export const models: Array<ChatModel> = [
  {
    id: "gpt-5-nano",
    label: "GPT-5 Nano",
    apiIdentifier: "gpt-5-nano",
    description: "Ultra-fast GPT-5 model for quick responses",
    context: 200000,
  },
  {
    id: "gpt-3.5-turbo",
    label: "GPT-3.5 Turbo",
    apiIdentifier: "gpt-3.5-turbo",
    description: "Fast and affordable for simple tasks",
    context: 16385,
  },
  {
    id: "deepseek-chat",
    label: "DeepSeek R1",
    apiIdentifier: "deepseek-chat",
    description: "Advanced reasoning & multilingual model",
    reasoning: true,
    context: 128000,
  },
] as const;

// Legacy interface for backwards compatibility
export interface Models extends ChatModel {}

// Helper functions
export function getModelById(id: string): ChatModel | undefined {
  return models.find(model => model.id === id);
}

export function getDefaultModel(): ChatModel {
  return getModelById(DEFAULT_MODEL_NAME) || models[0];
}

export function getReasoningModels(): ChatModel[] {
  return models.filter(model => model.reasoning);
}

export function getStandardModels(): ChatModel[] {
  return models.filter(model => !model.reasoning);
}

export function isReasoningModel(modelId: string): boolean {
  const model = getModelById(modelId);
  return model?.reasoning || false;
}