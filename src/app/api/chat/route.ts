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

export const maxDuration = 60;

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
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: tools && Object.keys(tools).length > 0 ? tools : undefined,
          experimental_telemetry: {
            isEnabled: true,
            functionId: 'stream-text',
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
        console.log('[API] Stream finished with messages:', messages);
      },
      onError: (error) => {
        console.error('[API] Stream error:', error);
        return 'Oops, an error occurred!';
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
