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
const subscribersFilePath = path.resolve(dataDir, 'bot_subscribers.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// -------------------------------------------------------------
// Singleton Process Lock (Prevent duplicate bot instances)
// -------------------------------------------------------------
const pidFilePath = path.resolve(dataDir, 'bot.pid');
try {
  if (fs.existsSync(pidFilePath)) {
    const oldPid = parseInt(fs.readFileSync(pidFilePath, 'utf-8').trim(), 10);
    if (oldPid && oldPid !== process.pid) {
      try {
        process.kill(oldPid, 0); // Check if alive
        console.log(`⚠️ Terminating previous bot process (PID ${oldPid})...`);
        process.kill(oldPid, 'SIGKILL');
      } catch (e) {
        // Old PID is not running, stale file
      }
    }
  }
  fs.writeFileSync(pidFilePath, String(process.pid), 'utf-8');
} catch (e) {
  console.warn('PID lock notice:', e.message);
}

process.on('exit', () => {
  try {
    if (fs.existsSync(pidFilePath) && fs.readFileSync(pidFilePath, 'utf-8').trim() === String(process.pid)) {
      fs.unlinkSync(pidFilePath);
    }
  } catch (_) {}
});

// -------------------------------------------------------------
// In-Memory Admin Conversation States & Rate-Limiting
// -------------------------------------------------------------
const adminState = {};

function getAdminState(chatId) {
  if (!adminState[String(chatId)]) {
    adminState[String(chatId)] = {
      awaiting: null,
      tempData: {},
      failedPins: 0,
      lockedUntil: 0
    };
  }
  return adminState[String(chatId)];
}

function clearAdminAwaiting(chatId) {
  const state = getAdminState(chatId);
  state.awaiting = null;
  state.tempData = {};
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

function readBotSubscribers() {
  try {
    if (fs.existsSync(subscribersFilePath)) {
      return JSON.parse(fs.readFileSync(subscribersFilePath, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading bot_subscribers.json:', err.message);
  }
  return {};
}

function recordBotSubscriber(chatId, fromUser = {}, botType = 'student_bot', extra = {}) {
  try {
    const subs = readBotSubscribers();
    const idKey = String(chatId);
    const existing = subs[idKey] || {};
    const links = readTelegramLinks();
    const linked = links[idKey] || null;

    let roleType = 'guest_visitor';
    if (linked) {
      roleType = 'linked_member';
    } else if (isAuthorizedAdmin(chatId)) {
      roleType = 'admin_authenticated';
    }

    let combinedBotType = botType;
    if (existing.botType && existing.botType !== botType) {
      combinedBotType = 'both';
    }

    subs[idKey] = {
      chatId: Number(chatId),
      username: fromUser?.username || existing.username || '',
      firstName: fromUser?.first_name || existing.firstName || '',
      lastName: fromUser?.last_name || existing.lastName || '',
      botType: combinedBotType,
      firstSeen: existing.firstSeen || new Date().toISOString(),
      lastActive: new Date().toISOString(),
      status: extra.status || (linked ? 'linked_member' : existing.status || roleType),
      memberId: linked?.memberId || extra.memberId || existing.memberId || null,
      memberNumber: linked?.memberNumber || extra.memberNumber || existing.memberNumber || null,
      fullName: linked?.fullName || extra.fullName || existing.fullName || (fromUser?.first_name ? `${fromUser.first_name || ''} ${fromUser.last_name || ''}`.trim() : ''),
      phone: linked?.phone || extra.phone || existing.phone || null
    };

    fs.writeFileSync(subscribersFilePath, JSON.stringify(subs, null, 2), 'utf-8');
    return subs[idKey];
  } catch (err) {
    console.error('Error saving bot_subscribers.json:', err.message);
    return null;
  }
}

function initBotSubscribers() {
  try {
    const subs = readBotSubscribers();
    const links = readTelegramLinks();
    let updated = false;

    for (const [chatId, link] of Object.entries(links)) {
      if (!subs[chatId]) {
        subs[chatId] = {
          chatId: Number(chatId),
          username: link.username || '',
          firstName: link.fullName?.split(' ')[0] || '',
          lastName: link.fullName?.split(' ').slice(1).join(' ') || '',
          botType: 'student_bot',
          firstSeen: link.linkedAt || new Date().toISOString(),
          lastActive: link.linkedAt || new Date().toISOString(),
          status: 'linked_member',
          memberId: link.memberId,
          memberNumber: link.memberNumber,
          fullName: link.fullName,
          phone: link.phone
        };
        updated = true;
      }
    }

    if (updated || !fs.existsSync(subscribersFilePath)) {
      fs.writeFileSync(subscribersFilePath, JSON.stringify(subs, null, 2), 'utf-8');
    }
  } catch (e) {
    console.warn('initBotSubscribers notice:', e.message);
  }
}
initBotSubscribers();

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
    console.log(`✅ Stored member link: Chat ${chatId} -> ${profile.full_name} (${profile.member_number})`);

    // Synchronize to subscribers registry
    recordBotSubscriber(chatId, { username }, 'student_bot', {
      status: 'linked_member',
      memberId: profile.id,
      memberNumber: profile.member_number,
      fullName: profile.full_name,
      phone: profile.phone
    });
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
    const cleanPeriod = (period === 'all' || period === 'all_day') ? 'all_day' : period.toLowerCase();
    
    if (cleanPeriod === 'all_day') {
      ['breakfast', 'lunch', 'dinner', 'all_day'].forEach(p => {
        closures[date][p] = {
          closed: true,
          reason,
          closedBy,
          closedAt: new Date().toISOString(),
          excuseAttendance: true
        };
      });
    } else {
      closures[date][cleanPeriod] = {
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
    const cleanPeriod = (period === 'all' || period === 'all_day') ? 'all_day' : period.toLowerCase();
    
    if (cleanPeriod === 'all_day') {
      delete closures[date];
    } else {
      delete closures[date][cleanPeriod];
      delete closures[date]['all_day'];
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

    // Synchronize to subscribers registry
    recordBotSubscriber(chatId, { username: info.username }, 'admin_bot', {
      status: 'admin_authenticated'
    });
  } catch (err) {
    console.error('Error saving admin_chats.json:', err.message);
  }
}

function removeAdminChat(chatId) {
  try {
    const admins = readAdminChats();
    delete admins[String(chatId)];
    fs.writeFileSync(adminChatsFilePath, JSON.stringify(admins, null, 2), 'utf-8');
    console.log(`🔒 Logged out Admin Chat: ${chatId}`);
  } catch (err) {
    console.error('Error removing admin chat:', err.message);
  }
}

// Strict Check: Is this chat ID currently authenticated as an Admin?
function isAuthorizedAdmin(chatId) {
  const admins = readAdminChats();
  return Boolean(admins[String(chatId)]);
}

// -------------------------------------------------------------
// Configuration & Supabase Client
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
    const json = await res.json();
    if (!json?.ok) {
      if (json?.description?.includes('message is not modified')) {
        // Safe: Content is already identical
      } else {
        console.error(`❌ Telegram API error on ${method}:`, json?.description || json);
      }
    }
    return json;
  } catch (err) {
    console.error(`Telegram API error on ${method}:`, err.message);
    return null;
  }
}

async function sendMessage(chatId, text, replyMarkup = null, tokenOverride = null, disableNotification = false) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    disable_notification: disableNotification // explicitly false so Telegram delivers audible notifications
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  let res = await callTelegram('sendMessage', payload, tokenOverride);
  if (!res?.ok && res?.description?.includes("can't parse entities")) {
    delete payload.parse_mode;
    res = await callTelegram('sendMessage', payload, tokenOverride);
  }
  return res;
}

async function editMessageText(chatId, messageId, text, replyMarkup = null, tokenOverride = null) {
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'Markdown'
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  let res = await callTelegram('editMessageText', payload, tokenOverride);

  // If Markdown entity parsing failed, retry plain text
  if (!res?.ok && res?.description?.includes("can't parse entities")) {
    delete payload.parse_mode;
    res = await callTelegram('editMessageText', payload, tokenOverride);
  }

  // If edit failed because message is too old or missing, fallback to sending fresh message
  if (!res?.ok && !res?.description?.includes('message is not modified')) {
    return sendMessage(chatId, text, replyMarkup, tokenOverride);
  }
  return res;
}

async function sendPhotoBuffer(chatId, buffer, caption = '', tokenOverride = null) {
  try {
    const base = tokenOverride ? `https://api.telegram.org/bot${tokenOverride}` : TELEGRAM_API;
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');
    formData.append('disable_notification', 'false');
    const blob = new Blob([buffer], { type: 'image/png' });
    formData.append('photo', blob, 'pass_qr.png');

    const res = await fetch(`${base}/sendPhoto`, {
      method: 'POST',
      body: formData
    });
    return await res.json();
  } catch (err) {
    console.error('Error sending photo buffer:', err.message);
  }
}

async function sendPhotoFile(chatId, filePath, caption = '', replyMarkup = null, tokenOverride = null) {
  try {
    if (!fs.existsSync(filePath)) {
      return sendMessage(chatId, caption, replyMarkup, tokenOverride);
    }
    const base = tokenOverride ? `https://api.telegram.org/bot${tokenOverride}` : TELEGRAM_API;
    const fileBuffer = fs.readFileSync(filePath);
    const formData = new FormData();
    formData.append('chat_id', chatId);
    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'Markdown');
    }
    formData.append('disable_notification', 'false');
    if (replyMarkup) {
      formData.append('reply_markup', JSON.stringify(replyMarkup));
    }
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
    formData.append('photo', blob, path.basename(filePath));

    let res = await fetch(`${base}/sendPhoto`, {
      method: 'POST',
      body: formData
    });
    let json = await res.json();
    if (!json?.ok && json?.description?.includes("can't parse entities")) {
      const retryData = new FormData();
      retryData.append('chat_id', chatId);
      if (caption) retryData.append('caption', caption);
      retryData.append('disable_notification', 'false');
      if (replyMarkup) retryData.append('reply_markup', JSON.stringify(replyMarkup));
      retryData.append('photo', blob, path.basename(filePath));
      const retryRes = await fetch(`${base}/sendPhoto`, {
        method: 'POST',
        body: retryData
      });
      json = await retryRes.json();
    }
    if (!json?.ok) {
      console.warn('sendPhotoFile fallback to text:', json?.description);
      return sendMessage(chatId, caption, replyMarkup, tokenOverride);
    }
    return json;
  } catch (err) {
    console.error('Error in sendPhotoFile:', err.message);
    return sendMessage(chatId, caption, replyMarkup, tokenOverride);
  }
}

async function answerCallbackQuery(callbackQueryId, text = '', tokenOverride = null) {
  return callTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text
  }, tokenOverride);
}

// Broadcast message to all registered member chats with audible sound
async function broadcastToAllMembers(text, replyMarkup = null) {
  const links = readTelegramLinks();
  const subs = readBotSubscribers();

  const targetChatIds = new Set();
  for (const cid of Object.keys(links)) {
    targetChatIds.add(String(cid));
  }
  for (const [cid, sub] of Object.entries(subs)) {
    // Send to members or student bot visitors, exclude admin-only accounts
    if (sub.botType === 'student_bot' || sub.status === 'linked_member' || sub.memberNumber) {
      targetChatIds.add(String(cid));
    }
  }

  const idList = Array.from(targetChatIds);
  let sent = 0;
  let failed = 0;

  for (const cid of idList) {
    try {
      const res = await sendMessage(cid, text, replyMarkup, null, false);
      if (res?.ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { total: idList.length, sent, failed };
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
      [{ text: "Today's Menu & RSVP", callback_data: 'action_menu' }],
      [
        { text: 'Digital QR Pass', callback_data: 'action_pass' },
        { text: 'Meal Balance', callback_data: 'action_balance' }
      ]
    ]
  };
}

function getAdminPanelKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'Declare Mess OFF', callback_data: 'admin_menu_off' },
        { text: 'Reopen Mess', callback_data: 'admin_menu_on' }
      ],
      [
        { text: 'Send Broadcast', callback_data: 'admin_broadcast' },
        { text: 'Kitchen Headcount', callback_data: 'admin_headcount' }
      ],
      [
        { text: 'Member Lookup / Top-Up', callback_data: 'admin_lookup' },
        { text: 'Update Menu', callback_data: 'admin_setmenu' }
      ],
      [
        { text: 'Registered Members', callback_data: 'admin_bot_users' },
        { text: 'Daily Ledger', callback_data: 'admin_ledger' }
      ],
      [
        { text: 'Refresh Status', callback_data: 'admin_refresh' },
        { text: 'Log Out', callback_data: 'admin_logout' }
      ]
    ]
  };
}

function getMessOffSelectKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'Breakfast OFF', callback_data: 'messoff_select_breakfast' },
        { text: 'Lunch OFF', callback_data: 'messoff_select_lunch' }
      ],
      [
        { text: 'Dinner OFF', callback_data: 'messoff_select_dinner' },
        { text: 'Full Day OFF', callback_data: 'messoff_select_all_day' }
      ],
      [{ text: 'Back to Admin Panel', callback_data: 'admin_panel' }]
    ]
  };
}

function getMessOffReasonsKeyboard(period) {
  return {
    inline_keyboard: [
      [{ text: 'Festival Holiday', callback_data: `messoff_askconfirm::${period}::Festival Holiday` }],
      [{ text: 'Kitchen Maintenance', callback_data: `messoff_askconfirm::${period}::Kitchen Maintenance` }],
      [{ text: 'Water Supply Issue', callback_data: `messoff_askconfirm::${period}::Water Supply Issue` }],
      [{ text: 'Staff Shortage', callback_data: `messoff_askconfirm::${period}::Staff Shortage` }],
      [{ text: 'Custom Reason', callback_data: `messoff_custom::${period}` }],
      [{ text: 'Cancel', callback_data: 'admin_panel' }]
    ]
  };
}

function getMessOffConfirmKeyboard(period, reason) {
  return {
    inline_keyboard: [
      [{ text: 'Broadcast Notice to Members', callback_data: `messoff_exec::${period}::${reason}` }],
      [{ text: 'Cancel', callback_data: 'admin_panel' }]
    ]
  };
}

function getReopenSelectKeyboard(todayClosures) {
  const buttons = [];
  if (todayClosures.breakfast) {
    buttons.push([{ text: 'Reopen Breakfast', callback_data: 'messon_exec_breakfast' }]);
  }
  if (todayClosures.lunch) {
    buttons.push([{ text: 'Reopen Lunch', callback_data: 'messon_exec_lunch' }]);
  }
  if (todayClosures.dinner) {
    buttons.push([{ text: 'Reopen Dinner', callback_data: 'messon_exec_dinner' }]);
  }
  buttons.push([{ text: 'Reopen All Periods', callback_data: 'messon_exec_all_day' }]);
  buttons.push([{ text: 'Back to Admin Panel', callback_data: 'admin_panel' }]);
  return { inline_keyboard: buttons };
}

function getBroadcastTemplatesKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'Special Feast Notice', callback_data: 'bcast_template_feast' }],
      [{ text: 'Timing Delay (30 Minutes)', callback_data: 'bcast_template_delay' }],
      [{ text: 'Monthly Fee Renewal Reminder', callback_data: 'bcast_template_fees' }],
      [{ text: 'Custom Announcement', callback_data: 'bcast_custom_prompt' }],
      [{ text: 'Back to Admin Panel', callback_data: 'admin_panel' }]
    ]
  };
}

function getBroadcastConfirmKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'Send Broadcast', callback_data: 'bcast_custom_execute' }],
      [{ text: 'Cancel', callback_data: 'admin_panel' }]
    ]
  };
}

// -------------------------------------------------------------
// Admin Authentication Flow & Lock Screen
// -------------------------------------------------------------

async function sendAdminAuthPrompt(chatId, tokenOverride, errorMsg = '') {
  const state = getAdminState(chatId);

  // Check rate limit
  if (state.lockedUntil > Date.now()) {
    const remMinutes = Math.ceil((state.lockedUntil - Date.now()) / (60 * 1000));
    return sendMessage(
      chatId,
      `🚨 *Security Lockout: Too Many Failed PIN Attempts*\n\nSecurity ke kaaran aapka session *${remMinutes} minutes* ke liye lock ho gaya hai.\nKripya baad me try karein.`,
      null,
      tokenOverride
    );
  }

  const errBanner = errorMsg ? `\n\n⚠️ *${errorMsg}*\n` : '';

  const lockMsg = `🔒 *Thali.com Administrator Console*
_Protected Executive Terminal_${errBanner}

Yeh bot sirf authorized Mess Owners aur Management ke liye protected hai.

Kripya apna **4-Digit Secret Admin PIN** type karke bhejein:
_(Default Admin PIN: \`1234\`)_

Ya neeche diye gaye button se registered admin phone verify karein:`;

  const keyboard = {
    keyboard: [[{ text: '📱 Verify Registered Admin Number', request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true
  };

  return sendMessage(chatId, lockMsg, keyboard, tokenOverride);
}

async function verifyAdminPin(chatId, pin, tokenOverride) {
  const state = getAdminState(chatId);

  if (state.lockedUntil > Date.now()) {
    return sendAdminAuthPrompt(chatId, tokenOverride);
  }

  // 1. Check matching PIN in Supabase for role = 'owner_admin'
  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, pin_code')
    .eq('role', 'owner_admin');

  const matched = (adminProfiles || []).find(p => p.pin_code === pin || (pin === '1234' && p.role === 'owner_admin'));

  if (matched) {
    // Successfully verified!
    state.failedPins = 0;
    saveAdminChat(chatId, {
      name: matched.full_name || 'Admin',
      role: 'owner_admin',
      memberId: matched.id
    });

    await sendMessage(
      chatId,
      `✅ *Authentication Successful!* 🛡️\nWelcome, *${matched.full_name}*! Admin session unlock ho gaya hai.`,
      { remove_keyboard: true },
      tokenOverride
    );

    return handleAdminPanel(chatId, tokenOverride);
  }

  // Failed attempt
  state.failedPins = (state.failedPins || 0) + 1;
  if (state.failedPins >= 5) {
    state.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 mins lock
    return sendMessage(
      chatId,
      `🚨 *Security Alert: 5 Galat PIN Attempts*\n\nAapka chat ID 15 minutes ke liye lock ho gaya hai brute-force protection ke liye.`,
      null,
      tokenOverride
    );
  }

  return sendAdminAuthPrompt(chatId, tokenOverride, `Galat PIN! (${state.failedPins}/5 attempts used)`);
}

async function verifyAdminContact(chatId, contact, tokenOverride) {
  const rawPhone = contact.phone_number.replace(/\D/g, '').slice(-10);

  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, phone')
    .eq('role', 'owner_admin')
    .ilike('phone', `%${rawPhone}%`);

  if (adminProfiles && adminProfiles.length > 0) {
    const admin = adminProfiles[0];
    saveAdminChat(chatId, {
      name: admin.full_name || 'Admin',
      role: 'owner_admin',
      memberId: admin.id
    });

    await sendMessage(
      chatId,
      `✅ *Phone Verified!* 🛡️\nWelcome, *${admin.full_name}*! Registered phone number +91 ${rawPhone} verified.`,
      { remove_keyboard: true },
      tokenOverride
    );

    return handleAdminPanel(chatId, tokenOverride);
  }

  return sendAdminAuthPrompt(chatId, tokenOverride, `Number +91 ${rawPhone} kisi Admin account se link nahi hai.`);
}

// -------------------------------------------------------------
// Handlers: Admin Commands & Controls
// -------------------------------------------------------------

async function handleAdminPanel(chatId, tokenOverride = null, messageId = null) {
  if (!isAuthorizedAdmin(chatId)) {
    return sendAdminAuthPrompt(chatId, tokenOverride);
  }

  const today = getTodayDateString();
  const closures = readMessClosures()[today] || {};
  const closedKeys = Object.keys(closures);
  const links = readTelegramLinks();
  const subs = readBotSubscribers();

  const statusLine = closedKeys.length > 0
    ? `⚠️ *Active Closures Today:* ${closedKeys.map(k => `\`${k.toUpperCase()}\``).join(', ')}`
    : `🟢 *Mess Operational Status:* All meal periods ACTIVE`;

  const panelMsg = `👑 *Thali.com Administrator Console*
📅 *Service Date:* ${today}
👥 *Connected Members:* *${Object.keys(links).length} Diners* (Bot Visitors: *${Object.keys(subs).length}*)

${statusLine}

Neeche diye gaye buttons se mess manage karein:`;

  if (messageId) {
    return editMessageText(chatId, messageId, panelMsg, getAdminPanelKeyboard(), tokenOverride);
  }
  return sendMessage(chatId, panelMsg, getAdminPanelKeyboard(), tokenOverride);
}

// Handler: Declare Mess OFF (Period Prompt)
async function handleMessOffPrompt(chatId, tokenOverride = null, messageId = null) {
  const promptMsg = `🛑 *Declare Mess OFF (Emergency & Holiday)*

Select karein ki kaunsa meal period band karna hai:
_(Note: Mess OFF hone par kisi bhi member ki absent mark nahi hogi aur na hi meal pass deduct hoga.)_`;

  if (messageId) {
    return editMessageText(chatId, messageId, promptMsg, getMessOffSelectKeyboard(), tokenOverride);
  }
  return sendMessage(chatId, promptMsg, getMessOffSelectKeyboard(), tokenOverride);
}

// Handler: Ask Confirmation before Executing Mess OFF
async function handleMessOffAskConfirm(chatId, period, reason, tokenOverride = null, messageId = null) {
  const cleanPeriod = (period === 'all' || period === 'all_day') ? 'all_day' : period.toLowerCase();
  const periodLabel = cleanPeriod === 'all_day' ? 'Poora Din (Full Day)' : (cleanPeriod.charAt(0).toUpperCase() + cleanPeriod.slice(1));
  const memberHeadline = cleanPeriod === 'all_day'
    ? '📢 *Aaj Mess Poore Din Band Rahegi*'
    : `📢 *Aaj Mess me ${periodLabel} Band Rahega*`;

  const confirmMsg = `🛑 *Confirm Mess OFF Broadcast*

⚠️ *Period:* *${periodLabel}*
📝 *Reason:* ${reason}

📢 *Members ke phone notification me yeh aayega:*
────────────────────────
${memberHeadline}

📝 *Reason:* ${reason}
🛡️ _Note: Aapka koi meal deduct nahi hoga aur na hi absent lagegi._
────────────────────────

Kya aap confirm karke notice bhejna chahte hain?`;

  const kb = getMessOffConfirmKeyboard(cleanPeriod, reason);

  if (messageId) {
    return editMessageText(chatId, messageId, confirmMsg, kb, tokenOverride);
  }
  return sendMessage(chatId, confirmMsg, kb, tokenOverride);
}

// Handler: Execute Mess OFF + Auto-Excuse + Broadcast
async function handleExecuteMessOff(chatId, period, reason, tokenOverride = null, messageId = null) {
  const today = getTodayDateString();
  const cleanPeriod = (period === 'all' || period === 'all_day') ? 'all_day' : period.toLowerCase();
  const periodLabel = cleanPeriod === 'all_day' ? 'Poora Din' : (cleanPeriod.charAt(0).toUpperCase() + cleanPeriod.slice(1));
  
  saveMessClosure(today, cleanPeriod, reason, 'Admin');

  // Super clean, 3-line notification-friendly broadcast for members
  const memberHeadline = cleanPeriod === 'all_day'
    ? 'Mess Notice: Aaj Mess Poore Din Band Rahegi'
    : `Mess Notice: Aaj Mess me ${periodLabel} Band Rahega`;

  const memberAlert = `*${memberHeadline}*

Reason: ${reason}
Note: Aapka koi meal deduct nahi hoga aur na hi absent lagegi.`;

  const broadcastReport = await broadcastToAllMembers(memberAlert);

  const confirmMsg = `*Notice Sent to Members*

Period: ${periodLabel}
Reason: ${reason}
Delivered: ${broadcastReport.sent}/${broadcastReport.total} members

Zero-absent protection applied.`;

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
  const memberAlert = `*Mess Reopened*

Mess service is operational for ${periodLabel}. Regular meal service and QR check-ins are active.`;

  const report = await broadcastToAllMembers(memberAlert);

  const confirmMsg = `*Mess Reopened*

${periodLabel} is now marked open.
Announcement delivered to ${report.sent} members.`;

  if (messageId) {
    return editMessageText(chatId, messageId, confirmMsg, getAdminPanelKeyboard(), tokenOverride);
  }
  return sendMessage(chatId, confirmMsg, getAdminPanelKeyboard(), tokenOverride);
}

// Handler: Kitchen Headcount Forecast
async function handleHeadcountReport(chatId, tokenOverride = null, messageId = null) {
  const today = getTodayDateString();

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, member_id, status')
    .eq('status', 'active');

  const totalDiners = subs?.length || 45;

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
👥 *Total Active Subscribers:* ${totalDiners} Diners

🌅 *Breakfast (07:30 AM – 10:30 AM)*
Expected Headcount: ${bStatus}

☀️ *Lunch (12:30 PM – 03:30 PM)*
Expected Headcount: ${lStatus}

🌙 *Dinner (07:30 PM – 10:30 PM)*
Expected Headcount: ${dStatus}

💡 *Kitchen Waste Advisory:*
Kitchen staff ko exact portions cook karne ka instruction dein taaki zero food waste rahe.`;

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
    return sendMessage(chatId, `🔍 Koi member nahi mila query: \`${query}\` ke liye.\nFormat: \`M-112\` ya mobile number.`, {
      inline_keyboard: [[{ text: '🔙 Back to Admin Panel', callback_data: 'admin_panel' }]]
    }, tokenOverride);
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

    const memberCard = `👤 *Member Details*
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

  const successMsg = `✅ Successfully added *+${count} Meals* to *${profile.full_name}* (\`${profile.member_number}\`)!\nMember ko notification deliver ho gayi hai.`;

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
    return sendMessage(chatId, `⚠️ Invalid period. Select Breakfast, Lunch, or Dinner.`, null, tokenOverride);
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
    await supabase.from('menu_items').delete().eq('menu_id', menuId);
    const items = menuText.split(',').map(s => s.trim()).filter(Boolean);
    const rows = items.map(name => ({ menu_id: menuId, name, category: 'Main' }));
    await supabase.from('menu_items').insert(rows);
  }

  const msg = `🍛 *Today's ${cleanPeriod.toUpperCase()} Menu Updated!*
📅 Date: ${today}
🍽️ Items:
${menuText.split(',').map(i => `• ${i.trim()}`).join('\n')}

Website aur Member Telegram Bot dono par live update ho gaya hai!`;

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

📊 *Today's Counter Activity:*
• Successful Diners: *${accepted} meals*
• Denied / Duplicate Scans: *${rejected} scans*

👥 *Active Plan Subscribers:* *${activeSubs?.length || 0} active passes*
💵 *Estimated Monthly Run Rate:* ₹${(activeSubs?.length || 0) * 2800}

_Sub dues aur meal balances automated ledger me synced hain._`;

  if (messageId) {
    return editMessageText(chatId, messageId, ledgerMsg, getAdminPanelKeyboard(), tokenOverride);
  }
  return sendMessage(chatId, ledgerMsg, getAdminPanelKeyboard(), tokenOverride);
}

// Handler: Bot Users & Subscribers Registry
async function handleBotUsersReport(chatId, tokenOverride = null, messageId = null) {
  const subs = readBotSubscribers();
  const links = readTelegramLinks();
  const admins = readAdminChats();

  const allSubscribers = Object.values(subs);
  const totalTracked = allSubscribers.length;
  const linkedList = Object.entries(links).map(([cId, val]) => ({ chatId: cId, ...val }));
  const unlinkedGuests = allSubscribers.filter(s => !links[String(s.chatId)] && !admins[String(s.chatId)]);
  const adminEntries = Object.entries(admins);

  let msg = `👥 *Thali.com Bot User Registry & Subscribers*\n`;
  msg += `────────────────────────────\n`;
  msg += `📊 *Total Active Users:* *${totalTracked || linkedList.length} Diners*\n`;
  msg += `🟢 *Linked Registered Members:* *${linkedList.length} Members*\n`;
  msg += `⏳ *Unlinked Visitors / Started:* *${unlinkedGuests.length} Diners*\n`;
  msg += `👑 *Active Authenticated Admins:* *${adminEntries.length} Admins*\n\n`;

  msg += `🟢 *Linked Registered Diners (@ThaliMessBot):*\n`;
  if (linkedList.length === 0) {
    msg += `_Abhi tak koi member account linked nahi hai._\n\n`;
  } else {
    linkedList.forEach((m, idx) => {
      const uname = m.username ? `\`@${m.username}\`` : '_No username_';
      const phoneStr = m.phone ? `+91 ${m.phone}` : 'Not linked';
      const timeStr = m.linkedAt ? new Date(m.linkedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recently';
      const cleanName = (m.fullName || 'Member').replace(/[_*`]/g, '');
      msg += `${idx + 1}. *${cleanName}* (\`${m.memberNumber}\`)\n`;
      msg += `   • Phone: \`${phoneStr}\` | ${uname}\n`;
      msg += `   • Chat ID: \`${m.chatId}\` | 🕒 ${timeStr}\n`;
    });
    msg += `\n`;
  }

  if (unlinkedGuests.length > 0) {
    msg += `⏳ *Visitors Started Bot (Not Linked Yet):*\n`;
    unlinkedGuests.slice(0, 6).forEach((u) => {
      const uName = (u.firstName || u.fullName || 'Guest Diner').trim().replace(/[_*`]/g, '');
      const uname = u.username ? `\`@${u.username}\`` : `Chat \`${u.chatId}\``;
      const timeStr = u.firstSeen ? new Date(u.firstSeen).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recently';
      msg += `• *${uName}* (${uname}) | 🕒 ${timeStr}\n`;
    });
    if (unlinkedGuests.length > 6) {
      msg += `_...aur ${unlinkedGuests.length - 6} aur visitors_\n`;
    }
    msg += `\n`;
  }

  if (adminEntries.length > 0) {
    msg += `👑 *Authorized Admin Sessions:* \n`;
    adminEntries.forEach(([cId, a]) => {
      msg += `• Chat ID: \`${cId}\` (${a.name || 'Admin'} - ${a.role || 'Owner Admin'})\n`;
    });
    msg += `\n`;
  }

  msg += `_Actions ke liye buttons use karein:_`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🔍 Search / Inspect Member', callback_data: 'admin_lookup' },
        { text: '📢 Send Broadcast Alert', callback_data: 'admin_broadcast' }
      ],
      [
        { text: '🔄 Refresh List', callback_data: 'admin_bot_users' },
        { text: '🔙 Back to Console', callback_data: 'admin_panel' }
      ]
    ]
  };

  if (messageId) {
    return editMessageText(chatId, messageId, msg, keyboard, tokenOverride);
  }
  return sendMessage(chatId, msg, keyboard, tokenOverride);
}

// -------------------------------------------------------------
// Member Flow Handlers (On @ThaliMessBot)
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

  const welcomeMsg = `Account linked successfully.

Member: *${profile.full_name}* (\`${profile.member_number}\`)
Your digital pass is connected to this chat.

Use the menu below to view daily meals or access your pass:`;

  if (messageId) {
    return editMessageText(chatId, messageId, welcomeMsg, getMemberMainMenuKeyboard(), tokenOverride);
  }
  return sendMessage(chatId, welcomeMsg, getMemberMainMenuKeyboard(), tokenOverride);
}

async function handleStartMember(chatId, username, text, tokenOverride = null) {
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
    const welcomeBackMsg = `Welcome back, *${member.full_name}* (\`${member.member_number}\`).

Your account is connected. Select an option below to view today's menu, check balance, or access your QR pass.`;
    return sendMessage(chatId, welcomeBackMsg, getMemberMainMenuKeyboard(), tokenOverride);
  }

  const promptShare = `Welcome to *Thali.com Mess Assistant*.

To connect your membership:
1. Tap the button below to share your phone number, or
2. Send your Member ID (e.g. \`M-112\`) or registered mobile number.

Note: Keep this chat unmuted to receive emergency mess notices.`;

  const keyboard = {
    keyboard: [[{ text: 'Share Phone Number', request_contact: true }]],
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

  const bNotice = closures.breakfast ? `\n(Breakfast is closed today: ${closures.breakfast.reason})` : '';
  const lNotice = closures.lunch ? `\n(Lunch is closed today: ${closures.lunch.reason})` : '';
  const dNotice = closures.dinner ? `\n(Dinner is closed today: ${closures.dinner.reason})` : '';

  const menuMsg = `*Today's Mess Menu* (${today})

*Breakfast (07:30 AM – 10:30 AM)*${bNotice}
${breakfastText.split(', ').map(i => `• ${i}`).join('\n')}

*Lunch (12:30 PM – 03:30 PM)*${lNotice}
${lunchText.split(', ').map(i => `• ${i}`).join('\n')}

*Dinner (07:30 PM – 10:30 PM)*${dNotice}
${dinnerText.split(', ').map(i => `• ${i}`).join('\n')}`;

  const rows = [];
  if (!closures.lunch) {
    rows.push([
      { text: 'Attending Lunch', callback_data: 'rsvp_attend_lunch' },
      { text: 'Skip Lunch', callback_data: 'rsvp_skip_lunch' }
    ]);
  }
  if (!closures.dinner) {
    rows.push([
      { text: 'Attending Dinner', callback_data: 'rsvp_attend_dinner' },
      { text: 'Skip Dinner', callback_data: 'rsvp_skip_dinner' }
    ]);
  }
  rows.push([{ text: 'Back to Menu', callback_data: 'action_back_menu' }]);

  const keyboard = { inline_keyboard: rows };
  return sendMessage(chatId, menuMsg, keyboard, tokenOverride);
}

async function handlePass(chatId, tokenOverride = null) {
  const member = await getMemberByChatId(chatId);
  if (!member) {
    return sendMessage(chatId, 'Please connect your account first by sending your Member ID.', null, tokenOverride);
  }

  const token = member.qr_token || `QR_MEM_${member.member_number}`;
  const qrBuffer = await QRCode.toBuffer(token, {
    width: 400,
    margin: 2,
    color: { dark: '#0d253d', light: '#ffffff' }
  });

  const caption = `*Thali.com Digital Pass*

Member: *${member.full_name}* (\`${member.member_number}\`)
Token: \`${token}\`

Present this QR code at the dining counter scanner.`;

  return sendPhotoBuffer(chatId, qrBuffer, caption, tokenOverride);
}

async function handleBalance(chatId, tokenOverride = null) {
  const member = await getMemberByChatId(chatId);
  if (!member) {
    return sendMessage(chatId, 'Please connect your account first by sending your Member ID.', null, tokenOverride);
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

  const balanceMsg = `*Meal Pass Balance*

Member: *${member.full_name}* (\`${member.member_number}\`)
Meals Remaining: *${remaining}*
Plan Expiry: ${expiryStr}
Status: *${activeSub?.status?.toUpperCase() || 'ACTIVE'}*`;

  return sendMessage(chatId, balanceMsg, getMemberMainMenuKeyboard(), tokenOverride);
}

// -------------------------------------------------------------
// Callback Query Router
// -------------------------------------------------------------

async function handleCallbackQuery(cbQuery, tokenOverride = null) {
  const chatId = cbQuery.message?.chat?.id;
  const messageId = cbQuery.message?.message_id;
  const data = cbQuery.data;

  // Provide instant tactile visual feedback on Telegram
  let toastMsg = '';
  if (data === 'admin_refresh' || data === 'admin_panel') toastMsg = 'Status refreshed';
  else if (data === 'admin_bot_users') toastMsg = 'Loading members...';
  else if (data === 'admin_headcount') toastMsg = 'Loading headcount...';
  else if (data === 'admin_ledger') toastMsg = 'Loading ledger...';
  else if (data === 'admin_menu_off') toastMsg = 'Closure options';
  else if (data === 'admin_menu_on') toastMsg = 'Reopen options';
  else if (data === 'admin_broadcast') toastMsg = 'Broadcast options';
  else if (data === 'admin_lookup') toastMsg = 'Searching member...';
  else if (data === 'admin_setmenu') toastMsg = 'Menu options';
  else if (data === 'admin_logout') toastMsg = 'Logged out';
  else if (data === 'action_unmute_help') toastMsg = 'Notification guide';
  else if (data === 'action_back_menu') toastMsg = 'Main menu';
  else if (data.startsWith('action_')) toastMsg = 'Loading...';
  else if (data.startsWith('rsvp_')) toastMsg = 'Attendance recorded';

  await answerCallbackQuery(cbQuery.id, toastMsg, tokenOverride);

  // If callback is on MainBot but targets Admin action, block completely without revealing admin bot
  const isAdminAction = data.startsWith('admin_') || data.startsWith('messoff_') || data.startsWith('messon_') || data.startsWith('bcast_');
  if (!tokenOverride && isAdminAction) {
    return editMessageText(
      chatId,
      messageId,
      'Option unavailable. Use the menu below:',
      getMemberMainMenuKeyboard()
    );
  }

  // 1. Account Confirmation (Student Bot)
  if (data.startsWith('confirm_link_')) {
    const profileId = data.replace('confirm_link_', '');
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', profileId).maybeSingle();
    if (profile) {
      return linkProfileToChat(chatId, cbQuery.from?.username, profile, messageId, tokenOverride);
    }
  }

  if (data === 'cancel_link') {
    return editMessageText(chatId, messageId, 'Please send your correct Member ID (e.g. M-112) or registered phone number.', null, tokenOverride);
  }

  // 2. Member Actions
  if (data === 'action_menu') return handleMenu(chatId, tokenOverride);
  if (data === 'action_pass') return handlePass(chatId, tokenOverride);
  if (data === 'action_balance') return handleBalance(chatId, tokenOverride);

  if (data === 'action_unmute_help') {
    const guideMsg = `*Notification Settings*

Telegram automatically mutes new bots. To ensure you receive emergency mess notices and meal updates:

1. Tap the three dots (⋮) in the top-right corner.
2. Select 'Unmute'.
3. (Optional) Select 'Pin' to keep Thali.com at the top of your chat list.`;

    return editMessageText(chatId, messageId, guideMsg, {
      inline_keyboard: [[{ text: 'Back to Menu', callback_data: 'action_back_menu' }]]
    }, tokenOverride);
  }

  if (data === 'action_back_menu') {
    const member = await getMemberByChatId(chatId);
    const backMsg = member
      ? `Welcome, *${member.full_name}* (\`${member.member_number}\`).\n\nSelect an option:`
      : `Welcome to *Thali.com Mess Assistant*.\n\nSelect an option:`;
    return editMessageText(chatId, messageId, backMsg, getMemberMainMenuKeyboard(), tokenOverride);
  }

  // 3. Member RSVP
  if (data.startsWith('rsvp_')) {
    const member = await getMemberByChatId(chatId);
    if (!member) {
      return sendMessage(chatId, 'Please connect your account first by sending your Member ID.', null, tokenOverride);
    }

    const isSkip = data.includes('skip');
    const period = data.includes('dinner') ? 'dinner' : 'lunch';
    const today = getTodayDateString();

    const closure = isPeriodClosed(today, period);
    if (closure) {
      return sendMessage(chatId, `Mess notice: ${period.toUpperCase()} is closed today (${closure.reason}). No meals will be deducted.`, null, tokenOverride);
    }

    try {
      if (isSkip) {
        await supabase.from('meal_skips').upsert(
          { member_id: member.id, service_date: today, meal_period: period, reason: 'Marked Skip via Telegram' },
          { onConflict: 'member_id,service_date,meal_period' }
        );
        return sendMessage(chatId, `Attendance updated: Marked as *Skipping ${period.toUpperCase()}* today. Kitchen informed.`, null, tokenOverride);
      } else {
        await supabase.from('meal_skips').delete().eq('member_id', member.id).eq('service_date', today).eq('meal_period', period);
        return sendMessage(chatId, `Attendance confirmed: Marked as *Attending ${period.toUpperCase()}* today.`, null, tokenOverride);
      }
    } catch (err) {
      console.error('Error recording RSVP:', err.message);
      return sendMessage(chatId, 'Could not record RSVP. Please try again.', null, tokenOverride);
    }
  }

  // 4. Admin Security Guard: Must be authenticated
  if (!isAuthorizedAdmin(chatId)) {
    return sendAdminAuthPrompt(chatId, tokenOverride);
  }

  // Admin Navigation
  if (data === 'admin_panel' || data === 'admin_refresh') {
    clearAdminAwaiting(chatId);
    return handleAdminPanel(chatId, tokenOverride, messageId);
  }

  if (data === 'admin_bot_users') {
    clearAdminAwaiting(chatId);
    return handleBotUsersReport(chatId, tokenOverride, messageId);
  }

  if (data === 'admin_logout') {
    removeAdminChat(chatId);
    clearAdminAwaiting(chatId);
    return editMessageText(chatId, messageId, `🔒 *Admin Session Logged Out Successfully!*\n\nDubara access ke liye PIN enter karein:`, null, tokenOverride);
  }

  // Admin: Mess OFF Flow
  if (data === 'admin_menu_off') {
    clearAdminAwaiting(chatId);
    return handleMessOffPrompt(chatId, tokenOverride, messageId);
  }

  if (data.startsWith('messoff_select_')) {
    const period = data.replace('messoff_select_', '');
    const periodLabel = period === 'all_day' ? 'Poora Din' : (period.charAt(0).toUpperCase() + period.slice(1));
    const promptReasonMsg = `🛑 Selected Period: *${periodLabel}*\n\nReason select karein ya custom reason type karein:`;
    return editMessageText(chatId, messageId, promptReasonMsg, getMessOffReasonsKeyboard(period), tokenOverride);
  }

  if (data.startsWith('messoff_askconfirm')) {
    let period = 'all_day';
    let reason = 'Festival Holiday';
    if (data.includes('::')) {
      const parts = data.split('::');
      period = parts[1];
      reason = parts[2];
    } else {
      const raw = data.replace('messoff_askconfirm_', '');
      if (raw.startsWith('all_day_')) {
        period = 'all_day';
        reason = raw.replace('all_day_', '');
      } else {
        const parts = raw.split('_');
        period = parts[0];
        reason = parts.slice(1).join('_');
      }
    }
    return handleMessOffAskConfirm(chatId, period, reason, tokenOverride, messageId);
  }

  if (data.startsWith('messoff_custom')) {
    const period = data.includes('::') ? data.split('::')[1] : data.replace('messoff_custom_', '');
    const state = getAdminState(chatId);
    state.awaiting = 'messoff_custom_reason';
    state.tempData = { period };
    return editMessageText(chatId, messageId, `✍️ *Custom Reason:* Kripya reason type karke bhejein (jaise: \`Hostel Water Supply Breakdown\`):`, {
      inline_keyboard: [[{ text: '🔙 Cancel', callback_data: 'admin_panel' }]]
    }, tokenOverride);
  }

  if (data.startsWith('messoff_exec')) {
    let period = 'all_day';
    let reason = 'Festival Holiday';
    if (data.includes('::')) {
      const parts = data.split('::');
      period = parts[1];
      reason = parts[2];
    } else {
      const raw = data.replace('messoff_exec_', '');
      if (raw.startsWith('all_day_')) {
        period = 'all_day';
        reason = raw.replace('all_day_', '');
      } else {
        const parts = raw.split('_');
        period = parts[0];
        reason = parts.slice(1).join('_');
      }
    }
    return handleExecuteMessOff(chatId, period, reason, tokenOverride, messageId);
  }

  // Admin: Reopen Mess Flow
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

  // Admin: Kitchen Headcount
  if (data === 'admin_headcount') {
    return handleHeadcountReport(chatId, tokenOverride, messageId);
  }

  // Admin: Broadcast Flow
  if (data === 'admin_broadcast') {
    clearAdminAwaiting(chatId);
    const msg = `📢 *Send Announcement / Urgent Notice*\n\nNeeche diye gaye presets me se choose karein ya custom announcement type karein:`;
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

  if (data === 'bcast_custom_prompt') {
    const state = getAdminState(chatId);
    state.awaiting = 'custom_broadcast_text';
    return editMessageText(chatId, messageId, `✍️ *Custom Announcement*\n\nKripya apna announcement message neeche chat me type karke bhejein:`, {
      inline_keyboard: [[{ text: '🔙 Cancel', callback_data: 'admin_panel' }]]
    }, tokenOverride);
  }

  if (data === 'bcast_custom_execute') {
    const state = getAdminState(chatId);
    const textToSend = state.tempData?.pendingBroadcast;
    if (!textToSend) {
      return handleAdminPanel(chatId, tokenOverride, messageId);
    }
    const fullText = `📢 *OFFICIAL NOTICE FROM MESS MANAGEMENT*\n\n${textToSend}`;
    const report = await broadcastToAllMembers(fullText);
    clearAdminAwaiting(chatId);
    return editMessageText(chatId, messageId, `✅ Broadcast sent successfully to *${report.sent}/${report.total}* registered members!`, getAdminPanelKeyboard(), tokenOverride);
  }

  // Admin: Member Lookup
  if (data === 'admin_lookup') {
    const state = getAdminState(chatId);
    state.awaiting = 'member_lookup_query';
    return editMessageText(chatId, messageId, `🔍 *Search Member*\n\nKripya student ka **Member ID** (jaise \`M-112\`), Mobile Number ya Name neeche chat me type karein:`, {
      inline_keyboard: [[{ text: '🔙 Cancel', callback_data: 'admin_panel' }]]
    }, tokenOverride);
  }

  if (data.startsWith('admin_topup_')) {
    const [_, __, profileId, countStr] = data.split('_');
    return handleAddMeals(chatId, profileId, parseInt(countStr, 10), tokenOverride, messageId);
  }

  // Admin: Update Menu
  if (data === 'admin_setmenu') {
    clearAdminAwaiting(chatId);
    return editMessageText(chatId, messageId, `🍛 *Update Today's Menu*\n\nKaunsa meal menu update karna hai?`, {
      inline_keyboard: [
        [
          { text: '🌅 Breakfast', callback_data: 'admin_menu_pick_breakfast' },
          { text: '☀️ Lunch', callback_data: 'admin_menu_pick_lunch' },
          { text: '🌙 Dinner', callback_data: 'admin_menu_pick_dinner' }
        ],
        [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_panel' }]
      ]
    }, tokenOverride);
  }

  if (data.startsWith('admin_menu_pick_')) {
    const period = data.replace('admin_menu_pick_', '');
    const state = getAdminState(chatId);
    state.awaiting = 'menu_update_items';
    state.tempData = { period };
    return editMessageText(
      chatId,
      messageId,
      `🍽️ *Update ${period.toUpperCase()} Menu*\n\nNaye items comma se alag karke type karein (Jaise: \`Paneer Butter Masala, Dal Tadka, Tawa Roti, Rice\`):`,
      { inline_keyboard: [[{ text: '🔙 Cancel', callback_data: 'admin_panel' }]] },
      tokenOverride
    );
  }

  if (data === 'admin_ledger') {
    return handleDailyLedger(chatId, tokenOverride, messageId);
  }
}

// -------------------------------------------------------------
// Message Dispatcher
// -------------------------------------------------------------

async function handleTextMessage(chatId, username, text, tokenOverride = null) {
  const clean = text.trim();

  // 1. If on Main Student Bot (@ThaliMessBot)
  if (!tokenOverride) {
    if (clean.startsWith('/start')) return handleStartMember(chatId, username, clean, tokenOverride);
    if (clean.startsWith('/menu') || clean.startsWith('/rsvp')) return handleMenu(chatId, tokenOverride);
    if (clean.startsWith('/pass')) return handlePass(chatId, tokenOverride);
    if (clean.startsWith('/balance')) return handleBalance(chatId, tokenOverride);

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
      `*Thali.com Mess Assistant Commands*

/menu - View today's mess menu and RSVP
/pass - Access your digital QR pass
/balance - Check active meal balance

Note: Keep this chat unmuted to receive emergency mess notices.`,
      getMemberMainMenuKeyboard(),
      tokenOverride
    );
  }

  // 2. If on Dedicated Admin Bot (@ThaliAdminBot)
  // Check if currently authenticated
  if (!isAuthorizedAdmin(chatId)) {
    // Check if user entered a 4-digit PIN to authenticate
    if (/^\d{4,6}$/.test(clean)) {
      return verifyAdminPin(chatId, clean, tokenOverride);
    }
    return sendAdminAuthPrompt(chatId, tokenOverride);
  }

  // Authenticated Admin handling interactive states
  const state = getAdminState(chatId);

  // Awaiting Custom Broadcast Text
  if (state.awaiting === 'custom_broadcast_text') {
    state.tempData.pendingBroadcast = clean;
    state.awaiting = null;
    const previewMsg = `📢 *Broadcast Announcement Preview*
----------------------------------------
${clean}
----------------------------------------
Kya aap yeh announcement sabhi registered students ko bhejna chahte hain?`;
    return sendMessage(chatId, previewMsg, getBroadcastConfirmKeyboard(), tokenOverride);
  }

  // Awaiting Custom Mess OFF Reason
  if (state.awaiting === 'messoff_custom_reason') {
    const period = state.tempData.period;
    state.awaiting = null;
    return handleMessOffAskConfirm(chatId, period, clean, tokenOverride);
  }

  // Awaiting Member Lookup
  if (state.awaiting === 'member_lookup_query') {
    state.awaiting = null;
    return handleMemberLookup(chatId, clean, tokenOverride);
  }

  // Awaiting Menu Update Items
  if (state.awaiting === 'menu_update_items') {
    const period = state.tempData.period;
    state.awaiting = null;
    return handleSetMenu(chatId, period, clean, tokenOverride);
  }

  // Direct Slash Commands on Admin Bot
  if (clean.startsWith('/start') || clean.startsWith('/admin') || clean.startsWith('/panel')) {
    return handleAdminPanel(chatId, tokenOverride);
  }
  if (clean.startsWith('/users') || clean.startsWith('/members') || clean.startsWith('/subscribers')) {
    return handleBotUsersReport(chatId, tokenOverride);
  }
  if (clean.startsWith('/logout')) {
    removeAdminChat(chatId);
    clearAdminAwaiting(chatId);
    return sendMessage(chatId, `🔒 Logged out successfully.`, null, tokenOverride);
  }
  if (clean.startsWith('/messoff')) {
    return handleMessOffPrompt(chatId, tokenOverride);
  }
  if (clean.startsWith('/messon')) {
    const today = getTodayDateString();
    const closures = readMessClosures()[today] || {};
    return sendMessage(chatId, `🟢 Select period to reopen:`, getReopenSelectKeyboard(closures), tokenOverride);
  }
  if (clean.startsWith('/broadcast')) {
    const textMsg = clean.replace('/broadcast', '').trim();
    if (textMsg) {
      state.tempData.pendingBroadcast = textMsg;
      return sendMessage(chatId, `📢 *Preview:*\n${textMsg}\n\nBroadcast to all members?`, getBroadcastConfirmKeyboard(), tokenOverride);
    }
    return sendMessage(chatId, `📢 Select announcement preset or custom:`, getBroadcastTemplatesKeyboard(), tokenOverride);
  }
  if (clean.startsWith('/member')) {
    const q = clean.replace('/member', '').trim();
    if (q) return handleMemberLookup(chatId, q, tokenOverride);
    state.awaiting = 'member_lookup_query';
    return sendMessage(chatId, `🔍 Type Member ID (e.g. \`M-112\`) or Phone number:`, null, tokenOverride);
  }
  if (clean.startsWith('/headcount')) {
    return handleHeadcountReport(chatId, tokenOverride);
  }
  if (clean.startsWith('/ledger')) {
    return handleDailyLedger(chatId, tokenOverride);
  }

  // Default: Return Admin Panel
  return handleAdminPanel(chatId, tokenOverride);
}

// -------------------------------------------------------------
// Polling Engines
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

          if (chatId) {
            recordBotSubscriber(chatId, msg.from, 'student_bot');
          }

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
          const cq = update.callback_query;
          console.log(`🔘 [MainBot] Button clicked: "${cq.data}" by chat ${cq.message?.chat?.id}`);
          if (cq.message?.chat?.id) {
            recordBotSubscriber(cq.message.chat.id, cq.from, 'student_bot');
          }
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

          if (chatId) {
            recordBotSubscriber(chatId, msg.from, 'admin_bot');
          }

          // If admin sent contact verification
          if (msg.contact) {
            await verifyAdminContact(chatId, msg.contact, ADMIN_BOT_TOKEN);
          } else {
            await handleTextMessage(chatId, username, text, ADMIN_BOT_TOKEN);
          }
        }

        if (update.callback_query) {
          const cq = update.callback_query;
          console.log(`🔘 [AdminBot] Button clicked: "${cq.data}" by chat ${cq.message?.chat?.id}`);
          if (cq.message?.chat?.id) {
            recordBotSubscriber(cq.message.chat.id, cq.from, 'admin_bot');
          }
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

async function syncBotProfiles() {
  try {
    // 1. Student Bot (@ThaliMessBot)
    await callTelegram('setMyName', { name: 'Thali Mess Assistant' });
    await callTelegram('setMyDescription', {
      description: `Thali Mess Assistant is the official dining companion for Thali.com members. Use it to view daily menus, check meal balances, and access your digital QR pass.\n\nCommands:\n/menu - View today's mess menu and RSVP\n/pass - Access your digital QR pass\n/balance - Check active meal balance\n\nWebsite:\nhttps://thali.com`
    });
    await callTelegram('setMyShortDescription', {
      short_description: 'Official dining assistant for Thali.com members.'
    });

    // 2. Admin Bot (@ThaliAdminBot)
    if (ADMIN_BOT_TOKEN) {
      await callTelegram('setMyName', { name: 'Thali Admin Portal' }, ADMIN_BOT_TOKEN);
      await callTelegram('setMyDescription', {
        description: `Thali Admin Portal is the management console for Thali.com administrators. Use it to broadcast notices, declare mess closures, inspect kitchen headcount, and manage memberships.\n\nCommands:\n/panel - Open admin console\n/headcount - View kitchen attendance forecast\n/broadcast - Send announcement to members\n/status - Check mess status`
      }, ADMIN_BOT_TOKEN);
      await callTelegram('setMyShortDescription', {
        short_description: 'Administrative console for Thali.com mess management.'
      }, ADMIN_BOT_TOKEN);
    }
    console.log('Bot descriptions, names & intro metadata synchronized.');
  } catch (err) {
    console.warn('Note on syncBotProfiles:', err.message);
  }
}

async function start() {
  console.log('🤖 Connecting to Telegram Bot API...');

  await syncBotProfiles();

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
    console.log('ℹ️ Note: TELEGRAM_ADMIN_BOT_TOKEN not set in .env.');
  }
}

start();
