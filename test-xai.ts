import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.XAI_API_KEY || (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('xai-') ? process.env.GROQ_API_KEY : '');
const xai = new OpenAI({
  apiKey,
  baseURL: 'https://api.x.ai/v1',
});

async function main() {
  try {
    const list = await xai.models.list();
    console.log("Models:", list.data.map(m => m.id).join(', '));
  } catch(e) {
    console.error(e);
  }
}

main();
