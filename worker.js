export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ==============================
    // HEALTH CHECK
    // ==============================
    if (request.method === "GET") {
      return new Response(
        "XAU Telegram Bridge is ONLINE",
        { status: 200 }
      );
    }

    // ==============================
    // ONLY POST
    // ==============================
    if (request.method !== "POST") {
      return new Response(
        "Method Not Allowed",
        { status: 405 }
      );
    }

    try {
      const body = await request.text();

      let data = {};

      try {
        data = JSON.parse(body);
      } catch {
        data = {
          message: body
        };
      }

      // ==============================
      // TELEGRAM WEBHOOK UPDATE
      // ==============================
      if (data.update_id || data.message) {
        const telegramMessage = data.message;

        if (!telegramMessage) {
          return new Response("OK", { status: 200 });
        }

        const chatId = telegramMessage.chat?.id;
        const text = telegramMessage.text || "";

        if (!chatId) {
          return new Response("No chat ID", { status: 200 });
        }

        // /start command
        if (text === "/start") {
          await sendTelegram(
            env.TELEGRAM_BOT_TOKEN,
            chatId,
            "✅ <b>XAU Trading Alerts Bot is ONLINE</b>\n\nTelegram connection is working."
          );

          return new Response("OK", { status: 200 });
        }

        // Test messages
        await sendTelegram(
          env.TELEGRAM_BOT_TOKEN,
          chatId,
          "📩 <b>Message received</b>\n\n" +
          escapeHtml(text)
        );

        return new Response("OK", { status: 200 });
      }

      // ==============================
      // TRADINGVIEW ALERT
      // ==============================
      const message =
        data.message ??
        data.alert ??
        data.text ??
        body;

      const chatId =
        data.chat_id ??
        env.TELEGRAM_CHAT_ID;

      if (!env.TELEGRAM_BOT_TOKEN) {
        return new Response(
          "TELEGRAM_BOT_TOKEN secret is missing",
          { status: 500 }
        );
      }

      if (!chatId) {
        return new Response(
          "TELEGRAM_CHAT_ID is missing",
          { status: 500 }
        );
      }

      await sendTelegram(
        env.TELEGRAM_BOT_TOKEN,
        chatId,
        String(message)
      );

      return new Response(
        JSON.stringify({
          ok: true,
          message: "Telegram message sent"
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

    } catch (error) {
      return new Response(
        `Worker error: ${error.message}`,
        { status: 500 }
      );
    }
  }
};


// ==========================================
// SEND TELEGRAM MESSAGE
// ==========================================
async function sendTelegram(token, chatId, text) {
  const telegramUrl =
    `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await fetch(telegramUrl, {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "HTML"
    })
  });

  const result = await response.text();

  if (!response.ok) {
    throw new Error(`Telegram error: ${result}`);
  }

  return result;
}


// ==========================================
// HTML ESCAPE
// ==========================================
function escapeHtml(text) {
  return String(text)
    .replace(/
