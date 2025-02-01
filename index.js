const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");
const axios = require("axios");

// Configuration
const TOKEN = "7815602689:AAHLWqKcP9aPjXZlCIokDiAO269fZLmX87g";
const DEEPSEEK_API_KEY = "WbafI5RbOa6Wa9gpL9lpSgGY7QzcLvty";
const ADMIN_ID = "835260592";
const FOOD_OPTIONS = [
  "Beshbarmak (Boiled meat with noodles)",
  "Kazy-Karta (Horse sausage)",
  "Kuyrdak (Fried liver, heart, and kidney)",
  "Baursak (Fried dough)",
  "Shashlik (Grilled meat skewers)",
  "Manti (Steamed dumplings)",
];

const bot = new TelegramBot(TOKEN, { polling: true });
let votes = new Map();

// Generate question using DeepSeek AI
async function generateQuestion() {
  try {
    const response = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        messages: [
          {
            role: "user",
            content:
              "Generate a fun question to ask about food preferences for dinner, 1 sentence only",
          },
        ],
        model: "deepseek-chat",
      },
      {
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    return "What would you like to eat tonight?";
  }
}

// Daily voting scheduler
cron.schedule("0 11 * * *", async () => {
  // Runs every day at 11 AM
  const chatId = YOUR_GROUP_ID; // Replace with actual group ID
  const question = await generateQuestion();

  const options = {
    reply_markup: JSON.stringify({
      inline_keyboard: FOOD_OPTIONS.map((food) => [
        { text: food, callback_data: food },
      ]),
    }),
  };

  const mentionAll = FOOD_OPTIONS.map((_, index) => `@user${index + 1}`).join(
    " "
  ); // Replace with actual usernames
  bot.sendMessage(chatId, `${mentionAll}\n${question}`, options);
});

// Handle votes
bot.on("callback_query", (query) => {
  const userId = query.from.id;
  const foodChoice = query.data;

  votes.set(userId, foodChoice);
  bot.answerCallbackQuery(query.id, { text: `Voted for ${foodChoice}!` });
});

// Show results after 1 hour
cron.schedule("0 12 * * *", () => {
  // Runs at 12 PM
  const chatId = YOUR_GROUP_ID;

  const results = {};
  votes.forEach((value) => {
    results[value] = (results[value] || 0) + 1;
  });

  let resultText = "Tonight's Dinner Results:\n";
  Object.entries(results).forEach(([food, count]) => {
    resultText += `\n${food}: ${count} votes`;
  });

  bot.sendMessage(chatId, resultText);
  votes.clear();
});

// Admin commands
bot.onText(/\/addfood (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;

  const newFood = match[1];
  FOOD_OPTIONS.push(newFood);
  bot.sendMessage(msg.chat.id, `Added new food option: ${newFood}`);
});

console.log("Bot is running...");
