// index.js
require("dotenv").config(); // Optional: if you want to load variables from a .env file

const express = require("express");
const bodyParser = require("body-parser");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(bodyParser.json());

// hello world

// === Environment Variables ===
// Make sure to set these on Render.com (or in a local .env file)
// TELEGRAM_BOT_TOKEN: Your Telegram bot token (provided by BotFather)
// ADMIN_ID: Telegram user id of the admin (as a string or number)
// WEBHOOK_URL: Your public URL for the webhook (e.g. https://your-app.onrender.com)
// PORT: The port number Render assigns (usually provided in process.env.PORT)
const token = process.env.TELEGRAM_BOT_TOKEN;
const adminId = process.env.ADMIN_ID;
const webhookUrl = process.env.WEBHOOK_URL;
const port = process.env.PORT || 3000;

if (!token) {
  console.error("Error: TELEGRAM_BOT_TOKEN is not set.");
  process.exit(1);
}
if (!webhookUrl) {
  console.error("Error: WEBHOOK_URL is not set.");
  process.exit(1);
}
if (!adminId) {
  console.error("Error: ADMIN_ID is not set.");
  process.exit(1);
}

// === Initialize the Telegram Bot in Webhook Mode ===
const bot = new TelegramBot(token, { webHook: { port: port } });
// Set Telegram to use the following URL for sending updates to your bot.
bot
  .setWebHook(`${webhookUrl}/bot${token}`)
  .then(() => {
    console.log("Webhook set successfully!");
  })
  .catch((err) => {
    console.error("Error setting webhook:", err);
  });

// === Define a list of food suggestions for lunch and dinner ===
const foods = {
  lunch: [
    "Sandwich",
    "Salad",
    "Pasta",
    "Burger",
    "Sushi",
    "Soup",
    // Add more lunch items as needed
  ],
  dinner: [
    "Steak",
    "Pizza",
    "Grilled Chicken",
    "Tacos",
    "Seafood",
    "Risotto",
    // Add more dinner items as needed
  ],
};

// === Express Route for Webhook Updates ===
// Telegram will send POST requests to this URL.
app.post(`/bot${token}`, (req, res) => {
  // Let the Telegram bot library process the update.
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// === A simple health check route ===
app.get("/", (req, res) => {
  res.send("Telegram Food Bot is running!");
});

// === Telegram Bot Command and Callback Handling ===

// Listen for the "/what_food" command.
bot.onText(/\/what_food/, (msg) => {
  // For security, only process this command if the sender is the admin.
  if (msg.from.id.toString() !== adminId.toString()) {
    console.log(
      `Unauthorized user (${msg.from.id}) attempted /what_food command.`
    );
    return;
  }

  // Create an inline keyboard with options for lunch or dinner.
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Lunch", callback_data: "meal_lunch" },
          { text: "Dinner", callback_data: "meal_dinner" },
        ],
      ],
    },
  };

  bot.sendMessage(
    msg.chat.id,
    "Hi Admin! Choose the meal for which you want food suggestions:",
    opts
  );
});

// Handle callback queries from inline buttons.
bot.on("callback_query", (callbackQuery) => {
  const data = callbackQuery.data;
  const message = callbackQuery.message;

  // If the callback data is for choosing a meal:
  if (data === "meal_lunch" || data === "meal_dinner") {
    // Extract the meal type from the callback data.
    const mealType = data.split("_")[1]; // "lunch" or "dinner"
    const suggestions = foods[mealType];

    // Build inline keyboard buttons for each suggestion.
    // (Each button callback_data includes the meal type and food name.)
    const buttons = suggestions.map((food) => {
      return [{ text: food, callback_data: `select_${mealType}_${food}` }];
    });

    // Send the list of suggestions.
    const opts = {
      reply_markup: {
        inline_keyboard: buttons,
      },
    };
    bot.sendMessage(
      message.chat.id,
      `Here are some ${mealType} suggestions:`,
      opts
    );

    // If the callback data is for selecting a specific food:
  } else if (data.startsWith("select_")) {
    // Data format: "select_mealType_foodName"
    const parts = data.split("_");
    // parts[0] is "select", parts[1] is meal type, parts[2...] joined form the food name.
    const mealType = parts[1];
    const foodName = parts.slice(2).join("_");

    bot.sendMessage(
      message.chat.id,
      `Great choice! Enjoy your ${mealType}: ${foodName}.`
    );
  }

  // Answer the callback query to remove the "waiting" animation.
  bot
    .answerCallbackQuery(callbackQuery.id)
    .catch((err) => console.error("Error answering callback query:", err));
});

// === Start the Express Server ===
app.listen(port, () => {
  console.log(`Express server is listening on port ${port}`);
});
