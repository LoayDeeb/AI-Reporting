const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data/NewData/WEB EN_01 October 2025 - 31 October 2025 (1).txt', 'utf8'));

// Find a conversation with CardsList data
for (const chatter of data.ActiveChatters) {
  for (const msg of chatter.ChatHistory || []) {
    if (msg.CardsList && msg.CardsList.length > 0) {
      console.log('=== Message with CardsList ===');
      console.log('SenderID:', chatter.SenderID);
      console.log('Message #:', msg.Number);
      console.log('From:', msg.from);
      console.log('MessageText:', msg.MessageText?.substring(0, 100));
      console.log('\nCardsList:');
      console.log(JSON.stringify(msg.CardsList, null, 2));
      
      // Find the next user message to see what they selected
      const nextMsgs = chatter.ChatHistory.filter(m => m.Number > msg.Number).sort((a,b) => a.Number - b.Number);
      if (nextMsgs.length > 0) {
        console.log('\nNext message after cards:');
        console.log('  From:', nextMsgs[0].from);
        console.log('  Text:', nextMsgs[0].MessageText?.substring(0, 100));
        console.log('  SelectedCard:', nextMsgs[0].SelectedCard);
      }
      
      process.exit(0);
    }
  }
}
