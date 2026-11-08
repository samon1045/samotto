import admin from 'firebase-admin';
import fetch from 'node-fetch';

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const BOT_USER = {
  uid: "samotto_official_bot",
  authorName: "さもっとー公式Bot 🤖",
  authorPhoto: "https://i.ibb.co/TDtWKs5w/samos2.png",
  authorEmail: "bot@samotto.internal",
  customId: "samotto_bot"
};

async function createBotPost(title, text, tags = ["Bot"]) {
  try {
    await db.collection("posts").add({
      uid: BOT_USER.uid,
      authorName: BOT_USER.authorName,
      authorPhoto: BOT_USER.authorPhoto,
      authorEmail: BOT_USER.authorEmail,
      customId: BOT_USER.customId,
      title: title,
      text: text,
      mediaUrl: "",
      tags: tags,
      likesCount: 0,
      commentsCount: 0,
      likedBy: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`[Bot投稿成功] ${title}`);
  } catch (e) {
    console.error("[Bot投稿エラー]", e);
  }
}

function getCountdownText() {
  const today = new Date();
  const events = [
    { name: "建国記念の日", month: 2, day: 11 },
    { name: "エイプリルフール", month: 4, day: 1 },
    { name: "七夕", month: 7, day: 7 },
    { name: "さもっとー設立1周年記念日", month: 9, day: 1 },
    { name: "ハロウィン", month: 10, day: 31 },
    { name: "クリスマス", month: 12, day: 25 }
  ];

  let messages = [];
  for (const event of events) {
    let eventDate = new Date(today.getFullYear(), event.month - 1, event.day);
    if (today > eventDate && (today.getTime() - eventDate.getTime()) > 86400000) {
      eventDate.setFullYear(today.getFullYear() + 1);
    }
    const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      messages.push(`🎉 本日は「${event.name}」の当日です！🎉`);
    } else if (diffDays > 0 && diffDays <= 3) {
      messages.push(`⏳ ${event.name}まで あと ${diffDays} 日！`);
    }
  }
  return messages.length > 0 ? "\n\n【📅 カウントダウン】\n" + messages.join("\n") : "";
}

async function main() {
  const now = new Date();
  const utcHour = now.getUTCHours();

  console.log(`Botスクリプト実行開始 (UTC時間: ${utcHour}時)`);

  if (utcHour === 23) {
    let weatherText = "☀️ 本日も良い天気になりそうです！";
    try {
      const res = await fetch("https://weather.tsukumijima.net/api/forecast/city/130010");
      const data = await res.json();
      const forecast = data.forecasts[0];
      weatherText = `🌤 【今日の天気 (${data.location.city})】${forecast.telop} (最高: ${forecast.temperature.max?.celsius || '--'}℃)`;
    } catch (e) {}

    const fortunes = ["♈牡羊座: 🌟大吉！新しい一歩を踏み出そう", "♉牡牛座: ✨ラッキーカラーはブルー", "♊双子座: 🎵素敵な出会いがあるかも", "♋蟹座: 🍀リラックスして過ごそう", "♌獅子座: 🔥やる気満々で成果が出る日", "♍乙女座: ☕温かい飲み物で一息つこう", "♎天秤座: 🤝チームワークが鍵になる日", "♏蠍子座: 💡ひらめきが冴えわたる日", "♐射手座: 🌈楽しい予定を立てよう", "♑山羊座: 📚コツコツ努力が実を結ぶ日", "♒水瓶座: 🚀新しいガジェットに触れてみよう", "♓魚座: 🎨直感を信じて行動しよう"];
    const todayFortune = fortunes[Math.floor(Math.random() * fortunes.length)];

    const countdown = getCountdownText();
    const text = `みなさん、おはようございます！☀️\n今日も一日、自分のペースで頑張りましょう！\n\n${weatherText}\n\n🔮 【今日のラッキー占い】\n${todayFortune}${countdown}`;

    await createBotPost("☀️ 朝のデイリーアナウンス", text, ["Bot", "朝の挨拶", "ニュース"]);
  }

  if (utcHour === 14) {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    try {
      const snap = await db.collection("posts").where("createdAt", ">=", startOfDay).get();
      let posts = [];
      snap.forEach(doc => {
        const data = doc.data();
        if (data.uid !== BOT_USER.uid) {
          const score = (data.likesCount || 0) * 2 + (data.commentsCount || 0) * 3;
          posts.push({ title: data.title || data.text.slice(0, 20), author: data.authorName, score });
        }
      });

      posts.sort((a, b) => b.score - a.score);
      const top3 = posts.slice(0, 3);

      let reportText = "今夜も一日お疲れ様でした！🌙\n今日「さもっとー」で特に盛り上がった投稿トップ3です！🏆\n\n";
      if (top3.length === 0) {
        reportText += "本日は穏やかな一日でした。明日もたくさんの投稿をお待ちしています！";
      } else {
        top3.forEach((p, idx) => {
          const medal = idx === 0 ? "🥇 1位" : idx === 1 ? "🥈 2位" : "🥉 3位";
          reportText += `${medal}: 「${p.title}...」 (by ${p.author})\n`;
        });
      }

      await createBotPost("🌙 ナイト・リポート（今日のハイライト）", reportText, ["Bot", "ナイトリポート"]);
    } catch (e) {
      console.error("ナイトリポート生成エラー", e);
    }
  }

  // --- 3. 地震速報チェック (10分おきに実行) ---
  try {
    const res = await fetch("https://api.p2pquake.net/v2/history?codes=551&limit=1");
    const data = await res.json();
    if (data && data.length > 0) {
      const eq = data[0];
      const maxScale = eq.earthquake?.maxScale;
      if (maxScale >= 30) {
        const scaleMap = { 30: "3", 40: "4", 45: "5弱", 50: "5強", 55: "6弱", 60: "6強", 70: "7" };
        const scaleText = scaleMap[maxScale] || "不明";
        const location = eq.earthquake?.hypocenter?.name || "日本近海";
        
        const eqMessage = `🚨 【地震速報】\n震度${scaleText}の地震が発生しました。\n\n📍 震源地: ${location}\n🌊 津波の心配: ${eq.earthquake?.domesticTsunami || '情報確認中'}\n\n身の安全を第一に、落ち着いて行動してください。`;
        
        const recentCheck = await db.collection("posts")
          .where("tags", "array-contains", "地震速報")
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();

        let shouldPost = true;
        if (!recentCheck.empty) {
          const lastPost = recentCheck.docs[0].data();
          if (lastPost.text.includes(location)) {
            shouldPost = false; 
          }
        }

        if (shouldPost) {
          await createBotPost("🚨 地震速報", eqMessage, ["地震", "地震速報"]);
        }
      }
    }
  } catch (e) {}
}

main().then(() => process.exit(0));
