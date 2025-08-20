import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  streamText,
} from 'ai';
import { systemPrompt } from '@/lib/ai/prompts';
import { myProvider } from '@/lib/ai';
import { tools } from '@/lib/ai/tools';
import { models } from '@/lib/ai/models';
import { ChatSDKError } from '@/lib/chatbot/errors';
import type { ChatMessage } from '@/lib/chatbot/types';
import { postRequestBodySchema, type PostRequestBody } from '@/lib/chatbot/types';
import { generateUUID } from '@/lib/chatbot/utils';

export const maxDuration = 60;

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      message,
      selectedChatModel,
    } = requestBody;

    // Find the model
    const model = models.find((model) => model.id === selectedChatModel);
    if (!model) {
      return new Response('Model not found', { status: 404 });
    }

    // For now, we'll use a simple messages array since we don't have database setup
    const uiMessages: ChatMessage[] = [message];

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: myProvider.languageModel(model.apiIdentifier),
          system: systemPrompt,
          messages: convertToModelMessages(uiMessages),
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            ...tools,
          },
          experimental_telemetry: {
            isEnabled: true,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        // TODO: Save messages to database when implemented
        console.log('Messages to save:', messages);
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
