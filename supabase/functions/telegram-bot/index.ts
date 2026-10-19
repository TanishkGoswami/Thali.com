import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// -------------------------------------------------------------
// Environment & Supabase Client
// -------------------------------------------------------------

const MEMBER_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const ADMIN_BOT_TOKEN = Deno.env.get("TELEGRAM_ADMIN_BOT_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://ooqtmpnasgricxreqzbb.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const WEBAPP_URL = "https://thali-com.vercel.app/telegram";

const FALLBACK_MENUS = {
  breakfast: "Poha, Bread Butter, Tea / Coffee",
  lunch: "Rajma, Jeera Rice, 4 Butter Roti, Dal Tadka, Fresh Salad, Gulab Jamun",
  dinner: "Kadai Paneer, 4 Tawa Roti, Dal Fry, Steam Rice, Mixed Pickle, Papad"
};

// -------------------------------------------------------------
// Telegram API Helper Functions
// -------------------------------------------------------------

async function callTelegram(method: string, payload: any = {}, token: string = MEMBER_BOT_TOKEN) {
  if (!token) return { ok: false, description: "Token missing" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err: any) {
    console.error(`Telegram API error on ${method}:`, err.message);
    return { ok: false, description: err.message };
  }
}

async function sendMessage(chatId: number | string, text: string, replyMarkup: any = null, token: string = MEMBER_BOT_TOKEN) {
  const payload: any = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    disable_notification: false
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  let res = await callTelegram("sendMessage", payload, token);
  if (!res?.ok && res?.description?.includes("can't parse entities")) {
    delete payload.parse_mode;
    res = await callTelegram("sendMessage", payload, token);
  }
  return res;
}

async function editMessageText(chatId: number | string, messageId: number, text: string, replyMarkup: any = null, token: string = MEMBER_BOT_TOKEN) {
  const payload: any = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "Markdown"
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  let res = await callTelegram("editMessageText", payload, token);
  if (!res?.ok && res?.description?.includes("can't parse entities")) {
    delete payload.parse_mode;
    res = await callTelegram("editMessageText", payload, token);
  }
  if (!res?.ok && !res?.description?.includes("message is not modified")) {
    return sendMessage(chatId, text, replyMarkup, token);
  }
  return res;
}

async function answerCallbackQuery(callbackQueryId: string, text: string = "", showAlert: boolean = false, token: string = MEMBER_BOT_TOKEN) {
  return await callTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert
  }, token);
}

// -------------------------------------------------------------
// Keyboards
// -------------------------------------------------------------

function getMemberMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "Open Mini App", web_app: { url: WEBAPP_URL } }],
      [{ text: "Today's Menu & RSVP", callback_data: "action_menu" }],
      [
        { text: "Digital QR Pass", callback_data: "action_pass" },
        { text: "Meal Balance", callback_data: "action_balance" }
      ]
    ]
  };
}

function getAdminPanelKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "Open Admin Mini App", web_app: { url: `${WEBAPP_URL}?view=admin` } }],
      [
        { text: "Kitchen Headcount", callback_data: "admin_headcount" },
        { text: "Mess Status", callback_data: "admin_status" }
      ],
      [
        { text: "Declare Mess OFF", callback_data: "admin_menu_off" },
        { text: "Reopen Mess", callback_data: "admin_menu_on" }
      ]
    ]
  };
}

// -------------------------------------------------------------
// Member Bot Business Logic
// -------------------------------------------------------------

async function registerSubscriber(chatId: string | number, username?: string, firstName?: string, botType: string = "member") {
  try {
    await supabase.from("bot_subscribers").upsert({
      chat_id: String(chatId),
      username: username || null,
      first_name: firstName || null,
      bot_type: botType,
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: "chat_id" });
  } catch (err: any) {
    console.error("Error registering subscriber:", err.message);
  }
}

async function handleMemberStart(chatId: number | string, username: string, firstName: string, payloadArg?: string) {
  await registerSubscriber(chatId, username, firstName, "member");

  // If start payload passed (e.g. /start M-112 or /start <uuid>)
  if (payloadArg) {
    const cleanNumber = payloadArg.replace("_", "-").toUpperCase();
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .or(`member_number.ilike.${cleanNumber},id.eq.${payloadArg},phone.ilike.%${payloadArg}%`)
      .maybeSingle();

    if (profile) {
      await supabase
        .from("profiles")
        .update({
          telegram_chat_id: String(chatId),
          telegram_username: username || null
        })
        .eq("id", profile.id);

      const successMsg = `*Account Successfully Linked!*\n\nWelcome, *${profile.full_name}* (\`${profile.member_number}\`)!\nYour Thali.com dining pass is now connected to Telegram.\n\nUse the buttons below to check your menu, mark meal RSVP, or display your digital pass.`;
      return sendMessage(chatId, successMsg, getMemberMainMenuKeyboard(), MEMBER_BOT_TOKEN);
    }
  }

  // Check if already linked
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, full_name, member_number")
    .eq("telegram_chat_id", String(chatId))
    .maybeSingle();

  if (existingProfile) {
    const welcomeBackMsg = `Welcome back, *${existingProfile.full_name}* (\`${existingProfile.member_number}\`)!\n\nTap below to open your Mini App or view today's dining schedule.`;
    return sendMessage(chatId, welcomeBackMsg, getMemberMainMenuKeyboard(), MEMBER_BOT_TOKEN);
  }

  const newGreetingMsg = `Welcome to *Thali.com Assistant*!\n\nTo link your mess pass with Telegram:\n1. Tap *Open Mini App* below for instant pass access, or\n2. Reply with your *Member ID* (e.g. \`M-112\`) or your registered mobile number.\n\nEnjoy fresh, smart dining!`;
  return sendMessage(chatId, newGreetingMsg, getMemberMainMenuKeyboard(), MEMBER_BOT_TOKEN);
}

async function handleMemberMenu(chatId: number | string, messageId?: number) {
  const today = new Date().toISOString().split("T")[0];

  // 1. Check for Mess Closures in Supabase
  const { data: closures } = await supabase
    .from("mess_closures")
    .select("*")
    .eq("service_date", today);

  const closureMap: Record<string, any> = {};
  if (closures && closures.length > 0) {
    closures.forEach(c => {
      closureMap[c.meal_period] = c;
    });
  }

  const isAllDayClosed = Boolean(
    closureMap.all_day ||
    (closureMap.breakfast && closureMap.lunch && closureMap.dinner)
  );

  // If mess is closed all day: show clean notice without dishes or RSVP buttons
  if (isAllDayClosed) {
    const reason = closureMap.all_day?.reason ||
      closureMap.lunch?.reason ||
      closureMap.dinner?.reason ||
      closureMap.breakfast?.reason ||
      "Festival Holiday / Routine Maintenance";

    const closedNotice = `*Today's Mess Status* (${today})\n\nMess is *CLOSED* for the entire day.\n*Reason:* ${reason}\n\n_Note: No meals will be deducted from your plan and attendance is marked excused._`;

    const closedKeyboard = {
      inline_keyboard: [
        [{ text: "Open Mini App", web_app: { url: WEBAPP_URL } }],
        [{ text: "Back to Main Menu", callback_data: "action_back_menu" }]
      ]
    };

    if (messageId) {
      return editMessageText(chatId, messageId, closedNotice, closedKeyboard, MEMBER_BOT_TOKEN);
    }
    return sendMessage(chatId, closedNotice, closedKeyboard, MEMBER_BOT_TOKEN);
  }

  // 2. Fetch dishes for today from Supabase menus
  const { data: menus } = await supabase
    .from("menus")
    .select("*, items:menu_items(*)")
    .eq("service_date", today);

  let breakfastDishes = FALLBACK_MENUS.breakfast;
  let lunchDishes = FALLBACK_MENUS.lunch;
  let dinnerDishes = FALLBACK_MENUS.dinner;

  if (menus && menus.length > 0) {
    const bMenu = menus.find((m: any) => m.meal_period === "breakfast");
    if (bMenu?.items?.length) breakfastDishes = bMenu.items.map((i: any) => i.name).join(", ");

    const lMenu = menus.find((m: any) => m.meal_period === "lunch");
    if (lMenu?.items?.length) lunchDishes = lMenu.items.map((i: any) => i.name).join(", ");

    const dMenu = menus.find((m: any) => m.meal_period === "dinner");
    if (dMenu?.items?.length) dinnerDishes = dMenu.items.map((i: any) => i.name).join(", ");
  }

  // 3. Check member's current RSVP state
  const { data: member } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_chat_id", String(chatId))
    .maybeSingle();

  let lunchSkipped = false;
  let dinnerSkipped = false;

  if (member) {
    const { data: skips } = await supabase
      .from("meal_skips")
      .select("meal_period")
      .eq("member_id", member.id)
      .eq("service_date", today);

    if (skips) {
      lunchSkipped = skips.some((s: any) => s.meal_period === "lunch");
      dinnerSkipped = skips.some((s: any) => s.meal_period === "dinner");
    }
  }

  // Build menu text
  const sections: string[] = [`*Today's Mess Menu* (${today})\n`];

  // Lunch
  if (closureMap.lunch) {
    sections.push(`*Lunch (12:30 PM – 03:30 PM)*\nClosed: ${closureMap.lunch.reason}`);
  } else {
    sections.push(`*Lunch (12:30 PM – 03:30 PM)*\n${lunchDishes.split(", ").map(i => `• ${i}`).join("\n")}`);
    sections.push(`Your RSVP: ${lunchSkipped ? "❌ Skipping" : "✅ Attending"}\n`);
  }

  // Dinner
  if (closureMap.dinner) {
    sections.push(`*Dinner (07:30 PM – 10:30 PM)*\nClosed: ${closureMap.dinner.reason}`);
  } else {
    sections.push(`*Dinner (07:30 PM – 10:30 PM)*\n${dinnerDishes.split(", ").map(i => `• ${i}`).join("\n")}`);
    sections.push(`Your RSVP: ${dinnerSkipped ? "❌ Skipping" : "✅ Attending"}\n`);
  }

  const menuText = sections.join("\n");

  // Dynamic RSVP buttons
  const rsvpRow: any[] = [];
  if (!closureMap.lunch) {
    rsvpRow.push({
      text: lunchSkipped ? "✅ Attend Lunch" : "❌ Skip Lunch",
      callback_data: lunchSkipped ? "rsvp_attend_lunch" : "rsvp_skip_lunch"
    });
  }
  if (!closureMap.dinner) {
    rsvpRow.push({
      text: dinnerSkipped ? "✅ Attend Dinner" : "❌ Skip Dinner",
      callback_data: dinnerSkipped ? "rsvp_attend_dinner" : "rsvp_skip_dinner"
    });
  }

  const keyboard = {
    inline_keyboard: [
      rsvpRow,
      [{ text: "Open Mini App", web_app: { url: WEBAPP_URL } }],
      [{ text: "Refresh Menu", callback_data: "action_menu" }]
    ].filter(r => r.length > 0)
  };

  if (messageId) {
    return editMessageText(chatId, messageId, menuText, keyboard, MEMBER_BOT_TOKEN);
  }
  return sendMessage(chatId, menuText, keyboard, MEMBER_BOT_TOKEN);
}

async function handleMemberPass(chatId: number | string) {
  const { data: member } = await supabase
    .from("profiles")
    .select("id, full_name, member_number, status, meal_plan_type")
    .eq("telegram_chat_id", String(chatId))
    .maybeSingle();

  if (!member) {
    return sendMessage(
      chatId,
      `*Digital Pass Not Linked*\n\nPlease reply with your *Member ID* (e.g. \`M-112\`) or registered mobile number to connect your pass.`,
      getMemberMainMenuKeyboard(),
      MEMBER_BOT_TOKEN
    );
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("remaining_meals, expires_at")
    .eq("member_id", member.id)
    .eq("status", "active")
    .maybeSingle();

  const remaining = sub?.remaining_meals ?? 0;
  const expiry = sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString("en-IN") : "No Expiry";

  const passMsg = `*Digital Dining Pass*\n\nMember: *${member.full_name}*\nID: \`${member.member_number}\`\nPlan: *${(member.meal_plan_type || "Standard").toUpperCase()}*\nMeals Remaining: *${remaining}*\nValid Till: *${expiry}*\n\nTap *Open QR Pass* below to scan at the mess counter.`;

  const keyboard = {
    inline_keyboard: [
      [{ text: "Open QR Pass", web_app: { url: `${WEBAPP_URL}?tab=pass` } }],
      [{ text: "Back to Menu", callback_data: "action_back_menu" }]
    ]
  };

  return sendMessage(chatId, passMsg, keyboard, MEMBER_BOT_TOKEN);
}

async function handleMemberBalance(chatId: number | string) {
  const { data: member } = await supabase
    .from("profiles")
    .select("id, full_name, member_number")
    .eq("telegram_chat_id", String(chatId))
    .maybeSingle();

  if (!member) {
    return sendMessage(
      chatId,
      `*Account Not Linked*\n\nReply with your Member ID (e.g. \`M-112\`) or mobile number to link your balance.`,
      getMemberMainMenuKeyboard(),
      MEMBER_BOT_TOKEN
    );
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("member_id", member.id)
    .eq("status", "active")
    .maybeSingle();

  const balanceMsg = `*Meal Balance & Validity*\n\nMember: *${member.full_name}* (\`${member.member_number}\`)\nRemaining Meals: *${sub?.remaining_meals ?? 0}*\nPlan Type: *${sub?.meal_plan_type || "Active Plan"}*\nExpires: *${sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString("en-IN") : "Active"}*`;

  const keyboard = {
    inline_keyboard: [
      [{ text: "Open Mini App", web_app: { url: WEBAPP_URL } }],
      [{ text: "Today's Menu", callback_data: "action_menu" }]
    ]
  };

  return sendMessage(chatId, balanceMsg, keyboard, MEMBER_BOT_TOKEN);
}

async function handleMemberRsvpCallback(cb: any) {
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  const data = cb.data;
  const today = new Date().toISOString().split("T")[0];

  const { data: member } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_chat_id", String(chatId))
    .maybeSingle();

  if (!member) {
    await answerCallbackQuery(cb.id, "Please link your member account first!", true, MEMBER_BOT_TOKEN);
    return;
  }

  const period = data.includes("dinner") ? "dinner" : (data.includes("breakfast") ? "breakfast" : "lunch");
  const isSkip = data.startsWith("rsvp_skip");

  if (isSkip) {
    await supabase.from("meal_skips").upsert({
      member_id: member.id,
      service_date: today,
      meal_period: period,
      reason: "Marked Skip via Telegram Bot"
    }, { onConflict: "member_id,service_date,meal_period" });

    await answerCallbackQuery(cb.id, `Marked NOT ATTENDING for ${period.toUpperCase()}`, false, MEMBER_BOT_TOKEN);
  } else {
    await supabase.from("meal_skips").delete()
      .eq("member_id", member.id)
      .eq("service_date", today)
      .eq("meal_period", period);

    await answerCallbackQuery(cb.id, `Marked ATTENDING for ${period.toUpperCase()}!`, false, MEMBER_BOT_TOKEN);
  }

  // Refresh menu message
  if (messageId) {
    await handleMemberMenu(chatId, messageId);
  }
}

async function handleMemberText(chatId: number | string, username: string, text: string) {
  const clean = text.trim();

  // Try matching Member Number (e.g. M-112) or Phone Number (10 digits)
  const isMemberNum = /^M-\d+$/i.test(clean);
  const isPhone = /^\d{10}$/.test(clean.replace(/\D/g, ""));

  if (isMemberNum || isPhone) {
    let query = supabase.from("profiles").select("*");
    if (isMemberNum) {
      query = query.ilike("member_number", clean);
    } else {
      query = query.ilike("phone", `%${clean.replace(/\D/g, "")}%`);
    }

    const { data: profile } = await query.maybeSingle();
    if (profile) {
      await supabase.from("profiles").update({
        telegram_chat_id: String(chatId),
        telegram_username: username || null
      }).eq("id", profile.id);

      const msg = `*Account Linked Successfully!*\n\nWelcome, *${profile.full_name}* (\`${profile.member_number}\`)!\nYour pass is now active on Telegram.`;
      return sendMessage(chatId, msg, getMemberMainMenuKeyboard(), MEMBER_BOT_TOKEN);
    } else {
      return sendMessage(
        chatId,
        `No member found matching \`${clean}\`.\nPlease check with mess administration or verify your details in the Mini App.`,
        getMemberMainMenuKeyboard(),
        MEMBER_BOT_TOKEN
      );
    }
  }

  return sendMessage(
    chatId,
    `Use the menu below or tap *Open Mini App* for full dining features.`,
    getMemberMainMenuKeyboard(),
    MEMBER_BOT_TOKEN
  );
}

// -------------------------------------------------------------
// Admin Bot Business Logic
// -------------------------------------------------------------

async function isAdminUser(chatId: string | number) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("telegram_chat_id", String(chatId))
    .maybeSingle();

  if (profile?.role === "admin") return true;

  const { data: subscriber } = await supabase
    .from("bot_subscribers")
    .select("bot_type")
    .eq("chat_id", String(chatId))
    .maybeSingle();

  return subscriber?.bot_type === "admin";
}

async function handleAdminPanel(chatId: number | string) {
  await registerSubscriber(chatId, undefined, undefined, "admin");

  const isAdmin = await isAdminUser(chatId);
  if (!isAdmin) {
    return sendMessage(
      chatId,
      `*Access Restricted*\nThis bot is reserved for authorized Thali.com administrators. Send your registered mobile number or contact the administrator.`,
      null,
      ADMIN_BOT_TOKEN
    );
  }

  const msg = `*Thali Admin Management Portal*\n\nSelect an executive action or launch the Admin Mini App:`;
  return sendMessage(chatId, msg, getAdminPanelKeyboard(), ADMIN_BOT_TOKEN);
}

async function handleAdminHeadcount(chatId: number | string, messageId?: number) {
  const today = new Date().toISOString().split("T")[0];

  // Call database stored procedure
  const { data: headcount, error } = await supabase.rpc("get_meal_headcount", { p_service_date: today });

  let headcountMsg = `*Kitchen Attendance Forecast* (${today})\n\n`;

  if (headcount) {
    const l = headcount.lunch || { enrolled: 0, skipped: 0, consumed: 0 };
    const d = headcount.dinner || { enrolled: 0, skipped: 0, consumed: 0 };

    const lunchExpected = Math.max(0, (l.enrolled || 0) - (l.skipped || 0));
    const dinnerExpected = Math.max(0, (d.enrolled || 0) - (d.skipped || 0));

    headcountMsg += `*Lunch:*
• Enrolled: ${l.enrolled || 0}
• Opted Out (Skip): ${l.skipped || 0}
• Expected Headcount: *${lunchExpected}* plates
• Consumed So Far: ${l.consumed || 0}

*Dinner:*
• Enrolled: ${d.enrolled || 0}
• Opted Out (Skip): ${d.skipped || 0}
• Expected Headcount: *${dinnerExpected}* plates
• Consumed So Far: ${d.consumed || 0}`;
  } else {
    headcountMsg += `Headcount RPC error: ${error?.message || "Unavailable"}`;
  }

  const keyboard = {
    inline_keyboard: [
      [{ text: "Refresh Headcount", callback_data: "admin_headcount" }],
      [{ text: "Back to Panel", callback_data: "admin_panel" }]
    ]
  };

  if (messageId) {
    return editMessageText(chatId, messageId, headcountMsg, keyboard, ADMIN_BOT_TOKEN);
  }
  return sendMessage(chatId, headcountMsg, keyboard, ADMIN_BOT_TOKEN);
}

async function handleAdminStatus(chatId: number | string, messageId?: number) {
  const today = new Date().toISOString().split("T")[0];
  const { data: closures } = await supabase
    .from("mess_closures")
    .select("*")
    .eq("service_date", today);

  let statusMsg = `*Current Mess Status* (${today})\n\n`;

  if (!closures || closures.length === 0) {
    statusMsg += `Status: *OPEN AS USUAL*\nAll meal sessions (Breakfast, Lunch, Dinner) are active.`;
  } else {
    statusMsg += `Status: *PARTIAL / FULL CLOSURE*\n`;
    closures.forEach(c => {
      statusMsg += `• *${c.meal_period.toUpperCase()}*: Closed (${c.reason})\n`;
    });
  }

  const keyboard = {
    inline_keyboard: [
      [{ text: "Declare Mess OFF", callback_data: "admin_menu_off" }],
      [{ text: "Reopen Mess", callback_data: "admin_menu_on" }],
      [{ text: "Back to Panel", callback_data: "admin_panel" }]
    ]
  };

  if (messageId) {
    return editMessageText(chatId, messageId, statusMsg, keyboard, ADMIN_BOT_TOKEN);
  }
  return sendMessage(chatId, statusMsg, keyboard, ADMIN_BOT_TOKEN);
}

async function handleAdminClosureToggle(chatId: number | string, isClose: boolean) {
  const today = new Date().toISOString().split("T")[0];

  if (isClose) {
    // Declare all day OFF
    await supabase.from("mess_closures").upsert({
      service_date: today,
      meal_period: "all_day",
      reason: "Holiday / Special Notice",
      closed_by: "Admin Bot"
    }, { onConflict: "service_date,meal_period" });

    // Broadcast to all active subscribers
    const { data: subscribers } = await supabase
      .from("bot_subscribers")
      .select("chat_id")
      .eq("is_active", true);

    const alertText = `*Notice: Mess is Closed Today*\n\nThe mess will remain closed for the entire day (${today}).\nReason: Holiday / Special Notice\n\nNo meal counts will be deducted.`;

    if (subscribers && subscribers.length > 0) {
      for (const s of subscribers) {
        await sendMessage(s.chat_id, alertText, null, MEMBER_BOT_TOKEN);
      }
    }

    return sendMessage(chatId, `Declared Mess OFF for today (${today}). Broadcast sent to ${subscribers?.length || 0} subscribers.`, getAdminPanelKeyboard(), ADMIN_BOT_TOKEN);
  } else {
    // Reopen
    await supabase.from("mess_closures").delete().eq("service_date", today);

    // Broadcast reopening
    const { data: subscribers } = await supabase
      .from("bot_subscribers")
      .select("chat_id")
      .eq("is_active", true);

    const reopenText = `*Notice: Mess is Now Open*\n\nThe mess has reopened for service today (${today}). Regular dining schedules apply.`;

    if (subscribers && subscribers.length > 0) {
      for (const s of subscribers) {
        await sendMessage(s.chat_id, reopenText, null, MEMBER_BOT_TOKEN);
      }
    }

    return sendMessage(chatId, `Mess reopened for today (${today}). Reopening notice sent to ${subscribers?.length || 0} subscribers.`, getAdminPanelKeyboard(), ADMIN_BOT_TOKEN);
  }
}

// -------------------------------------------------------------
// Main Server Handler (Webhook Entrypoint)
// -------------------------------------------------------------

serve(async (req: Request) => {
  const url = new URL(req.url);

  // Health check / verification GET request
  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      status: "online",
      service: "Thali.com Telegram Edge Function",
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const isDedicatedAdmin = url.searchParams.get("bot") === "admin";
    const activeToken = isDedicatedAdmin ? ADMIN_BOT_TOKEN : MEMBER_BOT_TOKEN;

    const update = await req.json();

    // 1. Text Messages & Commands
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat?.id;
      const text = (msg.text || "").trim();
      const username = msg.from?.username || "";
      const firstName = msg.from?.first_name || "";

      // Contact sharing (mobile verification)
      if (msg.contact) {
        const rawPhone = msg.contact.phone_number.replace(/\D/g, "").slice(-10);
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .ilike("phone", `%${rawPhone}%`)
          .maybeSingle();

        if (profile) {
          await supabase.from("profiles").update({
            telegram_chat_id: String(chatId),
            telegram_username: username || null
          }).eq("id", profile.id);

          await sendMessage(
            chatId,
            `*Phone Verified & Linked!*\nWelcome, *${profile.full_name}* (\`${profile.member_number}\`)!`,
            getMemberMainMenuKeyboard(),
            activeToken
          );
        } else {
          await sendMessage(chatId, `Phone number \`${rawPhone}\` was not found in registered members.`, null, activeToken);
        }
        return new Response("OK", { status: 200 });
      }

      if (isDedicatedAdmin) {
        // ADMIN BOT COMMANDS
        if (text.startsWith("/start") || text.startsWith("/panel")) {
          await handleAdminPanel(chatId);
        } else if (text.startsWith("/headcount")) {
          await handleAdminHeadcount(chatId);
        } else if (text.startsWith("/status")) {
          await handleAdminStatus(chatId);
        } else if (text.startsWith("/off")) {
          await handleAdminClosureToggle(chatId, true);
        } else if (text.startsWith("/on")) {
          await handleAdminClosureToggle(chatId, false);
        } else if (text.startsWith("/broadcast")) {
          const broadcastMsg = text.replace("/broadcast", "").trim();
          if (!broadcastMsg) {
            await sendMessage(chatId, "Usage: `/broadcast Your announcement text here`", null, ADMIN_BOT_TOKEN);
          } else {
            const { data: subscribers } = await supabase.from("bot_subscribers").select("chat_id").eq("is_active", true);
            if (subscribers) {
              for (const s of subscribers) {
                await sendMessage(s.chat_id, `*Announcement from Mess Manager:*\n\n${broadcastMsg}`, null, MEMBER_BOT_TOKEN);
              }
            }
            await sendMessage(chatId, `Broadcast sent to ${subscribers?.length || 0} members.`, null, ADMIN_BOT_TOKEN);
          }
        } else {
          await handleAdminPanel(chatId);
        }
      } else {
        // MEMBER BOT COMMANDS
        if (text.startsWith("/start")) {
          const parts = text.split(" ");
          const payload = parts[1]?.trim();
          await handleMemberStart(chatId, username, firstName, payload);
        } else if (text.startsWith("/menu") || text.startsWith("/today")) {
          await handleMemberMenu(chatId);
        } else if (text.startsWith("/pass")) {
          await handleMemberPass(chatId);
        } else if (text.startsWith("/balance")) {
          await handleMemberBalance(chatId);
        } else {
          await handleMemberText(chatId, username, text);
        }
      }
    }

    // 2. Callback Queries (Button Taps)
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      const messageId = cb.message?.message_id;
      const data = cb.data;

      if (isDedicatedAdmin) {
        if (data === "admin_panel") {
          await answerCallbackQuery(cb.id, "", false, ADMIN_BOT_TOKEN);
          await handleAdminPanel(chatId);
        } else if (data === "admin_headcount") {
          await answerCallbackQuery(cb.id, "Refreshing headcount...", false, ADMIN_BOT_TOKEN);
          await handleAdminHeadcount(chatId, messageId);
        } else if (data === "admin_status") {
          await answerCallbackQuery(cb.id, "", false, ADMIN_BOT_TOKEN);
          await handleAdminStatus(chatId, messageId);
        } else if (data === "admin_menu_off") {
          await answerCallbackQuery(cb.id, "Declaring Mess OFF...", false, ADMIN_BOT_TOKEN);
          await handleAdminClosureToggle(chatId, true);
        } else if (data === "admin_menu_on") {
          await answerCallbackQuery(cb.id, "Reopening Mess...", false, ADMIN_BOT_TOKEN);
          await handleAdminClosureToggle(chatId, false);
        }
      } else {
        if (data === "action_menu" || data === "action_back_menu") {
          await answerCallbackQuery(cb.id, "", false, MEMBER_BOT_TOKEN);
          await handleMemberMenu(chatId, messageId);
        } else if (data === "action_pass") {
          await answerCallbackQuery(cb.id, "", false, MEMBER_BOT_TOKEN);
          await handleMemberPass(chatId);
        } else if (data === "action_balance") {
          await answerCallbackQuery(cb.id, "", false, MEMBER_BOT_TOKEN);
          await handleMemberBalance(chatId);
        } else if (data.startsWith("rsvp_")) {
          await handleMemberRsvpCallback(cb);
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err: any) {
    console.error("Webhook execution error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200, // Return 200 to Telegram so it doesn't storm retries on edge errors
      headers: { "Content-Type": "application/json" }
    });
  }
});
