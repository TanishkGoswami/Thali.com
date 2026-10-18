import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://ooqtmpnasgricxreqzbb.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup: any = null) {
  const payload: any = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown"
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("OK", { status: 200 });
  }

  try {
    const update = await req.json();

    // 1. Text Message
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat?.id;
      const text = (msg.text || "").trim();

      if (text.startsWith("/start")) {
        const parts = text.split(" ");
        const payload = parts[1]?.trim();

        if (payload) {
          const cleanNumber = payload.replace("_", "-").toUpperCase();
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .or(`member_number.ilike.${cleanNumber},id.eq.${payload}`)
            .maybeSingle();

          if (profile) {
            await supabase
              .from("profiles")
              .update({ telegram_chat_id: String(chatId) })
              .eq("id", profile.id);

            await sendTelegramMessage(
              chatId,
              `🎉 *Account Successfully Linked!*\nWelcome, *${profile.full_name}* (\`${profile.member_number}\`)!\nYour Thali.com pass is connected.`,
              {
                inline_keyboard: [
                  [
                    { text: "🍛 Today's Menu", callback_data: "action_menu" },
                    { text: "⚡ Mark RSVP", callback_data: "action_rsvp" }
                  ]
                ]
              }
            );
            return new Response("OK", { status: 200 });
          }
        }

        await sendTelegramMessage(
          chatId,
          `👋 *Welcome to Thali.com Mess Bot!*\nSend your *Member Number* (e.g. \`M-101\`) to link your dining pass.`
        );
      } else if (text.startsWith("/menu") || text.startsWith("/rsvp")) {
        await sendTelegramMessage(
          chatId,
          `🍛 *Today's Meal RSVP*\nAre you attending today's meal sessions?`,
          {
            inline_keyboard: [
              [
                { text: "✅ Coming for Lunch", callback_data: "rsvp_attend_lunch" },
                { text: "❌ Skip Lunch", callback_data: "rsvp_skip_lunch" }
              ],
              [
                { text: "✅ Coming for Dinner", callback_data: "rsvp_attend_dinner" },
                { text: "❌ Skip Dinner", callback_data: "rsvp_skip_dinner" }
              ]
            ]
          }
        );
      }
    }

    // 2. Button Tap (Callback Query)
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      const data = cb.data;

      // Answer callback
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id })
      });

      if (data?.startsWith("rsvp_")) {
        const isSkip = data.includes("skip");
        const period = data.includes("dinner") ? "dinner" : "lunch";
        const today = new Date().toISOString().split("T")[0];

        const { data: member } = await supabase
          .from("profiles")
          .select("id")
          .eq("telegram_chat_id", String(chatId))
          .maybeSingle();

        if (member) {
          if (isSkip) {
            await supabase.from("meal_skips").upsert(
              {
                member_id: member.id,
                service_date: today,
                meal_period: period,
                reason: "Marked Skip via Telegram Bot"
              },
              { onConflict: "member_id,service_date,meal_period" }
            );
            await sendTelegramMessage(
              chatId,
              `❌ *Marked NOT COMING for ${period.toUpperCase()} today!* Plate saved for the kitchen.`
            );
          } else {
            await supabase
              .from("meal_skips")
              .delete()
              .eq("member_id", member.id)
              .eq("service_date", today)
              .eq("meal_period", period);
            await sendTelegramMessage(
              chatId,
              `✅ *Marked ATTENDING for ${period.toUpperCase()} today!* Enjoy your meal 🍛`
            );
          }
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return new Response(err.message, { status: 500 });
  }
});
