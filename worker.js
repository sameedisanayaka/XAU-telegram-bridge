export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check
    if (request.method === "GET") {
      return new Response(
        "XAU Telegram Bridge is ONLINE",
        { status: 200 }
      );
    }

    // Only POST requests are accepted for Telegram alerts
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

      // Message from TradingView
      const message =
        data.message ||
        data.text ||
        data.alert ||
        body;

      // Chat ID can come from JSON or Cloudflare secret
      const chatId =
        data.chat_id ||
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

      const telegramUrl =
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

      const telegramResponse = await fetch(telegramUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: String(message),
          parse_mode: "HTML"
        })
      });

      const result = await telegramResponse.text();

      if (!telegramResponse.ok) {
        return new Response(
          `Telegram error: ${result}`,
          { status: 502 }
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          telegram: JSON.parse(result)
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
