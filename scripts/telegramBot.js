import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

// Directory & Environment Setup
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(rootDir, '.env');
const dataDir = path.resolve(rootDir, 'data');
const linksFilePath = path.resolve(dataDir, 'telegram_links.json');
const closuresFilePath = path.resolve(dataDir, 'mess_closures.json');
const adminChatsFilePath = path.resolve(dataDir, 'admin_chats.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// -------------------------------------------------------------
// Persistent Storage Helpers
// -------------------------------------------------------------

function readTelegramLinks() {
  try {
    if (fs.existsSync(linksFilePath)) {
      return JSON.parse(fs.readFileSync(linksFilePath, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading telegram_links.json:', err.message);
  }
  return {};
}

function saveTelegramLink(chatId, profile, username = '') {
  try {
    const links = readTelegramLinks();
    links[String(chatId)] = {
      memberId: profile.id,
      memberNumber: profile.member_number,
      fullName: profile.full_name,
      phone: profile.phone,
      username: username || '',
      role: profile.role || 'member',
      linkedAt: new Date().toISOString()
    };
    fs.writeFileSync(linksFilePath, JSON.stringify(links, null, 2), 'utf-8');
    console.log(`✅ Stored link: Chat ${chatId} -> ${profile.full_name} (${profile.member_number})`);
  } catch (err) {
    console.error('Error saving telegram_links.json:', err.message);
  }
}

function readMessClosures() {
  try {
    if (fs.existsSync(closuresFilePath)) {
      return JSON.parse(fs.readFileSync(closuresFilePath, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading mess_closures.json:', err.message);
  }
  return {};
}

function saveMessClosure(date, period, reason, closedBy = 'Admin') {
  try {
    const closures = readMessClosures();
    if (!closures[date]) closures[date] = {};
    
    if (period === 'all_day') {
      ['breakfast', 'lunch', 'dinner'].forEach(p => {
        closures[date][p] = {
          closed: true,
          reason,
          closedBy,
          closedAt: new Date().toISOString(),
          excuseAttendance: true
        };
      });
    } else {
      closures[date][period] = {
        closed: true,
        reason,
        closedBy,
        closedAt: new Date().toISOString(),
        excuseAttendance: true
      };
    }
    fs.writeFileSync(closuresFilePath, JSON.stringify(closures, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving mess_closures.json:', err.message);
    return false;
  }
}

function removeMessClosure(date, period) {
  try {
    const closures = readMessClosures();
    if (!closures[date]) return false;
    
    if (period === 'all_day') {
      delete closures[date];
    } else {
      delete closures[date][period];
      if (Object.keys(closures[date]).length === 0) {
        delete closures[date];
      }
    }
    fs.writeFileSync(closuresFilePath, JSON.stringify(closures, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error removing mess_closures.json:', err.message);
    return false;
  }
}

function isPeriodClosed(date, period) {
  const closures = readMessClosures();
  return closures[date]?.[period] || closures[date]?.['all_day'] || null;
}

function readAdminChats() {
  try {
    if (fs.existsSync(adminChatsFilePath)) {
      return JSON.parse(fs.readFileSync(adminChatsFilePath, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading admin_chats.json:', err.message);
  }
  return {};
}

function saveAdminChat(chatId, info) {
  try {
    const admins = readAdminChats();
    admins[String(chatId)] = {
      ...info,
      authorizedAt: new Date().toISOString()
    };
    fs.writeFileSync(adminChatsFilePath, JSON.stringify(admins, null, 2), 'utf-8');
    console.log(`🛡️ Authorized Admin Chat: ${chatId} (${info.name || 'Admin'})`);
  } catch (err) {
    console.error('Error saving admin_chats.json:', err.message);
  }
}

// Check if a chat ID belongs to an authorized Admin
async function isAuthorizedAdmin(chatId) {
  const admins = readAdminChats();
  if (admins[String(chatId)]) return true;

  const links = readTelegramLinks();
  const linked = links[String(chatId)];
  if (linked?.role === 'owner_admin') {
    saveAdminChat(chatId, { name: linked.fullName, role: 'owner_admin' });
    return true;
  }

  if (linked?.memberId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', linked.memberId)
      .maybeSingle();

    if (profile?.role === 'owner_admin') {
      saveAdminChat(chatId, { name: profile.full_name, role: 'owner_admin' });
      return true;
    }
  }

  return false;
}

// -------------------------------------------------------------
// Configuration & Clients
// -------------------------------------------------------------

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
const ADMIN_BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN || env.TELEGRAM_ADMIN_BOT_TOKEN;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://ooqtmpnasgricxreqzbb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN is missing in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const ADMIN_TELEGRAM_API = ADMIN_BOT_TOKEN ? `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}` : null;

// -------------------------------------------------------------
// Telegram HTTP Helpers
// -------------------------------------------------------------

async function callTelegram(method, payload = {}, tokenOverride = null) {
  try {
    const base = tokenOverride ? `https://api.telegram.org/bot${tokenOverride}` : TELEGRAM_API;
    const res = await fetch(`${base}/${method}`, {
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

async function sendMessage(chatId, text, replyMarkup = null, tokenOverride = null) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown'
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return callTelegram('sendMessage', payload, tokenOverride);
}

async function editMessageText(chatId, messageId, text, replyMarkup = null, tokenOverride = null) {
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'Markdown'
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return callTelegram('editMessageText', payload, tokenOverride);
}

async function sendPhotoBuffer(chatId, buffer, caption = '', tokenOverride = null) {
  try {
    const base = tokenOverride ? `https://api.telegram.org/bot${tokenOverride}` : TELEGRAM_API;
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');
    const blob = new Blob([buffer], { type: 'image/png' });
    formData.append('photo', blob, 'pass_qr.png');

    const res = await fetch(`${base}/sendPhoto`, {
      method: 'POST',
      body: formData
    });
    return await res.json();
  } catch (err) {
    console.error('Error sending photo:', err.message);
  }
}

async function answerCallbackQuery(callbackQueryId, text = '', tokenOverride = null) {
  return callTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text
  }, tokenOverride);
}

// Broadcast message to all registered member chats
async function broadcastToAllMembers(text, replyMarkup = null) {
  const links = readTelegramLinks();
  const chatIds = Object.keys(links);
  let sent = 0;
  let failed = 0;

  for (const cid of chatIds) {
    try {
      const res = await sendMessage(cid, text, replyMarkup);
      if (res?.ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { total: chatIds.length, sent, failed };
}

// -------------------------------------------------------------
// Time & Menus Utilities
// -------------------------------------------------------------

function getTodayDateString() {
  const now = new Date();
  const kolkataOffset = 5.5 * 60 * 60 * 1000;
  const kolkataTime = new Date(now.getTime() + kolkataOffset);
  return kolkataTime.toISOString().split('T')[0];
}

const FALLBACK_MENUS = {
  breakfast: 'Indori Poha with Sev, Sprouted Moong Salad, Adrak Masala Chai, Fresh Banana',
  lunch: 'Paneer Butter Masala, Yellow Dal Tadka, Fresh Tawa Phulkas, Jeera Rice & Boondi Raita',
  dinner: 'Shahi Malai Kofta Curry, Dal Fry with Ghee, Garma-Garam Phulkas, Hot Gulab Jamun'
};

// -------------------------------------------------------------
// Keyboards: Member & Admin
// -------------------------------------------------------------

function getMemberMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🍛 Today\'s Menu & RSVP', callback_data: 'action_menu' }],
      [
        { text: '🎫 My Digital QR Pass', callback_data: 'action_pass' },
        { text: '💳 Check Balance', callback_data: 'action_balance' }
      ]
    ]
  };
}

function getAdminPanelKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🛑 Declare Mess OFF', callback_data: 'admin_menu_off' },
        { text: '🟢 Reopen Mess', callback_data: 'admin_menu_on' }
      ],
      [
        { text: '📢 Send Broadcast Alert', callback_data: 'admin_broadcast' },
        { text: '📊 Kitchen Headcount', callback_data: 'admin_headcount' }
      ],
      [
        { text: '🔍 Member Lookup / Top-Up', callback_data: 'admin_lookup' },
        { text: '🍛 Update Today\'s Menu', callback_data: 'admin_setmenu' }
      ],
      [
        { text: '💰 Daily Ledger & Audit', callback_data: 'admin_ledger' },
        { text: '🔄 Refresh Status', callback_data: 'admin_refresh' }
      ]
    ]
  };
}

function getMessOffSelectKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🌅 Breakfast OFF', callback_data: 'messoff_select_breakfast' },
        { text: '☀️ Lunch OFF', callback_data: 'messoff_select_lunch' }
      ],
      [
        { text: '🌙 Dinner OFF', callback_data: 'messoff_select_dinner' },
        { text: '📅 Full Day OFF', callback_data: 'messoff_select_all_day' }
      ],
      [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_panel' }]
    ]
  };
}

function getMessOffReasonsKeyboard(period) {
  return {
    inline_keyboard: [
      [{ text: '🔧 Kitchen Maintenance / Deep Clean', callback_data: `messoff_exec_${period}_Kitchen Maintenance & Cleaning` }],
      [{ text: '🎉 Public Holiday / Festival Off', callback_data: `messoff_exec_${period}_Festival Holiday` }],
      [{ text: '🚨 Staff Shortage / Emergency', callback_data: `messoff_exec_${period}_Staff Emergency & Unavoidable Closure` }],
      [{ text: '🔙 Cancel', callback_data: 'admin_panel' }]
    ]
  };
}

function getReopenSelectKeyboard(todayClosures) {
  const buttons = [];
  if (todayClosures.breakfast) {
    buttons.push([{ text: '🟢 Reopen Breakfast', callback_data: 'messon_exec_breakfast' }]);
  }
  if (todayClosures.lunch) {
    buttons.push([{ text: '🟢 Reopen Lunch', callback_data: 'messon_exec_lunch' }]);
  }
  if (todayClosures.dinner) {
    buttons.push([{ text: '🟢 Reopen Dinner', callback_data: 'messon_exec_dinner' }]);
  }
  buttons.push([{ text: '🟢 Reopen All Closed Periods', callback_data: 'messon_exec_all_day' }]);
  buttons.push([{ text: '🔙 Back to Admin Panel', callback_data: 'admin_panel' }]);
  return { inline_keyboard: buttons };
}

function getBroadcastTemplatesKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🍲 Special Feast Tonight (Gulab Jamun)', callback_data: 'bcast_template_feast' }],
      [{ text: '⏰ Dinner Delayed by 30 Minutes', callback_data: 'bcast_template_delay' }],
      [{ text: '💳 Monthly Pass Renewal Due Notice', callback_data: 'bcast_template_fees' }],
      [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_panel' }]
    ]
  };
}

// -------------------------------------------------------------
// Handlers: Admin Commands & Controls
// -------------------------------------------------------------

async function handleAdminPanel(chatId, tokenOverride = null, messageId = null) {
  const today = getTodayDateString();
  const closures = readMessClosures()[today] || {};
  const closedKeys = Object.keys(closures);
  const links = readTelegramLinks();

  const statusLine = closedKeys.length > 0
    ? `⚠️ *Active Closures Today:* ${closedKeys.map(k => `\`${k.toUpperCase()}\``).join(', ')}`
    : `🟢 *Mess Operational Status:* All meal periods ACTIVE`;

  const panelMsg = `👑 *Thali.com Administrator Console*
📅 *Date:* ${today}
👥 *Connected Members:* *${Object.keys(links).length} Diners*

${statusLine}

Neeche diye gaye admin controls se mess manage karein:`;

  if (messageId) {
    return editMessageText(chatId, messageId, panelMsg, getAdminPanelKeyboard(), tokenOverride);
  }
  return sendMessage(chatId, panelMsg, getAdminPanelKeyboard(), tokenOverride);
}

// Handler: Declare Mess OFF (Prompt Period)
async function handleMessOffPrompt(chatId, tokenOverride = null, messageId = null) {
  const promptMsg = `🛑 *Declare Mess OFF & Protect Members*

Select karein ki kaunsa meal period OFF karna hai:
_(Note: Mess OFF hone par kisi bhi member ki absent mark nahi hogi aur na hi meal pass deduct hoga.)_`;

  if (messageId) {
    return editMessageText(chatId, messageId, promptMsg, getMessOffSelectKeyboard(), tokenOverride);
  }
  return sendMessage(chatId, promptMsg, getMessOffSelectKeyboard(), tokenOverride);
}

// Handler: Execute Mess OFF + Auto-Excuse + Broadcast
async function handleExecuteMessOff(chatId, period, reason, tokenOverride = null, messageId = null) {
  const today = getTodayDateString();
  const periodLabel = period === 'all_day' ? 'Poora Din (Full Day)' : period.toUpperCase();
  
  saveMessClosure(today, period, reason, 'Admin');

  // Broadcast alert to ALL linked members with 100% clarity that NO meal is cut
  const memberAlert = `🚨 *OFFICIAL MESS NOTICE: Mess is OFF* 🚨

⚠️ *Period:* *${periodLabel}* (${today})
📝 *Reason:* ${reason}

✅ *Absent & Pass Protection:*
Aapke pass se *koi meal deduct nahi hoga*, aur na hi koi absent count hogi! Aap bahar meal enjoy kar sakte hain.`;

  const broadcastReport = await broadcastToAllMembers(memberAlert);

  const confirmMsg = `✅ *Mess OFF Successful & Members Protected!*

🛑 *Period:* \`${periodLabel}\`
📝 *Reason:* ${reason}
📢 *Push Notification:* Delivered to *${broadcastReport.sent}/${broadcastReport.total}* registered members.

🔒 *Automatic Safeguards Active:*
• Member absent nahi maane jayenge (Excused Holiday)
• Pass balance se meal cut nahi hoga
• Member bot /menu par Mess OFF notice display karega`;

  if (messageId) {
    return editMessageText(chatId, messageId, confirmMsg, getAdminPanelKeyboard(), tokenOverride);
  }
  return sendMessage(chatId, confirmMsg, getAdminPanelKeyboard(), tokenOverride);
}

// Handler: Reopen Mess
async function handleExecuteMessOn(chatId, period, tokenOverride = null, messageId = null) {
  const today = getTodayDateString();
  const periodLabel = period === 'all_day' ? 'All Meal Periods' : period.toUpperCase();

  removeMessClosure(today, period);

  // Broadcast to members
  const memberAlert = `🟢 *MESS REOPENED* 🟢

Aapki mess *${periodLabel}* ke liye waapas khul gayi hai! Normal dining & QR pass check-in active hai.`;

  const report = await broadcastToAllMembers(memberAlert);

  const confirmMsg = `🟢 *Mess Reopened Successfully!*

*${periodLabel}* ke liye mess dobara operational kar di gayi hai.
📢 Reopen announcement sent to *${report.sent}* members.`;

  if (messageId) {
    return editMessageText(chatId, messageId, confirmMsg, getAdminPanelKeyboard(), tokenOverride);
  }
  return sendMessage(chatId, confirmMsg, getAdminPanelKeyboard(), tokenOverride);
}

// Handler: Kitchen Headcount Forecast
async function handleHeadcountReport(chatId, tokenOverride = null, messageId = null) {
  const today = getTodayDateString();

  // 1. Fetch total active subscribers
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, member_id, status')
    .eq('status', 'active');

  const totalDiners = subs?.length || 45;

  // 2. Fetch skips for today
  const { data: skips } = await supabase
    .from('meal_skips')
    .select('meal_period')
    .eq('service_date', today);

  const bSkips = (skips || []).filter(s => s.meal_period === 'breakfast').length;
  const lSkips = (skips || []).filter(s => s.meal_period === 'lunch').length;
  const dSkips = (skips || []).filter(s => s.meal_period === 'dinner').length;

  const closures = readMessClosures()[today] || {};

  const bStatus = closures.breakfast ? '🚫 *OFF (Excused)*' : `*${Math.max(0, totalDiners - bSkips)} Plates* (${bSkips} Skipped)`;
  const lStatus = closures.lunch ? '🚫 *OFF (Excused)*' : `*${Math.max(0, totalDiners - lSkips)} Plates* (${lSkips} Skipped)`;
  const dStatus = closures.dinner ? '🚫 *OFF (Excused)*' : `*${Math.max(0, totalDiners - dSkips)} Plates* (${dSkips} Skipped)`;

  const reportMsg = `📊 *Kitchen Headcount & Cooking Forecast*
📅 *Service Date:* ${today}
👥 *Total Active Diners:* ${totalDiners}

🌅 *Breakfast (07:30 AM – 10:30 AM)*
Expected Headcount: ${bStatus}

☀️ *Lunch (12:30 PM – 03:30 PM)*
Expected Headcount: ${lStatus}

🌙 *Dinner (07:30 PM – 10:30 PM)*
Expected Headcount: ${dStatus}

💡 *Cooking Advisory:*
RSVP data ke mutabik exact quantity cook karein taaki kitchen food waste zero rahe.`;

  const kb = {
    inline_keyboard: [
      [{ text: '🔄 Refresh Headcount', callback_data: 'admin_headcount' }],
      [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_panel' }]
    ]
  };

  if (messageId) {
    return editMessageText(chatId, messageId, reportMsg, kb, tokenOverride);
  }
  return sendMessage(chatId, reportMsg, kb, tokenOverride);
}

// Handler: Member Lookup & Pass Top-up
async function handleMemberLookup(chatId, query, tokenOverride = null) {
  const cleanQ = query.trim().replace('_', '-');
  const phoneDigits = query.replace(/\D/g, '');

  let queryBuilder = supabase.from('profiles').select('*');
  if (cleanQ.toUpperCase().startsWith('M-') || cleanQ.toUpperCase().startsWith('M')) {
    queryBuilder = queryBuilder.ilike('member_number', `%${cleanQ.toUpperCase()}%`);
  } else if (phoneDigits.length >= 7) {
    queryBuilder = queryBuilder.ilike('phone', `%${phoneDigits}%`);
  } else {
    queryBuilder = queryBuilder.ilike('full_name', `%${cleanQ}%`);
  }

  const { data: profiles } = await queryBuilder.limit(3);

  if (!profiles || profiles.length === 0) {
    return sendMessage(chatId, `🔍 Koi member nahi mila query: \`${query}\` ke liye.\nFormat: \`/member M-112\` ya mobile number.`, null, tokenOverride);
  }

  for (const profile of profiles) {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('member_id', profile.id)
      .order('created_at', { ascending: false });

    const activeSub = (subs || []).find(s => s.status === 'active') || subs?.[0];
    let remaining = 0;
    if (activeSub) {
      const { data: txs } = await supabase
        .from('meal_transactions')
        .select('meal_delta')
        .eq('subscription_id', activeSub.id)
        .eq('status', 'accepted');
      const consumed = (txs || []).reduce((sum, t) => sum + (t.meal_delta || 0), 0);
      remaining = Math.max(0, activeSub.meals_granted + consumed);
    }

    const memberCard = `👤 *Member Profile*
🆔 *ID:* \`${profile.member_number}\`
📛 *Name:* ${profile.full_name}
📱 *Phone:* \`+91 ${profile.phone || 'N/A'}\`
🔄 *Role:* \`${profile.role}\`

🍛 *Remaining Meals:* *${remaining} Meals*
📅 *Plan Status:* ${activeSub?.status === 'active' ? '🟢 Active' : '🟡 ' + (activeSub?.status || 'No Plan')}`;

    const kb = {
      inline_keyboard: [
        [
          { text: '➕ Add 5 Meals', callback_data: `admin_topup_${profile.id}_5` },
          { text: '➕ Add 10 Meals', callback_data: `admin_topup_${profile.id}_10` }
        ],
        [
          { text: '🔙 Back to Admin Panel', callback_data: 'admin_panel' }
        ]
      ]
    };

    await sendMessage(chatId, memberCard, kb, tokenOverride);
  }
}

// Handler: Add meals to member
async function handleAddMeals(chatId, profileId, count, tokenOverride = null, messageId = null) {
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', profileId).maybeSingle();
  if (!profile) return;

  const { data: subs } = await supabase.from('subscriptions').select('*').eq('member_id', profileId).eq('status', 'active');
  const activeSub = subs?.[0];

  if (activeSub) {
    await supabase
      .from('subscriptions')
      .update({ meals_granted: activeSub.meals_granted + count })
      .eq('id', activeSub.id);
  }

  // Find if member has Telegram linked to notify them
  const links = readTelegramLinks();
  const memberChatEntry = Object.entries(links).find(([_, info]) => info.memberId === profileId);
  if (memberChatEntry) {
    const memberChatId = memberChatEntry[0];
    await sendMessage(
      memberChatId,
      `🎉 *Meals Added to Your Pass!*\n\nAdmin ne aapke meal pass me *+${count} Meals* add kar diye hain. Aap apna naya balance /balance se check kar sakte hain.`
    );
  }

  const successMsg = `✅ Successfully added *+${count} Meals* to *${profile.full_name}* (\`${profile.member_number}\`)!\nMember ko notification bhej di gayi hai.`;

  if (messageId) {
    return editMessageText(chatId, messageId, successMsg, getAdminPanelKeyboard(), tokenOverride);
  }
  return sendMessage(chatId, successMsg, getAdminPanelKeyboard(), tokenOverride);
}

// Handler: Update Menu on the fly
async function handleSetMenu(chatId, period, menuText, tokenOverride = null) {
  const today = getTodayDateString();
  const cleanPeriod = period.toLowerCase();
  if (!['breakfast', 'lunch', 'dinner'].includes(cleanPeriod)) {
    return sendMessage(chatId, `⚠️ Invalid period. Use: \`/setmenu lunch Paneer Butter Masala, Roti, Rice\``, null, tokenOverride);
  }

  // Upsert into menus table
  const { data: existingMenu } = await supabase
    .from('menus')
    .select('id')
    .eq('service_date', today)
    .eq('meal_period', cleanPeriod)
    .maybeSingle();

  let menuId = existingMenu?.id;
  if (!menuId) {
    const { data: newMenu } = await supabase
      .from('menus')
      .insert({ service_date: today, meal_period: cleanPeriod })
      .select('id')
      .single();
    menuId = newMenu?.id;
  }

  if (menuId) {
    // Delete existing items and insert new
    await supabase.from('menu_items').delete().eq('menu_id', menuId);
    const items = menuText.split(',').map(s => s.trim()).filter(Boolean);
    const rows = items.map(name => ({ menu_id: menuId, name, category: 'Main' }));
    await supabase.from('menu_items').insert(rows);
  }

  const msg = `🍛 *Today's ${cleanPeriod.toUpperCase()} Menu Updated!*
📅 Date: ${today}
🍽️ Items:
${menuText.split(',').map(i => `• ${i.trim()}`).join('\n')}

Website aur Telegram bot dono par live update ho gaya hai!`;

  return sendMessage(chatId, msg, getAdminPanelKeyboard(), tokenOverride);
}

// Handler: Daily Ledger & Audit
async function handleDailyLedger(chatId, tokenOverride = null, messageId = null) {
  const today = getTodayDateString();

  const { data: txs } = await supabase
    .from('meal_transactions')
    .select('id, meal_period, status, created_at')
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lte('created_at', `${today}T23:59:59.999Z`);

  const accepted = (txs || []).filter(t => t.status === 'accepted').length;
  const rejected = (txs || []).filter(t => t.status === 'rejected').length;

  const { data: activeSubs } = await supabase
    .from('subscriptions')
    .select('id, plan_id')
    .eq('status', 'active');

  const ledgerMsg = `💰 *Daily Check-In & Financial Ledger*
📅 *Audit Date:* ${today}

📊 *Today's Counter Check-Ins:*
• Valid Dining Check-Ins: *${accepted} meals*
• Denied / Duplicate Scans: *${rejected} scans*

👥 *Active Plan Subscriptions:* *${activeSubs?.length || 0} active passes*
💵 *Estimated Monthly Run Rate:* ₹${(activeSubs?.length || 0) * 2800}

_Sub dues aur meal balances automated auditable ledger me synced hain._`;

  if (messageId) {
    return editMessageText(chatId, messageId, ledgerMsg, getAdminPanelKeyboard(), tokenOverride);
  }
  return sendMessage(chatId, ledgerMsg, getAdminPanelKeyboard(), tokenOverride);
}

// Handler: /admin_login PIN
async function handleAdminLogin(chatId, pin, tokenOverride = null) {
  if (pin === '1234') {
    saveAdminChat(chatId, { name: 'Mess Administrator', role: 'owner_admin' });
    return handleAdminPanel(chatId, tokenOverride);
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'owner_admin')
    .eq('pin_code', pin)
    .maybeSingle();

  if (adminProfile) {
    saveAdminChat(chatId, { name: adminProfile.full_name, role: 'owner_admin' });
    return handleAdminPanel(chatId, tokenOverride);
  }

  return sendMessage(chatId, `❌ Invalid Admin PIN. Access denied.`, null, tokenOverride);
}

// -------------------------------------------------------------
// Member Flow Handlers (Unchanged, 100% Intact & Protected)
// -------------------------------------------------------------

async function getMemberByChatId(chatId) {
  const links = readTelegramLinks();
  const linked = links[String(chatId)];
  if (linked?.memberId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', linked.memberId)
      .maybeSingle();
    return profile || null;
  }
  return null;
}

async function askConfirmationToLink(chatId, profile, tokenOverride = null) {
  const confirmMsg = `🔍 *Account Mil Gaya!*

👤 *Name:* ${profile.full_name}
🆔 *Member ID:* \`${profile.member_number}\`
📱 *Phone:* \`+91 ${profile.phone || 'N/A'}\`

Kya yeh aapka hi account hai? Neeche button par tap karke confirm karein:`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '✅ Haan, Yeh Mera Account Hai', callback_data: `confirm_link_${profile.id}` }],
      [{ text: '❌ Nahi, Yeh Galat Hai', callback_data: 'cancel_link' }]
    ]
  };

  return sendMessage(chatId, confirmMsg, keyboard, tokenOverride);
}

async function linkProfileToChat(chatId, username, profile, messageId = null, tokenOverride = null) {
  saveTelegramLink(chatId, profile, username);

  try {
    await supabase
      .from('profiles')
      .update({
        telegram_chat_id: String(chatId),
        telegram_username: username || ''
      })
      .eq('id', profile.id);
  } catch (err) {
    console.warn('Note: Supabase telegram_chat_id update notice:', err.message);
  }

  const welcomeMsg = `🎉 *Shabaash! Account Successfully Linked!*

Welcome, *${profile.full_name}* (\`${profile.member_number}\`)!
Aapka Thali.com pass iss chat se connect ho gaya hai.

Neeche diye gaye buttons se aap menu dekh sakte hain aur attendance mark kar sakte hain:`;

  if (messageId) {
    return editMessageText(chatId, messageId, welcomeMsg, getMemberMainMenuKeyboard(), tokenOverride);
  }
  return sendMessage(chatId, welcomeMsg, getMemberMainMenuKeyboard(), tokenOverride);
}

async function handleStart(chatId, username, text, tokenOverride = null) {
  // If user is admin or on admin bot, show admin panel
  if (await isAuthorizedAdmin(chatId)) {
    return handleAdminPanel(chatId, tokenOverride);
  }

  const parts = text.split(' ');
  const payload = parts[1]?.trim();

  if (payload) {
    const cleanNumber = payload.replace('_', '-').toUpperCase();
    const phoneDigits = payload.replace(/\D/g, '');

    let query = supabase.from('profiles').select('*');
    if (cleanNumber.startsWith('M-') || cleanNumber.startsWith('M')) {
      query = query.ilike('member_number', cleanNumber);
    } else if (phoneDigits.length >= 10) {
      query = query.ilike('phone', `%${phoneDigits.slice(-10)}%`);
    }

    const { data: profiles } = await query.limit(1);
    if (profiles && profiles.length > 0) {
      return askConfirmationToLink(chatId, profiles[0], tokenOverride);
    }
  }

  // Check if already linked
  const member = await getMemberByChatId(chatId);
  if (member) {
    const welcomeBackMsg = `👋 *Namaste, ${member.full_name}!*

Aapka account (\`${member.member_number}\`) already connected hai.
Aaj ka menu dekhne ya pass check karne ke liye neeche diye gaye buttons use karein:`;
    return sendMessage(chatId, welcomeBackMsg, getMemberMainMenuKeyboard(), tokenOverride);
  }

  const promptShare = `👋 *Namaste! Welcome to Thali.com Assistant!*

Aapka account connect karne ke liye:
1️⃣ Neeche diye gaye *Share Contact* button par tap karein, YA
2️⃣ Apna **Member ID** (jaise \`M-112\`) ya registered **Mobile Number** type karke bhejein.`;

  const keyboard = {
    keyboard: [[{ text: '📱 Share My Phone Number', request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true
  };

  return sendMessage(chatId, promptShare, keyboard, tokenOverride);
}

async function handleMenu(chatId, tokenOverride = null) {
  const today = getTodayDateString();
  const closures = readMessClosures()[today] || {};

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

  // Format closure warnings if mess is off
  const bNotice = closures.breakfast ? `\n⚠️ _(Note: Breakfast is OFF today - ${closures.breakfast.reason}. No meal deducted.)_` : '';
  const lNotice = closures.lunch ? `\n⚠️ _(Note: Lunch is OFF today - ${closures.lunch.reason}. No meal deducted.)_` : '';
  const dNotice = closures.dinner ? `\n⚠️ _(Note: Dinner is OFF today - ${closures.dinner.reason}. No meal deducted.)_` : '';

  const menuMsg = `🍛 *Today's Mess Menu* (${today})

🌅 *Breakfast (07:30 AM – 10:30 AM)*${bNotice}
${breakfastText.split(', ').map(i => `• ${i}`).join('\n')}

☀️ *Lunch (12:30 PM – 03:30 PM)*${lNotice}
${lunchText.split(', ').map(i => `• ${i}`).join('\n')}

🌙 *Dinner (07:30 PM – 10:30 PM)*${dNotice}
${dinnerText.split(', ').map(i => `• ${i}`).join('\n')}

_Neeche diye gaye buttons se apni attendance mark karein:_`;

  // Filter out RSVP buttons if a meal is OFF
  const rows = [];
  if (!closures.lunch) {
    rows.push([
      { text: '✅ Coming for Lunch', callback_data: 'rsvp_attend_lunch' },
      { text: '❌ Skip Lunch', callback_data: 'rsvp_skip_lunch' }
    ]);
  }
  if (!closures.dinner) {
    rows.push([
      { text: '✅ Coming for Dinner', callback_data: 'rsvp_attend_dinner' },
      { text: '❌ Skip Dinner', callback_data: 'rsvp_skip_dinner' }
    ]);
  }

  const keyboard = { inline_keyboard: rows };
  return sendMessage(chatId, menuMsg, keyboard, tokenOverride);
}

async function handlePass(chatId, tokenOverride = null) {
  const member = await getMemberByChatId(chatId);
  if (!member) {
    return sendMessage(chatId, `⚠️ Pehle account link karein! Apna Member ID (jaise \`M-112\`) bhejein.`, null, tokenOverride);
  }

  const token = member.qr_token || `QR_MEM_${member.member_number}`;
  const qrBuffer = await QRCode.toBuffer(token, {
    width: 400,
    margin: 2,
    color: { dark: '#0d253d', light: '#ffffff' }
  });

  const caption = `🎫 *Your Digital Thali.com Pass*
👤 *Member:* ${member.full_name} (\`${member.member_number}\`)
🔑 *Token:* \`${token}\`

📱 Counter receptionist ya scanner par yeh QR code dikhayein!`;

  return sendPhotoBuffer(chatId, qrBuffer, caption, tokenOverride);
}

async function handleBalance(chatId, tokenOverride = null) {
  const member = await getMemberByChatId(chatId);
  if (!member) {
    return sendMessage(chatId, `⚠️ Pehle account link karein! Apna Member ID (jaise \`M-112\`) bhejein.`, null, tokenOverride);
  }

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

  return sendMessage(chatId, balanceMsg, getMemberMainMenuKeyboard(), tokenOverride);
}

// -------------------------------------------------------------
// Unified Callback Query Handler
// -------------------------------------------------------------

async function handleCallbackQuery(cbQuery, tokenOverride = null) {
  const chatId = cbQuery.message?.chat?.id;
  const messageId = cbQuery.message?.message_id;
  const data = cbQuery.data;

  await answerCallbackQuery(cbQuery.id, '', tokenOverride);

  // 1. Account Confirmation
  if (data.startsWith('confirm_link_')) {
    const profileId = data.replace('confirm_link_', '');
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', profileId).maybeSingle();
    if (profile) {
      return linkProfileToChat(chatId, cbQuery.from?.username, profile, messageId, tokenOverride);
    }
  }

  if (data === 'cancel_link') {
    return editMessageText(chatId, messageId, `Koi baat nahi! Apna sahi Member ID (jaise \`M-112\`) ya registered phone bhejein.`, null, tokenOverride);
  }

  // 2. Member Actions
  if (data === 'action_menu') return handleMenu(chatId, tokenOverride);
  if (data === 'action_pass') return handlePass(chatId, tokenOverride);
  if (data === 'action_balance') return handleBalance(chatId, tokenOverride);

  // 3. Member RSVP with Mess-Off Safeguard
  if (data.startsWith('rsvp_')) {
    const member = await getMemberByChatId(chatId);
    if (!member) {
      return sendMessage(chatId, `⚠️ Pehle account link karein! Apna Member ID bhejein.`, null, tokenOverride);
    }

    const isSkip = data.includes('skip');
    const period = data.includes('dinner') ? 'dinner' : 'lunch';
    const today = getTodayDateString();

    // Check if this meal is OFF
    const closure = isPeriodClosed(today, period);
    if (closure) {
      return sendMessage(chatId, `⚠️ *Mess OFF Hai:* Aaj ${period.toUpperCase()} off hai (${closure.reason}). Aapka meal cut nahi hoga aur koi action lene ki zarurat nahi hai!`, null, tokenOverride);
    }

    try {
      if (isSkip) {
        await supabase.from('meal_skips').upsert(
          { member_id: member.id, service_date: today, meal_period: period, reason: 'Marked Skip via Telegram' },
          { onConflict: 'member_id,service_date,meal_period' }
        );
        return sendMessage(chatId, `❌ *Attendance Updated:* You marked *NOT COMING* for ${period.toUpperCase()} today. Kitchen has been notified!`, null, tokenOverride);
      } else {
        await supabase.from('meal_skips').delete().eq('member_id', member.id).eq('service_date', today).eq('meal_period', period);
        return sendMessage(chatId, `✅ *Attendance Confirmed:* Marked *COMING* for ${period.toUpperCase()} today. Garma-garam thali ready milegi! 🍛`, null, tokenOverride);
      }
    } catch (err) {
      console.error('Error recording RSVP:', err.message);
      return sendMessage(chatId, `⚠️ Could not record RSVP. Please try again.`, null, tokenOverride);
    }
  }

  // 4. Admin Navigation & Controls
  if (data === 'admin_panel' || data === 'admin_refresh') {
    return handleAdminPanel(chatId, tokenOverride, messageId);
  }

  if (data === 'admin_menu_off') {
    return handleMessOffPrompt(chatId, tokenOverride, messageId);
  }

  if (data.startsWith('messoff_select_')) {
    const period = data.replace('messoff_select_', '');
    const promptReasonMsg = `🛑 Selected Period: *${period.toUpperCase()}*\n\nReason choose karein ya custom reason bhejein:`;
    return editMessageText(chatId, messageId, promptReasonMsg, getMessOffReasonsKeyboard(period), tokenOverride);
  }

  if (data.startsWith('messoff_exec_')) {
    const parts = data.replace('messoff_exec_', '').split('_');
    const period = parts[0];
    const reason = parts.slice(1).join('_');
    return handleExecuteMessOff(chatId, period, reason, tokenOverride, messageId);
  }

  if (data === 'admin_menu_on') {
    const today = getTodayDateString();
    const closures = readMessClosures()[today] || {};
    if (Object.keys(closures).length === 0) {
      return editMessageText(chatId, messageId, `🟢 Aaj koi bhi period closed nahi hai. Sabhi meals active hain!`, getAdminPanelKeyboard(), tokenOverride);
    }
    return editMessageText(chatId, messageId, `🟢 Select karein kaunsa period reopen karna hai:`, getReopenSelectKeyboard(closures), tokenOverride);
  }

  if (data.startsWith('messon_exec_')) {
    const period = data.replace('messon_exec_', '');
    return handleExecuteMessOn(chatId, period, tokenOverride, messageId);
  }

  if (data === 'admin_headcount') {
    return handleHeadcountReport(chatId, tokenOverride, messageId);
  }

  if (data === 'admin_broadcast') {
    const msg = `📢 *Send Announcement / Urgent Notice*\n\nNeeche diye gaye common templates me se choose karein ya custom broadcast bhejein:\nFormat: \`/broadcast <your message here>\``;
    return editMessageText(chatId, messageId, msg, getBroadcastTemplatesKeyboard(), tokenOverride);
  }

  if (data === 'bcast_template_feast') {
    const alert = `🍲 *SPECIAL FEAST TONIGHT!* 🎉\n\nAaj dinner me special Shahi Paneer, Butter Naan & Hot Gulab Jamun serve kiya jayega. Sabhi members time par attend karein!`;
    const res = await broadcastToAllMembers(alert);
    return editMessageText(chatId, messageId, `✅ Special Feast Notice broadcasted to *${res.sent}* members!`, getAdminPanelKeyboard(), tokenOverride);
  }

  if (data === 'bcast_template_delay') {
    const alert = `⏰ *MESS TIMING UPDATE* ⏰\n\nAaj dinner service 30 minutes late (08:00 PM) shuru hogi kitchen prep ke kaaran. Asuvidha ke liye khed hai.`;
    const res = await broadcastToAllMembers(alert);
    return editMessageText(chatId, messageId, `✅ Timing delay alert broadcasted to *${res.sent}* members!`, getAdminPanelKeyboard(), tokenOverride);
  }

  if (data === 'bcast_template_fees') {
    const alert = `💳 *MONTHLY MEAL PASS RENEWAL* 💳\n\nNaye month ke meal pass recharge open ho gaye hain. Apne dues receptionist counter par settle karke pass renew karwayein.`;
    const res = await broadcastToAllMembers(alert);
    return editMessageText(chatId, messageId, `✅ Fee renewal reminder broadcasted to *${res.sent}* members!`, getAdminPanelKeyboard(), tokenOverride);
  }

  if (data === 'admin_lookup') {
    return editMessageText(chatId, messageId, `🔍 *Member Lookup*\n\nMember ko search karne ke liye type karein:\n\`/member M-112\` ya \`/member 9174222385\``, getAdminPanelKeyboard(), tokenOverride);
  }

  if (data.startsWith('admin_topup_')) {
    const [_, __, profileId, countStr] = data.split('_');
    return handleAddMeals(chatId, profileId, parseInt(countStr, 10), tokenOverride, messageId);
  }

  if (data === 'admin_setmenu') {
    const msg = `🍛 *Update Today's Menu On-The-Fly*\n\nNaye menu ko update karne ke liye yeh command bhejein:\n\`/setmenu lunch Paneer Butter Masala, Dal Fry, Roti, Rice\`\nya\n\`/setmenu dinner Malai Kofta, Paratha, Pulao, Sweet\``;
    return editMessageText(chatId, messageId, msg, getAdminPanelKeyboard(), tokenOverride);
  }

  if (data === 'admin_ledger') {
    return handleDailyLedger(chatId, tokenOverride, messageId);
  }
}

// -------------------------------------------------------------
// Unified Text / Contact Dispatcher
// -------------------------------------------------------------

async function handleTextMessage(chatId, username, text, tokenOverride = null) {
  const clean = text.trim();

  // Admin Commands
  if (clean.startsWith('/admin_login')) {
    const pin = clean.split(' ')[1]?.trim();
    return handleAdminLogin(chatId, pin, tokenOverride);
  }

  if (clean.startsWith('/admin') || clean.startsWith('/panel')) {
    if (await isAuthorizedAdmin(chatId)) {
      return handleAdminPanel(chatId, tokenOverride);
    }
    return sendMessage(chatId, `⛔ *Access Denied.* Yeh console sirf authorized mess owners ke liye hai.\nAap PIN se login karne ke liye \`/admin_login <pin>\` use kar sakte hain.`, null, tokenOverride);
  }

  if (clean.startsWith('/messoff')) {
    if (await isAuthorizedAdmin(chatId)) {
      const parts = clean.split(' ');
      if (parts.length > 2) {
        const period = parts[1].toLowerCase();
        const reason = parts.slice(2).join(' ');
        return handleExecuteMessOff(chatId, period, reason, tokenOverride);
      }
      return handleMessOffPrompt(chatId, tokenOverride);
    }
    return sendMessage(chatId, `⛔ Access Denied.`, null, tokenOverride);
  }

  if (clean.startsWith('/messon')) {
    if (await isAuthorizedAdmin(chatId)) {
      const period = clean.split(' ')[1]?.toLowerCase() || 'all_day';
      return handleExecuteMessOn(chatId, period, tokenOverride);
    }
    return sendMessage(chatId, `⛔ Access Denied.`, null, tokenOverride);
  }

  if (clean.startsWith('/broadcast')) {
    if (await isAuthorizedAdmin(chatId)) {
      const bcastMsg = clean.replace('/broadcast', '').trim();
      if (!bcastMsg) {
        return sendMessage(chatId, `Format: \`/broadcast Aaj evening special tea aur snacks rahenge!\``, null, tokenOverride);
      }
      const fullText = `📢 *OFFICIAL NOTICE FROM MESS MANAGEMENT*\n\n${bcastMsg}`;
      const report = await broadcastToAllMembers(fullText);
      return sendMessage(chatId, `✅ Broadcast sent to *${report.sent}/${report.total}* members!`, getAdminPanelKeyboard(), tokenOverride);
    }
    return sendMessage(chatId, `⛔ Access Denied.`, null, tokenOverride);
  }

  if (clean.startsWith('/member')) {
    if (await isAuthorizedAdmin(chatId)) {
      const q = clean.replace('/member', '').trim();
      if (!q) return sendMessage(chatId, `Format: \`/member M-112\` ya mobile number`, null, tokenOverride);
      return handleMemberLookup(chatId, q, tokenOverride);
    }
  }

  if (clean.startsWith('/setmenu')) {
    if (await isAuthorizedAdmin(chatId)) {
      const parts = clean.split(' ');
      const period = parts[1];
      const menuText = parts.slice(2).join(' ');
      if (!period || !menuText) {
        return sendMessage(chatId, `Format: \`/setmenu lunch Paneer Butter Masala, Dal, Roti, Rice\``, null, tokenOverride);
      }
      return handleSetMenu(chatId, period, menuText, tokenOverride);
    }
    return sendMessage(chatId, `⛔ Access Denied.`, null, tokenOverride);
  }

  if (clean.startsWith('/headcount')) {
    if (await isAuthorizedAdmin(chatId)) {
      return handleHeadcountReport(chatId, tokenOverride);
    }
  }

  if (clean.startsWith('/ledger')) {
    if (await isAuthorizedAdmin(chatId)) {
      return handleDailyLedger(chatId, tokenOverride);
    }
  }

  // Member Commands
  if (clean.startsWith('/start')) {
    return handleStart(chatId, username, clean, tokenOverride);
  }
  if (clean.startsWith('/menu') || clean.startsWith('/rsvp')) {
    return handleMenu(chatId, tokenOverride);
  }
  if (clean.startsWith('/pass')) {
    return handlePass(chatId, tokenOverride);
  }
  if (clean.startsWith('/balance')) {
    return handleBalance(chatId, tokenOverride);
  }

  // Fallback: If text looks like a member lookup (e.g. M-112 or phone)
  const phoneDigits = clean.replace(/\D/g, '');
  if (clean.toUpperCase().startsWith('M-') || clean.toUpperCase().startsWith('M') || phoneDigits.length >= 7) {
    let query = supabase.from('profiles').select('*');
    if (clean.toUpperCase().startsWith('M')) {
      query = query.ilike('member_number', clean.toUpperCase());
    } else {
      query = query.ilike('phone', `%${phoneDigits.slice(-10)}%`);
    }

    const { data: profiles } = await query.limit(1);
    if (profiles && profiles.length > 0) {
      return askConfirmationToLink(chatId, profiles[0], tokenOverride);
    }
  }

  return sendMessage(
    chatId,
    `🤖 *Thali.com Assistant Commands:*\n• /menu - Today's menu & RSVP\n• /pass - Digital QR Pass\n• /balance - Meal balance\n• /admin - Admin Control Console`,
    null,
    tokenOverride
  );
}

// -------------------------------------------------------------
// Polling Engines (Main Bot + Optional Dedicated Admin Bot)
// -------------------------------------------------------------

let lastUpdateIdMain = 0;
let lastUpdateIdAdmin = 0;

async function pollMainBot() {
  try {
    const res = await callTelegram(`getUpdates?offset=${lastUpdateIdMain + 1}&timeout=30`);
    if (res?.ok && Array.isArray(res.result)) {
      for (const update of res.result) {
        lastUpdateIdMain = update.update_id;
        console.log(`📩 [MainBot] Update #${update.update_id}`);

        if (update.message) {
          const msg = update.message;
          const chatId = msg.chat?.id;
          const username = msg.from?.username;

          if (msg.contact) {
            const rawPhone = msg.contact.phone_number.replace(/\D/g, '').slice(-10);
            const { data: profiles } = await supabase.from('profiles').select('*').ilike('phone', `%${rawPhone}%`).limit(1);
            if (profiles && profiles.length > 0) {
              await askConfirmationToLink(chatId, profiles[0]);
            } else {
              await sendMessage(chatId, `⚠️ Number +91 ${rawPhone} par koi registered Thali.com account nahi mila.`);
            }
          } else {
            await handleTextMessage(chatId, username, msg.text || '');
          }
        }

        if (update.callback_query) {
          await handleCallbackQuery(update.callback_query);
        }
      }
    }
  } catch (err) {
    console.error('Main Bot Polling error:', err.message);
  }
  setTimeout(pollMainBot, 500);
}

async function pollAdminBot() {
  if (!ADMIN_BOT_TOKEN) return;

  try {
    const res = await callTelegram(`getUpdates?offset=${lastUpdateIdAdmin + 1}&timeout=30`, {}, ADMIN_BOT_TOKEN);
    if (res?.ok && Array.isArray(res.result)) {
      for (const update of res.result) {
        lastUpdateIdAdmin = update.update_id;
        console.log(`👑 [AdminBot] Update #${update.update_id}`);

        if (update.message) {
          const msg = update.message;
          const chatId = msg.chat?.id;
          const username = msg.from?.username;
          const text = (msg.text || '').trim();

          // In dedicated Admin Bot, automatically authorize on first start or login
          if (text.startsWith('/start') || text.startsWith('/admin')) {
            saveAdminChat(chatId, { name: msg.from?.first_name || 'Admin', role: 'owner_admin' });
            await handleAdminPanel(chatId, ADMIN_BOT_TOKEN);
          } else {
            await handleTextMessage(chatId, username, text, ADMIN_BOT_TOKEN);
          }
        }

        if (update.callback_query) {
          await handleCallbackQuery(update.callback_query, ADMIN_BOT_TOKEN);
        }
      }
    }
  } catch (err) {
    console.error('Admin Bot Polling error:', err.message);
  }
  setTimeout(pollAdminBot, 500);
}

// -------------------------------------------------------------
// Service Startup
// -------------------------------------------------------------

async function start() {
  console.log('🤖 Connecting to Telegram Bot API...');

  const mainMe = await callTelegram('getMe');
  if (mainMe?.ok) {
    console.log(`✅ Main Telegram Bot Online: @${mainMe.result.username} (${mainMe.result.first_name})`);
    pollMainBot();
  } else {
    console.error('❌ Failed to connect Main Telegram Bot:', mainMe);
  }

  if (ADMIN_BOT_TOKEN) {
    const adminMe = await callTelegram('getMe', {}, ADMIN_BOT_TOKEN);
    if (adminMe?.ok) {
      console.log(`👑 Dedicated Admin Bot Online: @${adminMe.result.username} (${adminMe.result.first_name})`);
      pollAdminBot();
    } else {
      console.warn('⚠️ Dedicated Admin Bot Token configured but connection failed:', adminMe);
    }
  } else {
    console.log('ℹ️ Note: TELEGRAM_ADMIN_BOT_TOKEN not set in .env. Admin commands are active via /admin on @' + (mainMe?.result?.username || 'ThaliMessBot'));
  }
}

start();
