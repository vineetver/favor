import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  streamText,
  stepCountIs,
} from 'ai';
import { systemPrompt } from '@/lib/ai/prompts';
import { myProvider, getModelConfig, tools } from '@/lib/ai';
import { models } from '@/lib/ai/models';
import { ChatSDKError } from '@/lib/chatbot/errors';
import type { ChatMessage } from '@/lib/chatbot/types';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { generateUUID } from '@/lib/chatbot/utils';

export const maxDuration = 600;

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      message,
      selectedChatModel,
    } = requestBody;

    const model = models.find((model) => model.id === selectedChatModel);
    if (!model) {
      return new Response('Model not found', { status: 404 });
    }

    if ((model.id.startsWith('gpt-') || model.id.startsWith('o1-')) && !process.env.OPENAI_API_KEY) {
      return new Response('OpenAI API key not configured', { status: 500 });
    }

    if (model.id.startsWith('deepseek-') && !process.env.DEEPSEEK_API_KEY) {
      return new Response('DeepSeek API key not configured', { status: 500 });
    }

    // Convert the single message into proper format for the AI model
    console.log('[API] Processing message:', message);
    const uiMessages: ChatMessage[] = [message];

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const modelConfig = getModelConfig(selectedChatModel);
        
        const result = streamText({
          model: myProvider.languageModel(model.apiIdentifier),
          system: systemPrompt(model),
          stopWhen: stepCountIs(10),
          messages: convertToModelMessages(uiMessages),
          experimental_transform: smoothStream({ 
            chunking: 'line',
            delayInMs: 30
          }),
          tools: tools && Object.keys(tools).length > 0 ? tools : undefined,
          experimental_telemetry: {
            isEnabled: true,
            functionId: 'stream-text',
            metadata: {
              model: model.id,
              toolsCount: tools ? Object.keys(tools).length : 0,
            },
          },
          ...modelConfig,
        });

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        console.log('[API] Stream finished:', { 
          messagesCount: messages.length, 
          lastMessageId: messages[messages.length - 1]?.id?.slice(0, 8)
        });
      },
      onError: (error) => {
        console.error('[API] Stream error:', error);
        if (error instanceof Error) {
          return `Analysis failed: ${error.message}`;
        }
        return 'Analysis failed due to an unexpected error. Please try again.';
      },
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new Response('Internal server error', { status: 500 });
  }
}
