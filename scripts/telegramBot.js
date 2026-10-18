import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

// Load environment variables from .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(rootDir, '.env');
const dataDir = path.resolve(rootDir, 'data');
const linksFilePath = path.resolve(dataDir, 'telegram_links.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Helper: Read persistent telegram links
function readTelegramLinks() {
  try {
    if (fs.existsSync(linksFilePath)) {
      const raw = fs.readFileSync(linksFilePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading telegram_links.json:', err.message);
  }
  return {};
}

// Helper: Save persistent telegram link
function saveTelegramLink(chatId, profile, username = '') {
  try {
    const links = readTelegramLinks();
    links[String(chatId)] = {
      memberId: profile.id,
      memberNumber: profile.member_number,
      fullName: profile.full_name,
      phone: profile.phone,
      username: username || '',
      linkedAt: new Date().toISOString()
    };
    fs.writeFileSync(linksFilePath, JSON.stringify(links, null, 2), 'utf-8');
    console.log(`✅ Stored persistent link: Chat ${chatId} -> ${profile.full_name} (${profile.member_number})`);
  } catch (err) {
    console.error('Error saving telegram_links.json:', err.message);
  }
}

const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      env[key] = val;
    }
  }
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://ooqtmpnasgricxreqzbb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN is missing in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Helper: Call Telegram API
async function callTelegram(method, payload = {}) {
  try {
    const res = await fetch(`${TELEGRAM_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram API error on ${method}:`, err.message);
    return null;
  }
}

// Helper: Send Text Message
async function sendMessage(chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown'
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }
  return callTelegram('sendMessage', payload);
}

// Helper: Send Photo (QR Code Buffer)
async function sendPhotoBuffer(chatId, buffer, caption = '') {
  try {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');
    const blob = new Blob([buffer], { type: 'image/png' });
    formData.append('photo', blob, 'pass_qr.png');

    const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: 'POST',
      body: formData
    });
    return await res.json();
  } catch (err) {
    console.error('Error sending photo:', err.message);
  }
}

// Helper: Answer Callback Query
async function answerCallbackQuery(callbackQueryId, text = '') {
  return callTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text
  });
}

// Helper: Find member by telegram_chat_id (Local Store first, fallback to Supabase column)
async function getMemberByChatId(chatId) {
  const links = readTelegramLinks();
  const linked = links[String(chatId)];

  if (linked?.memberId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', linked.memberId)
      .maybeSingle();

    if (profile) return profile;
  }

  // Fallback to Supabase column check
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_chat_id', String(chatId))
      .maybeSingle();

    if (data) return data;
  } catch {
    // Column may not exist in older migration, ignore
  }

  return null;
}

// Helper: Get local date string YYYY-MM-DD (Asia/Kolkata)
function getTodayDateString() {
  const now = new Date();
  const kolkataOffset = 5.5 * 60 * 60 * 1000;
  const kolkataTime = new Date(now.getTime() + kolkataOffset);
  return kolkataTime.toISOString().split('T')[0];
}

// Standard Fallback Menus
const FALLBACK_MENUS = {
  breakfast: 'Indori Poha with Sev, Sprouted Moong Salad, Adrak Masala Chai, Fresh Banana',
  lunch: 'Paneer Butter Masala, Yellow Dal Tadka, Fresh Tawa Phulkas, Jeera Rice & Boondi Raita',
  dinner: 'Shahi Malai Kofta Curry, Dal Fry with Ghee, Garma-Garam Phulkas, Hot Gulab Jamun'
};

// Main Action Buttons Keyboard
function getMemberMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🍛 Today\'s Menu & RSVP', callback_data: 'action_menu' }
      ],
      [
        { text: '🎫 My Digital QR Pass', callback_data: 'action_pass' },
        { text: '💳 Check Balance', callback_data: 'action_balance' }
      ]
    ]
  };
}

// Helper: Ask user to confirm their account before linking
async function askConfirmationToLink(chatId, profile) {
  const confirmMsg = `🔍 *Account Mil Gaya!*

👤 *Name:* ${profile.full_name}
🆔 *Member ID:* \`${profile.member_number}\`
📱 *Phone:* \`+91 ${profile.phone || 'N/A'}\`

Kya yeh aapka hi account hai? Neeche button par tap karke confirm karein:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Haan, Yeh Mera Account Hai', callback_data: `confirm_link_${profile.id}` }
      ],
      [
        { text: '❌ Nahi, Yeh Galat Hai', callback_data: 'cancel_link' }
      ]
    ]
  };

  return sendMessage(chatId, confirmMsg, keyboard);
}

// Helper: Actually link a profile to this chatId
async function linkProfileToChat(chatId, username, profile, messageId = null) {
  // 1. Save locally for 100% reliability
  saveTelegramLink(chatId, profile, username);

  // 2. Try to update Supabase if column exists
  try {
    await supabase
      .from('profiles')
      .update({
        telegram_chat_id: String(chatId),
        telegram_username: username || ''
      })
      .eq('id', profile.id);
  } catch (err) {
    console.warn('Note: Could not update telegram_chat_id on Supabase (local store used):', err.message);
  }

  const welcomeMsg = `🎉 *Shabaash! Account Successfully Linked!*

Welcome, *${profile.full_name}* (\`${profile.member_number}\`)!
Aapka Thali.com pass iss chat se connect ho gaya hai.

Neeche diye gaye buttons se aap menu dekh sakte hain aur attendance mark kar sakte hain:`;

  if (messageId) {
    return editMessageText(chatId, messageId, welcomeMsg, getMemberMainMenuKeyboard());
  }

  return sendMessage(chatId, welcomeMsg, getMemberMainMenuKeyboard());
}

// Handler: /start command
async function handleStart(chatId, username, text) {
  const parts = text.split(' ');
  const payload = parts[1]?.trim(); // e.g. /start M_112 or /start M-112 or /start 9174222385

  if (payload) {
    const cleanNumber = payload.replace('_', '-').toUpperCase();
    const phoneDigits = payload.replace(/\D/g, '');

    let query = supabase.from('profiles').select('*');
    if (cleanNumber.startsWith('M-') || cleanNumber.startsWith('M')) {
      query = query.ilike('member_number', cleanNumber);
    } else if (phoneDigits.length === 10) {
      query = query.eq('phone', phoneDigits);
    } else {
      query = query.ilike('member_number', cleanNumber);
    }

    const { data: profile } = await query.maybeSingle();

    if (profile) {
      // Ask confirmation!
      return askConfirmationToLink(chatId, profile);
    }
  }

  // Check if user already linked
  const existing = await getMemberByChatId(chatId);
  if (existing) {
    const msg = `👋 Welcome back, *${existing.full_name}* (\`${existing.member_number}\`)!

Aap kya karna chahte hain?`;

    return sendMessage(chatId, msg, getMemberMainMenuKeyboard());
  }

  // Not linked yet: Show friendly prompt with 1-tap phone share button
  const linkHelpMsg = `👋 *Namaste! Welcome to Thali.com Mess Bot*

Apna dining pass connect karne ke liye neeche diye gaye button par tap karein:

1️⃣ Neeche **"📱 Share Phone to Quick-Link"** par tap karein
2️⃣ Ya apna **Member ID** (jaise \`M-112\`) likh kar bhejein
3️⃣ Ya apna **10-digit Phone Number** likh kar bhejein`;

  const requestPhoneKeyboard = {
    keyboard: [
      [{ text: '📱 Share Phone to Quick-Link', request_contact: true }]
    ],
    resize_keyboard: true,
    one_time_keyboard: true
  };

  return sendMessage(chatId, linkHelpMsg, requestPhoneKeyboard);
}

// Handler: Text message for account linking lookup
async function handleTextLookup(chatId, username, text) {
  // If user already linked, reply with main menu
  const existing = await getMemberByChatId(chatId);
  if (existing) {
    return sendMessage(chatId, `👋 Hi *${existing.full_name}*! Neeche diye gaye menu se select karein:`, getMemberMainMenuKeyboard());
  }

  const clean = text.trim();
  const phoneDigits = clean.replace(/\D/g, '').slice(-10);

  let query = supabase.from('profiles').select('*');

  if (clean.toUpperCase().startsWith('M-') || clean.toUpperCase().startsWith('M')) {
    const formattedNum = clean.toUpperCase().includes('-') ? clean.toUpperCase() : `M-${clean.slice(1)}`;
    query = query.ilike('member_number', formattedNum);
  } else if (phoneDigits.length === 10) {
    query = query.eq('phone', phoneDigits);
  } else if (clean.includes('@')) {
    query = query.ilike('email', clean);
  } else {
    // Try searching full_name
    query = query.ilike('full_name', `%${clean}%`);
  }

  const { data: profile } = await query.maybeSingle();
  if (profile) {
    // Ask confirmation before linking!
    return askConfirmationToLink(chatId, profile);
  } else {
    return sendMessage(chatId, `❌ \`${clean}\` ke liye koi account nahi mila.\n\nKripya apna sahi Member ID jaise \`M-112\` ya registered mobile number bhejein.`);
  }
}

// Handler: Contact shared via Telegram native button or attachment
async function handleContact(chatId, username, contact) {
  let phone = (contact.phone_number || '').replace(/\D/g, '').slice(-10);

  if (!phone) {
    return sendMessage(chatId, `⚠️ Phone number read nahi ho paya. Kripya apna Member ID (jaise \`M-112\`) type karein.`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (profile) {
    // Ask confirmation!
    return askConfirmationToLink(chatId, profile);
  } else {
    return sendMessage(chatId, `❌ Phone \`+91 ${phone}\` ke sath koi account registered nahi mila.\n\nKripya apna Member Number (jaise \`M-112\`) likh kar bhejein.`);
  }
}

// Handler: /menu command
async function handleMenu(chatId) {
  const today = getTodayDateString();
  const { data: menus } = await supabase
    .from('menus')
    .select('*, items:menu_items(*)')
    .eq('service_date', today);

  let lunchText = FALLBACK_MENUS.lunch;
  let dinnerText = FALLBACK_MENUS.dinner;
  let breakfastText = FALLBACK_MENUS.breakfast;

  if (menus && menus.length > 0) {
    const bMenu = menus.find(m => m.meal_period === 'breakfast');
    if (bMenu?.items?.length) breakfastText = bMenu.items.map(i => i.name).join(', ');

    const lMenu = menus.find(m => m.meal_period === 'lunch');
    if (lMenu?.items?.length) lunchText = lMenu.items.map(i => i.name).join(', ');

    const dMenu = menus.find(m => m.meal_period === 'dinner');
    if (dMenu?.items?.length) dinnerText = dMenu.items.map(i => i.name).join(', ');
  }

  const menuMsg = `🍛 *Today's Mess Menu* (${today})

🌅 *Breakfast (07:30 AM – 10:30 AM)*
${breakfastText.split(', ').map(i => `• ${i}`).join('\n')}

☀️ *Lunch (12:30 PM – 03:30 PM)*
${lunchText.split(', ').map(i => `• ${i}`).join('\n')}

🌙 *Dinner (07:30 PM – 10:30 PM)*
${dinnerText.split(', ').map(i => `• ${i}`).join('\n')}

_Neeche diye gaye buttons se apni attendance mark karein:_`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Coming for Lunch', callback_data: 'rsvp_attend_lunch' },
        { text: '❌ Skip Lunch', callback_data: 'rsvp_skip_lunch' }
      ],
      [
        { text: '✅ Coming for Dinner', callback_data: 'rsvp_attend_dinner' },
        { text: '❌ Skip Dinner', callback_data: 'rsvp_skip_dinner' }
      ]
    ]
  };

  return sendMessage(chatId, menuMsg, keyboard);
}

// Handler: /pass command (Generates QR Code Image and sends to Telegram)
async function handlePass(chatId) {
  const member = await getMemberByChatId(chatId);
  if (!member) {
    return sendMessage(chatId, `⚠️ Pehle account link karein! Apna Member ID (jaise \`M-112\`) bhejein.`);
  }

  const token = member.qr_token || `QR_MEM_${member.member_number}`;
  const qrBuffer = await QRCode.toBuffer(token, {
    width: 400,
    margin: 2,
    color: {
      dark: '#0d253d',
      light: '#ffffff'
    }
  });

  const caption = `🎫 *Your Digital Thali.com Pass*
👤 *Member:* ${member.full_name} (\`${member.member_number}\`)
🔑 *Token:* \`${token}\`

📱 Counter receptionist ya scanner par yeh QR code dikhayein!`;

  return sendPhotoBuffer(chatId, qrBuffer, caption);
}

// Handler: /balance command
async function handleBalance(chatId) {
  const member = await getMemberByChatId(chatId);
  if (!member) {
    return sendMessage(chatId, `⚠️ Pehle account link karein! Apna Member ID (jaise \`M-112\`) bhejein.`);
  }

  // Get active subscription
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('member_id', member.id)
    .order('created_at', { ascending: false });

  const activeSub = (subs || []).find(s => s.status === 'active') || subs?.[0];

  let remaining = 53;
  let expiryStr = 'In 28 days';

  if (activeSub) {
    const { data: txs } = await supabase
      .from('meal_transactions')
      .select('meal_delta')
      .eq('subscription_id', activeSub.id)
      .eq('status', 'accepted');

    const consumed = (txs || []).reduce((sum, t) => sum + (t.meal_delta || 0), 0);
    remaining = Math.max(0, activeSub.meals_granted + consumed);
    if (activeSub.expires_at) {
      expiryStr = new Date(activeSub.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  const balanceMsg = `💳 *Meal Pass Balance*

👤 *Member:* ${member.full_name} (\`${member.member_number}\`)
🍛 *Meals Remaining:* *${remaining} Meals*
📅 *Plan Expiry:* ${expiryStr}
🔄 *Status:* ${activeSub?.status === 'active' ? '🟢 Active Plan' : '🟡 ' + (activeSub?.status || 'Active')}

_Roz attendance mark karein taaki kitchen mein khana waste na ho._`;

  return sendMessage(chatId, balanceMsg, getMemberMainMenuKeyboard());
}

// Handler: Callback Queries (Inline Button Taps)
async function handleCallbackQuery(cbQuery) {
  const chatId = cbQuery.message?.chat?.id;
  const data = cbQuery.data;

  const messageId = cbQuery.message?.message_id;
  await answerCallbackQuery(cbQuery.id);

  // Handle Account Confirmation
  if (data.startsWith('confirm_link_')) {
    const profileId = data.replace('confirm_link_', '');
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    if (profile) {
      return linkProfileToChat(chatId, cbQuery.from?.username, profile, messageId);
    }
  }

  if (data === 'cancel_link') {
    return editMessageText(chatId, messageId, `Koi baat nahi! Aap apna sahi Member ID (jaise \`M-112\`) ya registered mobile number type karke bhejein.`);
  }

  if (data === 'action_menu') {
    return handleMenu(chatId);
  }
  if (data === 'action_pass') {
    return handlePass(chatId);
  }
  if (data === 'action_balance') {
    return handleBalance(chatId);
  }
  if (data === 'action_rsvp') {
    return handleMenu(chatId);
  }

  // Handle RSVP: Attend or Skip
  if (data.startsWith('rsvp_')) {
    const member = await getMemberByChatId(chatId);
    if (!member) {
      return sendMessage(chatId, `⚠️ Pehle account link karein! Apna Member ID (jaise \`M-112\`) bhejein.`);
    }

    const isSkip = data.includes('skip');
    const period = data.includes('dinner') ? 'dinner' : 'lunch';
    const today = getTodayDateString();

    try {
      if (isSkip) {
        // Upsert skip
        const { error } = await supabase
          .from('meal_skips')
          .upsert(
            {
              member_id: member.id,
              service_date: today,
              meal_period: period,
              reason: 'Marked Not Coming via Telegram Bot'
            },
            { onConflict: 'member_id,service_date,meal_period' }
          );

        if (error) throw error;

        const reply = `❌ *Marked NOT COMING for ${period.toUpperCase()} today!*

Kitchen headcount update ho gaya hai: aapki plate nahi banegi, aur khana waste hone se bach gaya! Aapka meal balance safe hai. 🙌`;

        return sendMessage(chatId, reply);
      } else {
        // Cancel skip (attending)
        const { error } = await supabase
          .from('meal_skips')
          .delete()
          .eq('member_id', member.id)
          .eq('service_date', today)
          .eq('meal_period', period);

        if (error) throw error;

        const reply = `✅ *Marked ATTENDING for ${period.toUpperCase()} today!*

Kitchen ko notification chala gaya. Mess mein milte hain! 🍛`;

        return sendMessage(chatId, reply);
      }
    } catch (err) {
      console.error('Error updating skip from bot:', err);
      return sendMessage(chatId, `⚠️ RSVP update nahi ho paya (${err.message}). Kripya web app par mark karein.`);
    }
  }
}

// Main Polling Loop
let lastUpdateId = 0;

async function pollUpdates() {
  try {
    const res = await callTelegram(`getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
    if (res?.ok && Array.isArray(res.result)) {
      for (const update of res.result) {
        lastUpdateId = update.update_id;
        console.log(`📩 Incoming update #${update.update_id}:`, JSON.stringify(update));

        // Message event
        if (update.message) {
          const msg = update.message;
          const chatId = msg.chat?.id;
          const username = msg.from?.username;
          const text = (msg.text || '').trim();

          // If user shared contact (either button or attachment)
          if (msg.contact) {
            console.log(`📱 Contact received from chat ${chatId}:`, msg.contact.phone_number);
            await handleContact(chatId, username, msg.contact);
          } else if (text.startsWith('/start')) {
            await handleStart(chatId, username, text);
          } else if (text.startsWith('/menu')) {
            await handleMenu(chatId);
          } else if (text.startsWith('/rsvp')) {
            await handleMenu(chatId);
          } else if (text.startsWith('/pass')) {
            await handlePass(chatId);
          } else if (text.startsWith('/balance')) {
            await handleBalance(chatId);
          } else if (text.startsWith('/')) {
            await sendMessage(chatId, `🤖 Commands:\n/menu - Today's menu\n/pass - View QR pass\n/balance - Meal balance\n/rsvp - Mark Attendance`);
          } else {
            await handleTextLookup(chatId, username, text);
          }
        }

        // Button callback event
        if (update.callback_query) {
          console.log(`🔘 Button tap from chat ${update.callback_query.message?.chat?.id}:`, update.callback_query.data);
          await handleCallbackQuery(update.callback_query);
        }
      }
    }
  } catch (err) {
    console.error('Polling error:', err.message);
  }

  // Continue loop
  setTimeout(pollUpdates, 500);
}

// Start Bot Service
async function start() {
  console.log('🤖 Connecting to Telegram Bot API...');
  const me = await callTelegram('getMe');
  if (me?.ok) {
    console.log(`✅ Telegram Bot Online: @${me.result.username} (${me.result.first_name})`);
    console.log(`📡 Listening for live updates from Telegram with Member Confirmation Flow...`);
    pollUpdates();
  } else {
    console.error('❌ Failed to connect to Telegram:', me);
  }
}

start();
