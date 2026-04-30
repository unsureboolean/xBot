import { Client, GatewayIntentBits, Message, Partials } from "discord.js";
import OpenAI from "openai";
import dotenv from "dotenv";
import google from "googlethis";

dotenv.config();

let client: Client | null = null;

type ModelProvider = "openai" | "xai";

interface ChatState {
  provider: ModelProvider;
  persona?: string;
  chatCountdown?: number;
  messages: Array<{
    role: "system" | "user" | "assistant" | "developer" | "tool";
    content: any;
  }>;
}

const chatStates = new Map<string, ChatState>();

// Models
const OPENAI_MODEL = "gpt-4o"; // Vision and Text
const OPENAI_REASONING_MODEL = "gpt-5.4"; // Reasoning
const XAI_MODEL = "grok-4.20-0309"; // Use the latest non-reasoning model

export function getDiscordBotStatus() {
  return {
    isRunning: !!client && client.isReady(),
    discordTokenSet: !!process.env.DISCORD_BOT_TOKEN,
    clientId: client?.user?.id || null,
  };
}

function getChatState(channelId: string): ChatState {
  if (!chatStates.has(channelId)) {
    chatStates.set(channelId, {
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
  return chatStates.get(channelId)!;
}

async function updateNickname(msg: Message, state: ChatState) {
  if (!msg.guild || !msg.guild.members.me) return;

  let name = "AI Assistant";
  if (state.persona === "frank") {
    name = "Frank Reynolds";
  } else if (state.persona === "waifu") {
    name = "Anime Waifu";
  } else if (state.provider === "openai") {
    name = "GPT-4o Bot";
  } else if (state.provider === "xai") {
    name = "Grok Bot";
  }

  try {
    if (msg.guild.members.me.nickname !== name) {
      await msg.guild.members.me.setNickname(name);
    }
  } catch (err) {
    console.error(
      "Failed to update nickname. Bot might lack permissions.",
      err,
    );
  }
}

export function startDiscordBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.warn(
      "DISCORD_BOT_TOKEN is not set in environment variables. Discord bot will not start.",
    );
    return;
  }

  if (!client) {
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel, Partials.Message],
    });

    client.once("ready", () => {
      console.log(`Discord Bot is ready as ${client?.user?.tag}`);
    });

    client.on("error", (error) => {
      console.error("Discord General Error:", error);
    });

    client.on("messageCreate", async (msg: Message) => {
      // Ignore bot messages
      if (msg.author.bot) return;

      let text = msg.content.trim();

      const isOurCommand = [
        "/start",
        "/help",
        "/clear",
        "/openai",
        "/grok",
        "/image",
        "/reason",
        "/frank",
        "/waifu",
        "/chat",
      ].some((cmd) => text.startsWith(cmd));

      // If in a guild, only respond if mentioned OR if it's one of our known commands OR if chatCountdown > 0
      if (msg.guild) {
        if (!client?.user) return;
        const isMentioned = msg.mentions.has(client.user);
        const state = getChatState(msg.channel.id);
        const isCountdownOngoing =
          state.chatCountdown && state.chatCountdown > 0;

        if (!isMentioned && !isOurCommand && !isCountdownOngoing) return;
      }

      const channelId = msg.channel.id;

      // Remove mention from text if present
      if (client?.user && msg.mentions.has(client.user)) {
        text = text.replace(`<@${client.user.id}>`, "").trim();
        // Also handle nickname mentions <@!id>
        text = text.replace(`<@!${client.user.id}>`, "").trim();
      }

      const photos = msg.attachments
        .filter((a) => a.contentType?.startsWith("image/"))
        .map((a) => a.url);

      if (!text && photos.length === 0) return;

      if (text.startsWith("/start") || text.startsWith("/help")) {
        await msg.reply(
          `Hello! I am your AI assistant.\nAvailable commands:\n/openai - Switch to OpenAI (GPT-4o)\n/grok - Switch to xAI (Grok-4)\n/image <prompt> - Generate an image (Uses current provider)\n/reason <prompt> - Reason about a prompt using GPT-5.4\n/chat <number> - Bot will reply to the next <number> messages without needing to be tagged\n/frank - Enable the Frank Reynolds persona\n/waifu - Enable the Anime Waifu persona\n/clear - Clear chat history\n\n*(Note: If commands don't work, ensure you \`@mention\` the bot first, e.g., \`@Bot /help\`, OR enable the **Message Content Intent** in the Discord Developer Portal.)*`,
        );
        return;
      }

      if (text.startsWith("/clear")) {
        chatStates.delete(channelId);
        await msg.reply("Chat history cleared.");
        return;
      }

      if (text.startsWith("/chat")) {
        const state = getChatState(channelId);
        const match = text.match(/\/chat\s+(\d+)/);
        if (match && match[1]) {
          const count = parseInt(match[1]);
          state.chatCountdown = count;
          await msg.reply(
            `Got it! I'll automatically respond to the next ${count} messages down here without needing a tag.`,
          );
        } else {
          state.chatCountdown = 0;
          await msg.reply("Please specify a number. Example: `/chat 5`");
        }
        return;
      }

      if (text.startsWith("/openai")) {
        const state = getChatState(channelId);
        state.provider = "openai";
        state.persona = undefined;
        if (
          state.messages.length > 0 &&
          ["system", "developer"].includes(state.messages[0].role)
        ) {
          state.messages[0].content =
            "You are a helpful AI assistant. Use reasoning to answer accurately.";
        }
        await updateNickname(msg, state);
        await msg.reply("Switched to OpenAI (GPT-4o). Persona reset.");
        return;
      }

      if (text.startsWith("/grok")) {
        const state = getChatState(channelId);
        state.provider = "xai";
        state.persona = undefined;
        if (
          state.messages.length > 0 &&
          ["system", "developer"].includes(state.messages[0].role)
        ) {
          state.messages[0].content =
            "You are a helpful AI assistant. Use reasoning to answer accurately.";
        }
        await updateNickname(msg, state);
        await msg.reply("Switched to xAI (Grok-4). Persona reset.");
        return;
      }

      if (text.startsWith("/frank")) {
        const state = getChatState(channelId);
        state.persona = "frank";
        if (
          state.messages.length > 0 &&
          ["system", "developer"].includes(state.messages[0].role)
        ) {
          state.messages[0].content =
            "You are Frank Reynolds from It's Always Sunny in Philadelphia. You are degenerate, selfish, chaotic, wealthy, and frequently reference your bizarre business schemes, guns, the gang, rum ham, and living in squalor. Do not break character. Do not be polite.";
        }
        await updateNickname(msg, state);
        await msg.reply(
          "So anyway, I started blasting... (Frank Reynolds persona activated! It will reset next time you change models).",
        );
        return;
      }

      if (text.startsWith("/waifu")) {
        const state = getChatState(channelId);
        state.persona = "waifu";
        if (
          state.messages.length > 0 &&
          ["system", "developer"].includes(state.messages[0].role)
        ) {
          state.messages[0].content =
            "You are a helpful, cheerful, and affectionate anime waifu character. You use terms like 'senpai' or light emoticons, but remain focused on being genuinely helpful and clear... mostly. Avoid being extremely exaggerated or annoying. Do not break character, but prioritize providing good answers.";
        }
        await updateNickname(msg, state);
        await msg.reply(
          "UwU~ Senpai noticed me! (Anime Waifu persona activated! It will reset next time you change models).",
        );
        return;
      }

      if (text.startsWith("/image")) {
        const prompt = text.replace("/image", "").trim();
        if (!prompt) {
          await msg.reply(
            "Please provide a prompt. Example: /image a cute cat",
          );
          return;
        }

        const state = getChatState(channelId);

        if (state.provider === "xai") {
          const xaiKey = process.env.XAI_API_KEY;
          if (!xaiKey) {
            await msg.reply(
              "xAI API key is missing. Add XAI_API_KEY to your environment variables.",
            );
            return;
          }

          const generatingMsg = await msg.reply(
            "Generating image with Grok...",
          );
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
              await msg.reply({ files: [imageUrl] });
              await generatingMsg.delete();
            } else {
              await generatingMsg.edit("Failed to generate image with Grok.");
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
            await generatingMsg.edit(`Error generating image: ${errorMsg}`);
          }
          return;
        }

        if (!process.env.OPENAI_API_KEY) {
          await msg.reply(
            "OpenAI API key is missing. Image generation requires OpenAI.",
          );
          return;
        }

        const generatingMsg = await msg.reply(
          "Generating image with DALL-E 3...",
        );
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
            await msg.reply({ files: [imageUrl] });
            await generatingMsg.delete();
          } else {
            await generatingMsg.edit("Failed to generate image.");
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
          await generatingMsg.edit(`Error generating image: ${errorMsg}`);
        }
        return;
      }

      const state = getChatState(channelId);

      // Decrease the countdown if we are automatically responding
      if (state.chatCountdown && state.chatCountdown > 0 && !isOurCommand) {
        state.chatCountdown -= 1;
      }

      let isReasoningOverride = false;
      let actualText = text;

      if (text.startsWith("/reason")) {
        actualText = text.replace("/reason", "").trim();
        isReasoningOverride = true;
        if (!actualText && photos.length === 0) {
          await msg.reply(
            "Please provide a prompt to reason about. Example: /reason How many Rs in strawberry?",
          );
          return;
        }
      }

      let userContent: any = actualText;

      if (photos.length > 0) {
        const fileUrl = photos[0];
        userContent = [
          { type: "text", text: actualText || "What is in this image?" },
          { type: "image_url", image_url: { url: fileUrl } },
        ];
      }

      state.messages.push({ role: "user", content: userContent });

      if (state.messages.length > 21) {
        state.messages.splice(1, 2);
      }

      const { provider, messages } = state;
      const activeProvider = isReasoningOverride ? "openai" : provider;

      if ("sendTyping" in msg.channel) {
        await msg.channel.sendTyping();
      }

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
        if ("sendTyping" in msg.channel) {
          await msg.channel.sendTyping();
        }

        let stream: AsyncIterable<any> | null = null;

        if (activeProvider === "openai") {
          if (!process.env.OPENAI_API_KEY) {
            await msg.reply("OpenAI API key is not configured.");
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
            await msg.reply(
              "xAI API key is missing. Add XAI_API_KEY to your environment variables.",
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
        let replyMessage: Message | null = null;
        let activeMessageIndex = 0;
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

            const chunkIndex = Math.floor(reply.length / 1950);
            if (chunkIndex > activeMessageIndex) {
              // Finalize previous message
              if (replyMessage) {
                try {
                  await replyMessage.edit(
                    reply.substring(
                      activeMessageIndex * 1950,
                      (activeMessageIndex + 1) * 1950,
                    ),
                  );
                } catch (e) {}
              }
              // Move to new message
              activeMessageIndex = chunkIndex;
              replyMessage = null;
            }

            const currentChunkText = reply.substring(activeMessageIndex * 1950);
            const now = Date.now();

            if (!replyMessage && currentChunkText.length > 0) {
              replyMessage = await msg.reply(currentChunkText + " ✍️");
              lastEditTime = now;
            } else if (replyMessage && now - lastEditTime > 1500) {
              try {
                await replyMessage.edit(currentChunkText + " ✍️");
              } catch (e) {}
              lastEditTime = now;
            }
          }
        }

        if (isToolCall) {
          if (toolCallName === "search_internet") {
            try {
              const args = JSON.parse(toolCallArgs);
              await msg.reply(`🔍 Searching web: ${args.query}...`);
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
              await msg.reply("⚠️ Internet search failed.");
            }
          }
        } else {
          if (replyMessage) {
            try {
              await replyMessage.edit(
                reply.substring(activeMessageIndex * 1950),
              );
            } catch (e) {}
          } else if (reply.length > 0) {
            for (let i = 0; i < reply.length; i += 1950) {
              await msg.reply(reply.substring(i, i + 1950));
            }
          }
          state.messages.push({ role: "assistant", content: reply });
        }
      }

      try {
        await makeApiRequest();
      } catch (err: any) {
        console.error("Chat API Error:", err);
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

        await msg.reply(`Error communicating with API: ${errorMsg}`);
      }
    });

    client.login(token).catch((err) => {
      console.error("Failed to log in to Discord:", err);
    });
  }
}
