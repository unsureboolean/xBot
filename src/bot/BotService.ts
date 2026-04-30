import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import dotenv from "dotenv";
import google from "googlethis";

dotenv.config();

let bot: TelegramBot | null = null;

// State definitions
type ModelProvider = "openai" | "xai";

interface ChatState {
  provider: ModelProvider;
  persona?: string;
  messages: Array<{
    role: "system" | "user" | "assistant" | "developer";
    content: any;
  }>;
}

const chatStates = new Map<number, ChatState>();

// Models
const OPENAI_MODEL = "gpt-4o"; // Vision and Text
const OPENAI_REASONING_MODEL = "gpt-5.4"; // Reasoning
const XAI_MODEL = "grok-4.20-0309"; // Use the latest non-reasoning model

export function getBotStatus() {
  return {
    isRunning: !!bot && bot.isPolling(),
    telegramTokenSet: !!process.env.TELEGRAM_BOT_TOKEN,
    openaiKeySet: !!process.env.OPENAI_API_KEY,
    xaiKeySet: !!process.env.XAI_API_KEY,
  };
}

function getChatState(chatId: number): ChatState {
  if (!chatStates.has(chatId)) {
    chatStates.set(chatId, {
      provider: "xai", // Default
      messages: [
        {
          role: "developer",
          content:
            "You are a helpful AI assistant. Use reasoning to answer accurately.",
        },
      ],
    });
  }
  return chatStates.get(chatId)!;
}

async function sendTelegramMessage(chatId: number, text: string) {
  if (!bot) return null;
  try {
    const formatted = text
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
      .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<i>$1</i>")
      .replace(/`(.*?)`/g, "<code>$1</code>");
    return await bot.sendMessage(chatId, formatted, { parse_mode: "HTML" });
  } catch (e) {
    // Fallback to raw text without HTML formatting if it fails
    return await bot.sendMessage(chatId, text);
  }
}

async function editTelegramMessage(
  chatId: number,
  messageId: number,
  text: string,
) {
  if (!bot) return null;
  try {
    const formatted = text
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
      .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<i>$1</i>")
      .replace(/`(.*?)`/g, "<code>$1</code>");
    return await bot.editMessageText(formatted, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
    });
  } catch (e) {
    try {
      return await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
      });
    } catch (err) {
      return null;
    }
  }
}

export function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error(
      "TELEGRAM_BOT_TOKEN is not set in environment variables. Bot will not start.",
    );
    return;
  }

  // Uses polling
  if (!bot) {
    bot = new TelegramBot(token, { polling: true });
    console.log("Telegram Bot is starting...");
    
    // Prevent unhandled promise rejections or polling errors from crashing the Node.js server
    bot.on('polling_error', (error) => {
      console.error("Telegram Polling Error:", error);
    });
    bot.on('error', (error) => {
      console.error("Telegram General Error:", error);
    });
  }

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text || msg.caption || "";
    const photo = msg.photo;

    // Ignore empty messages that have neither text nor photo
    if (!text && !photo) return;

    if (text.startsWith("/start")) {
      await bot?.sendMessage(
        chatId,
        `Hello! I am your AI assistant.\nAvailable commands:\n/openai - Switch to OpenAI (GPT-4o)\n/grok - Switch to xAI (Grok-4)\n/image <prompt> - Generate an image (Uses current provider)\n/reason <prompt> - Reason about a prompt using GPT-5.4\n/frank - Enable the Frank Reynolds persona\n/waifu - Enable the Anime Waifu persona\n/clear - Clear chat history`,
      );
      return;
    }

    if (text.startsWith("/clear")) {
      chatStates.delete(chatId);
      await bot?.sendMessage(chatId, "Chat history cleared.");
      return;
    }

    if (text.startsWith("/openai")) {
      const state = getChatState(chatId);
      state.provider = "openai";
      state.persona = undefined;
      if (
        state.messages.length > 0 &&
        ["system", "developer"].includes(state.messages[0].role)
      ) {
        state.messages[0].content =
          "You are a helpful AI assistant. Use reasoning to answer accurately.";
      }
      await bot?.sendMessage(
        chatId,
        "Switched to OpenAI (GPT-4o). Persona reset.",
      );
      return;
    }

    if (text.startsWith("/grok")) {
      const state = getChatState(chatId);
      state.provider = "xai";
      state.persona = undefined;
      if (
        state.messages.length > 0 &&
        ["system", "developer"].includes(state.messages[0].role)
      ) {
        state.messages[0].content =
          "You are a helpful AI assistant. Use reasoning to answer accurately.";
      }
      await bot?.sendMessage(
        chatId,
        "Switched to xAI (Grok-4). Persona reset.",
      );
      return;
    }

    if (text.startsWith("/frank")) {
      const state = getChatState(chatId);
      state.persona = "frank";
      if (
        state.messages.length > 0 &&
        ["system", "developer"].includes(state.messages[0].role)
      ) {
        state.messages[0].content =
          "You are Frank Reynolds from It's Always Sunny in Philadelphia. You are degenerate, selfish, chaotic, wealthy, and frequently reference your bizarre business schemes, guns, the gang, rum ham, and living in squalor. Do not break character.";
      }
      await bot?.sendMessage(
        chatId,
        "So anyway, I started blasting... (Frank Reynolds persona activated! It will reset next time you change models).",
      );
      return;
    }

    if (text.startsWith("/waifu")) {
      const state = getChatState(chatId);
      state.persona = "waifu";
      if (
        state.messages.length > 0 &&
        ["system", "developer"].includes(state.messages[0].role)
      ) {
        state.messages[0].content =
          "You are a helpful, cheerful, and affectionate anime waifu character. You use terms like 'senpai' or light emoticons, but remain focused on being genuinely helpful and clear... mostly. Avoid being extremely exaggerated or annoying. Do not break character, but prioritize providing good answers.";
      }
      await bot?.sendMessage(
        chatId,
        "UwU~ Senpai noticed me! (Anime Waifu persona activated! It will reset next time you change models).",
      );
      return;
    }

    if (text.startsWith("/image")) {
      const prompt = text.replace("/image", "").trim();
      if (!prompt) {
        await bot?.sendMessage(
          chatId,
          "Please provide a prompt. Example: /image a cute cat",
        );
        return;
      }

      const state = getChatState(chatId);

      if (state.provider === "xai") {
        const xaiKey = process.env.XAI_API_KEY;
        if (!xaiKey) {
          await bot?.sendMessage(
            chatId,
            "xAI API key is missing. Add XAI_API_KEY to your environment variables.",
          );
          return;
        }

        await bot?.sendMessage(chatId, "Generating image with Grok...");
        try {
          const xai = new OpenAI({
            apiKey: xaiKey,
            baseURL: "https://api.x.ai/v1",
          });
          const response = await xai.images.generate({
            model: "grok-imagine-image-pro",
            prompt: prompt,
            n: 1,
          });
          const imageUrl = response.data[0].url;
          if (imageUrl) {
            await bot?.sendPhoto(chatId, imageUrl);
          } else {
            await bot?.sendMessage(
              chatId,
              "Failed to generate image with Grok.",
            );
          }
        } catch (err: any) {
          console.error("xAI Image Gen Error:", err);
          let errorMsg = err.message;
          if (
            errorMsg.includes("401") ||
            errorMsg.includes("Incorrect API key")
          ) {
            errorMsg +=
              "\\n\\n(Note: A 401 error means your xAI API key is invalid. Please get a new key from https://console.x.ai and update XAI_API_KEY in the AI Studio settings.)";
          }
          await bot?.sendMessage(chatId, `Error generating image: ${errorMsg}`);
        }
        return;
      }

      if (!process.env.OPENAI_API_KEY) {
        await bot?.sendMessage(
          chatId,
          "OpenAI API key is missing. Image generation requires OpenAI.",
        );
        return;
      }

      await bot?.sendMessage(chatId, "Generating image with DALL-E 3...");
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
        });
        const imageUrl = response.data[0].url;
        if (imageUrl) {
          await bot?.sendPhoto(chatId, imageUrl);
        } else {
          await bot?.sendMessage(chatId, "Failed to generate image.");
        }
      } catch (err: any) {
        console.error("Image Gen Error:", err);
        let errorMsg = err.message;
        if (errorMsg.includes("401")) {
          errorMsg +=
            "\\n\\n(Note: A 401 error means your OpenAI API key is invalid or revoked.)";
        } else if (errorMsg.includes("429")) {
          errorMsg +=
            "\\n\\n(Note: A 429 error means you have hit your OpenAI rate limit or have insufficient credits to generate images. DALL-E 3 costs money per image.)";
        }
        await bot?.sendMessage(chatId, `Error generating image: ${errorMsg}`);
      }
      return;
    }

    // Normal Chat message
    const state = getChatState(chatId);
    let isReasoningOverride = false;
    let actualText = text;

    if (text.startsWith("/reason")) {
      actualText = text.replace("/reason", "").trim();
      isReasoningOverride = true;
      if (!actualText && (!photo || photo.length === 0)) {
        await bot?.sendMessage(
          chatId,
          "Please provide a prompt to reason about. Example: /reason How many Rs in strawberry?",
        );
        return;
      }
    }

    let userContent: any = actualText;

    if (photo && photo.length > 0 && bot) {
      const fileId = photo[photo.length - 1].file_id;
      const fileUrl = await bot.getFileLink(fileId);
      userContent = [
        { type: "text", text: actualText || "What is in this image?" },
        { type: "image_url", image_url: { url: fileUrl } },
      ];
    }

    state.messages.push({ role: "user", content: userContent });

    // Ensure we do not exceed a certain length for history (e.g. 20 messages)
    if (state.messages.length > 21) {
      // Remove oldest user/assistant pair (preserve system prompt)
      state.messages.splice(1, 2);
    }

    const { provider } = state;
    const activeProvider = isReasoningOverride ? "openai" : provider;

    const SEARCH_TOOL = {
      type: "function",
      function: {
        name: "search_internet",
        description:
          "Search the internet for real-time information to answer the user's request. ALWAYS use this if the user asks about current events, sports scores, weather, recent news, or anything not in your training data.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "The search query to look up. Be concise and specific.",
            },
          },
          required: ["query"],
        },
      },
    };

    async function makeApiRequest() {
      bot?.sendChatAction(chatId, "typing");
      let stream: AsyncIterable<any> | null = null;

      if (activeProvider === "openai") {
        if (!process.env.OPENAI_API_KEY) {
          await bot?.sendMessage(chatId, "OpenAI API key is not configured.");
          state.messages.pop();
          return;
        }

        let targetModel = isReasoningOverride
          ? OPENAI_REASONING_MODEL
          : OPENAI_MODEL;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        stream = await openai.chat.completions.create({
          model: targetModel,
          messages: state.messages as any,
          tools: [SEARCH_TOOL as any],
          stream: true,
        });
      } else if (activeProvider === "xai") {
        const xaiKey = process.env.XAI_API_KEY;
        if (!xaiKey) {
          await bot?.sendMessage(
            chatId,
            "xAI API key is missing. Add XAI_API_KEY to your env.",
          );
          state.messages.pop();
          return;
        }

        const xai = new OpenAI({
          apiKey: xaiKey,
          baseURL: "https://api.x.ai/v1",
        });

        const systemAddon = {
          role: "system" as const,
          content:
            "You are Grok, an AI created by xAI, powered by the Grok 4 model. If asked, you are Grok 4.",
        };
        const formattedMessages = [
          systemAddon,
          ...state.messages.map((m) =>
            m.role === "developer"
              ? { role: "system" as const, content: m.content }
              : m,
          ),
        ];

        stream = await xai.chat.completions.create({
          model: XAI_MODEL,
          messages: formattedMessages as any,
          tools: [SEARCH_TOOL as any],
          stream: true,
        });
      }

      if (!stream) return;

      let isToolCall = false;
      let toolCallId = "call_websearch";
      let toolCallName = "";
      let toolCallArgs = "";

      let reply = "";
      let messageId: number | null = null;
      let lastEditTime = Date.now();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.tool_calls) {
          isToolCall = true;
          for (const tc of delta.tool_calls) {
            if (tc.id) toolCallId = tc.id;
            if (tc.function?.name) toolCallName += tc.function.name;
            if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
          }
          continue;
        }

        if (isToolCall) continue;

        const content = delta.content || "";
        if (content) {
          reply += content;
          const now = Date.now();
          if (!messageId && reply.length > 0) {
            const sentMsg = await sendTelegramMessage(chatId, reply + " ✍️");
            if (sentMsg) {
              messageId = sentMsg.message_id;
              lastEditTime = now;
            }
          } else if (messageId && now - lastEditTime > 1500) {
            await editTelegramMessage(chatId, messageId, reply + " ✍️");
            lastEditTime = now;
          }
        }
      }

      if (isToolCall) {
        if (toolCallName === "search_internet") {
          try {
            const args = JSON.parse(toolCallArgs);
            await bot?.sendMessage(
              chatId,
              `🔍 Searching web: ${args.query}...`,
            );
            const searchResults = await google.search(args.query, {
              safe: false,
              parse_ads: false,
            });
            const snippets = searchResults.results
              .slice(0, 5)
              .map((r) => `${r.title}\n${r.description}`)
              .join("\n\n");

            state.messages.push({
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: toolCallId,
                  type: "function",
                  function: { name: toolCallName, arguments: toolCallArgs },
                },
              ],
            } as any);

            state.messages.push({
              role: "tool",
              tool_call_id: toolCallId,
              name: toolCallName,
              content: snippets || "No results.",
            } as any);

            await makeApiRequest();
          } catch (e) {
            console.error("Search failed", e);
            await bot?.sendMessage(chatId, "⚠️ Internet search failed.");
          }
        }
      } else {
        if (messageId) {
          await editTelegramMessage(chatId, messageId, reply);
        } else if (reply.length > 0) {
          await sendTelegramMessage(chatId, reply);
        }
        state.messages.push({ role: "assistant", content: reply });
      }
    }

    try {
      await makeApiRequest();
    } catch (err: any) {
      console.error("Chat API Error:", err);
      // rollback message if it errored out
      state.messages.pop();

      let errorMsg = err.message;
      if (errorMsg.includes("401")) {
        errorMsg +=
          "\\n\\n(Note: A 401 error means your API key is invalid or has been revoked.)";
      } else if (errorMsg.includes("429")) {
        errorMsg +=
          "\\n\\n(Note: A 429 error means you have hit your rate limit.)";
      } else if (errorMsg.includes("vision") || errorMsg.includes("image")) {
        errorMsg += "\\n\\n(Note: This model might not support vision.)";
      }

      await bot?.sendMessage(
        chatId,
        `Error communicating with API: ${errorMsg}`,
      );
    }
  });
}
