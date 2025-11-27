# 🤖 AI-Powered Chatbot Analytics Platform

An intelligent conversation analysis platform built with Next.js 14 and OpenAI integration. This platform analyzes chatbot conversations to provide insights on sentiment, user intents, conversation quality, and knowledge gaps.

## ✨ Features

### 🎯 **Goal Metrics**
- **Conversation Length Analysis**: AI categorizes conversation patterns
- **First Response Time Intelligence**: Tracks bot response efficiency
- **Conversation Flow Mapping**: AI identifies typical user journeys

### 📊 **Product Metrics**
- **Intent Recognition**: AI extracts user intents from Arabic/English messages
- **Sub-category Classification**: Automatic conversation categorization
- **Topic Modeling**: Identifies trending topics and user concerns
- **FAQ Generation**: AI suggests common questions based on patterns

### 💝 **CX Metrics**
- **Sentiment Analysis**: Real-time emotion detection in conversations
- **Satisfaction Prediction**: AI predicts user satisfaction scores
- **Escalation Detection**: Flags conversations needing human intervention
- **User Journey Sentiment Mapping**: Tracks sentiment throughout conversations

### 🧠 **Knowledge QA**
- **Answer Quality Assessment**: AI evaluates if bot responses address user questions
- **Knowledge Gap Detection**: Identifies unanswered or poorly answered queries
- **Retrieval-Augmented Analysis**: Suggests improvements for bot responses
- **Context Understanding**: Measures how well bot maintains conversation context

## 🛠 **Technology Stack**

- **Frontend**: Next.js 14 with React & TypeScript
- **AI Integration**: OpenAI GPT-3.5 Turbo API
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React

## 🚀 **Getting Started**

### Prerequisites

1. **Node.js 18+**: [Download Node.js](https://nodejs.org/)
2. **OpenAI API Key**: [Get your API key](https://platform.openai.com/api-keys)

### Installation

1. **Clone or navigate to the project**:
   ```bash
   cd chatbot-analytics
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Open `.env.local` file
   - Replace `your_openai_api_key_here` with your actual OpenAI API key:
   ```env
   OPENAI_API_KEY=sk-your-actual-api-key-here
   NEXT_PUBLIC_APP_NAME=Chatbot Analytics Platform
   ```

4. **Ensure your conversation data is in place**:
   - The conversation JSON file should be in `data/conversations.json`
   - This should already be copied from your original file

5. **Start the development server**:
   ```bash
   npm run dev
   ```

6. **Open the application**:
   - Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 **How to Use**

### 1. **Basic Information**
- Click "Basic Info" to see total conversations and basic statistics
- View conversation counts and sender IDs without AI analysis

### 2. **Sample Analysis**
- Click "Sample Analysis" to get a sample conversation for testing
- Useful for understanding the data structure

### 3. **Full AI Analysis** 🤖
- Click "🤖 Full AI Analysis" to run complete AI analysis on all conversations
- **Warning**: This will take several minutes and use OpenAI API credits
- Provides comprehensive insights including:
  - Sentiment distribution across all conversations
  - Top user intents and categories
  - Average quality scores and response times

### 4. **Individual Conversation Analysis**
- Enter a specific SenderID in the input field
- Click "🤖 Analyze with AI" to get detailed analysis for that conversation
- View detected intents, sentiment, quality score, and AI-generated summary

## 📊 **Understanding the Analytics**

### **Sentiment Analysis**
- **Positive**: User expressions indicate satisfaction or positive emotions
- **Negative**: User expressions indicate frustration or negative emotions  
- **Neutral**: Neutral or informational conversations

### **Intent Recognition**
Common detected intents include:
- `inquiry` - General questions
- `complaint` - User complaints or issues
- `support_request` - Technical support needs
- `information_seeking` - Looking for specific information
- `booking` - Making reservations or appointments
- `payment` - Payment-related queries

### **Quality Score**
- Measures how well bot responses address user questions
- Scale: 0-100% (higher is better)
- Based on AI evaluation of question-answer relevance

### **Knowledge Gaps**
- AI-identified topics where the bot couldn't provide adequate responses
- Helps improve bot training and knowledge base

## 🔧 **API Endpoints**

### GET `/api/analyze`
Query parameters:
- `action=basic`: Basic conversation statistics
- `action=sample`: Get sample conversation
- `action=full`: Full AI analysis (slow, costs API credits)

### POST `/api/analyze`
Body:
```json
{
  "senderID": "your-sender-id",
  "action": "analyze" | "messages"
}
```

## 💰 **API Usage & Costs**

This application uses OpenAI's API which has usage-based pricing:

- **Basic Info**: No API calls
- **Sample Analysis**: No API calls  
- **Individual Analysis**: ~5-10 API calls per conversation
- **Full Analysis**: 5-10 calls × number of conversations

**Estimated costs** (with GPT-3.5-turbo):
- Individual conversation: ~$0.01-0.02
- Full analysis of 100 conversations: ~$1-2

Monitor your usage at [OpenAI Usage Dashboard](https://platform.openai.com/usage).

## 🔒 **Security**

- API keys are stored in environment variables (never committed to git)
- Server-side API calls only (API key not exposed to browser)
- Environment variables prefixed with `NEXT_PUBLIC_` are NOT used for sensitive data

## 🐛 **Troubleshooting**

### Common Issues:

1. **"OpenAI API key not defined" error**:
   - Ensure you've set `OPENAI_API_KEY` in `.env.local`
   - Restart the development server after adding the key

2. **"Failed to analyze conversations" error**:
   - Check your OpenAI API key is valid and has credits
   - Verify the conversation JSON file exists in `data/conversations.json`

3. **Analysis taking too long**:
   - Full analysis processes conversations in batches with delays
   - Check the console logs for progress updates

4. **No data showing**:
   - Ensure the conversation JSON file is properly formatted
   - Check browser console for any JavaScript errors

## 📁 **Project Structure**

```
chatbot-analytics/
├── src/
│   ├── app/
│   │   ├── api/analyze/route.ts    # API endpoints
│   │   └── page.tsx                # Main dashboard
│   ├── lib/
│   │   ├── openai.ts              # OpenAI client setup
│   │   ├── ai-analysis.ts         # AI analysis functions
│   │   └── data-processor.ts      # Data processing logic
│   └── types/
│       └── conversation.ts        # TypeScript interfaces
├── data/
│   └── conversations.json         # Your conversation data
├── .env.local                     # Environment variables
└── package.json                   # Dependencies
```

## 🚀 **Deployment**

To deploy to production:

1. **Vercel** (Recommended):
   ```bash
   npm run build
   npx vercel
   ```

2. **Other platforms**: Build the project and deploy the `.next` folder
   ```bash
   npm run build
   npm start
   ```

## 🤝 **Contributing**

This platform can be extended with additional features:
- More AI analysis types
- Export functionality for reports
- Real-time conversation monitoring
- Advanced filtering and search
- Integration with other analytics tools

## 📄 **License**

This project is built for analyzing chatbot conversations with AI-powered insights. Customize as needed for your specific use case.

---

**Built with ❤️ using Next.js 14, OpenAI, and modern web technologies**
