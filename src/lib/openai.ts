import OpenAI from 'openai';

// Debug logging for API key
console.log('🔑 API Key Check:');
console.log('- Raw API key:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');
console.log('- Key exists:', !!process.env.OPENAI_API_KEY);
console.log('- Key length:', process.env.OPENAI_API_KEY?.length);
console.log('- Key starts with sk-:', process.env.OPENAI_API_KEY?.startsWith('sk-'));

// Check if API key is properly configured
export function isOpenAIConfigured(): boolean {
  return !!(process.env.OPENAI_API_KEY && 
           process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' &&
           process.env.OPENAI_API_KEY.startsWith('sk-'));
}

// Create OpenAI client only when properly configured
function createOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not defined in environment variables');
  }

  if (process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    throw new Error('⚠️  You need to replace "your_openai_api_key_here" with your actual OpenAI API key in .env.local');
  }

  if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    throw new Error('⚠️  Invalid OpenAI API key format. API keys should start with "sk-"');
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Export function to get OpenAI client (throws error if not configured)
export function getOpenAIClient(): OpenAI {
  return createOpenAIClient();
}

// Default export for backward compatibility
const openai = isOpenAIConfigured() ? createOpenAIClient() : null;
export default openai; 