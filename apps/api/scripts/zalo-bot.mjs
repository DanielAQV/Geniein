#!/usr/bin/env node
// Zalo 봇 설정 CLI. apps/api/.env 의 ZALO_BOT_TOKEN / ZALO_WEBHOOK_SECRET 을 읽는다.
//
//   node scripts/zalo-bot.mjs me
//   node scripts/zalo-bot.mjs set-webhook https://genie.geniein.com/zalo/webhook
//   node scripts/zalo-bot.mjs webhook-info
//   node scripts/zalo-bot.mjs delete-webhook
//   node scripts/zalo-bot.mjs send <chat_id> "xin chào"          # Zalo API 직접 (이력에 안 남음)
//
// 게이트웨이를 거치는 것 (손잡이 표·이력 사용, ADMIN_SERVICE_TOKEN 필요):
//   node scripts/zalo-bot.mjs contacts                           # 말 걸 수 있는 사람
//   node scripts/zalo-bot.mjs notify <zalo_user_id|all> "텍스트"  # 먼저 말 걸기
//   node scripts/zalo-bot.mjs notify <zalo_user_id|all> --photo https://… "캡션"
//
// API 모양은 텔레그램 Bot API 와 같다: POST <base>/bot<TOKEN>/<method> (JSON).
// 공식 문서: https://bot.zapps.me/docs

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
loadEnv(resolve(here, '..', '.env'));

const BASE = (process.env.ZALO_API_BASE ?? 'https://bot-api.zapps.me').replace(/\/+$/, '');
const TOKEN = (process.env.ZALO_BOT_TOKEN ?? '').trim();
const SECRET = (process.env.ZALO_WEBHOOK_SECRET ?? '').trim();

const GATEWAY = (process.env.ZALO_GATEWAY_URL ?? `http://127.0.0.1:${process.env.PORT ?? '3101'}`).replace(/\/+$/, '');
const ADMIN = (process.env.ADMIN_SERVICE_TOKEN ?? '').trim();

const [command, ...args] = process.argv.slice(2);

if (!TOKEN) fail('ZALO_BOT_TOKEN 이 apps/api/.env 에 없습니다');

switch (command) {
  case 'contacts':
    await gateway('GET', '/zalo/contacts');
    break;
  case 'notify': {
    const [to, ...rest] = args;
    if (!to) fail('사용법: notify <zalo_user_id|all> "텍스트" | --photo <https URL> "캡션"');
    const body = { to };
    if (rest[0] === '--photo') {
      body.photo_url = rest[1];
      if (rest.slice(2).length) body.caption = rest.slice(2).join(' ');
    } else {
      body.text = rest.join(' ');
    }
    await gateway('POST', '/zalo/notify', body);
    break;
  }
  case 'me':
    await call('getMe', 'GET');
    break;
  case 'set-webhook': {
    const url = args[0];
    if (!url) fail('사용법: set-webhook <https URL>');
    if (!SECRET) fail('ZALO_WEBHOOK_SECRET 이 apps/api/.env 에 없습니다 (openssl rand -hex 24)');
    await call('setWebhook', 'POST', { url, secret_token: SECRET });
    break;
  }
  case 'webhook-info':
    await call('getWebhookInfo', 'GET');
    break;
  case 'delete-webhook':
    await call('deleteWebhook', 'DELETE');
    break;
  case 'send': {
    const [chatId, ...words] = args;
    const text = words.join(' ');
    if (!chatId || !text) fail('사용법: send <chat_id> <text>');
    await call('sendMessage', 'POST', { chat_id: chatId, text });
    break;
  }
  default:
    fail('명령: me | set-webhook <url> | webhook-info | delete-webhook | send <chat_id> <text>');
}

async function gateway(verb, path, body) {
  if (!ADMIN) fail('ADMIN_SERVICE_TOKEN 이 apps/api/.env 에 없습니다 (게이트웨이 호출에 필요)');
  const res = await fetch(`${GATEWAY}${path}`, {
    method: verb,
    headers: { 'x-service-token': ADMIN, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  console.log(`${verb} ${path} → HTTP ${res.status}`);
  console.log(typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2));
  if (!res.ok) process.exit(1);
}

async function call(method, verb, body) {
  const res = await fetch(`${BASE}/bot${TOKEN}/${method}`, {
    method: verb,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  // 토큰은 URL 에 있으므로 URL 은 찍지 않는다
  console.log(`${method} → HTTP ${res.status}`);
  console.log(typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2));
  if (!res.ok || parsed?.ok === false) process.exit(1);
}

function loadEnv(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    if (process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
