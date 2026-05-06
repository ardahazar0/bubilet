require("dotenv").config();
const { chromium } = require("playwright");
const TelegramBot = require("node-telegram-bot-api");

// Telegram Bot Token ve Chat ID (GitHub Secrets üzerinden gelecek)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!TELEGRAM_TOKEN || !CHAT_ID) {
  console.error("Lütfen GitHub Secrets (veya .env) üzerinden TELEGRAM_TOKEN ve CHAT_ID ayarlayın.");
  process.exit(1);
}

// GitHub Actions üzerinde sürekli açık kalmasına ("polling") gerek yok
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });
const TARGET_URL = "https://www.bubilet.com.tr/sanatci/sebnem-ferah";

async function checkTicket() {
  console.log(`[${new Date().toISOString()}] Bilet kontrolü yapılıyor...`);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    
    const content = await page.content();
    
    // Sayfadaki etkinlik sayısını HTML içinden bulan regex
    const eventCountMatch = content.match(/>(\d+)<\/span>[^<]*<span>Etkinlik<\/span>/i) || content.match(/(\d+)\s*Etkinlik/i);
    let eventCount = 0;
    if (eventCountMatch && eventCountMatch[1]) {
      eventCount = parseInt(eventCountMatch[1], 10);
    }
    
    const hasTickets = eventCount > 0;

    if (hasTickets) {
      console.log("Bilet bulundu! Mesaj gönderiliyor...");
      await bot.sendMessage(CHAT_ID, `🚨 ŞEBNEM FERAH BİLETİ SATIŞTA OLABİLİR!\nHemen kontrol et: ${TARGET_URL}`);
    } else {
      console.log("Henüz bilet yok.");
    }
    
  } catch (error) {
    console.error("Kontrol sırasında hata oluştu:", error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
    process.exit(0); // GitHub Actions işinin bitmesi için sunucuyu tamamen kapatır
  }
}

checkTicket();
