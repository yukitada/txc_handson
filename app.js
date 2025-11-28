import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

console.log(process.env)

const app = express();
app.use(bodyParser.json());

// 環境変数から取得（TechZone 用に WXO 連携はモック可）
const WXO_URL = process.env.WATSONX_ORCHESTRATE_URL || "";
const WXO_APIKEY = process.env.WATSONX_ORCHESTRATE_APIKEY || "";
console.log(process.env.WATSONX_ORCHESTRATE_URL);
console.log(process.env.WATSONX_ORCHESTRATE_APIKEY);

// IAMトークン生成（実際に連携する場合のみ）
async function getIAMToken(apiKey) {
  if (!apiKey) return null; // モック用
  const res = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`
  });
  const data = await res.json();
  return data.access_token;
}

// /chat エンドポイント
app.post("/chat", async (req, res) => {
  const userInput = req.body.message;
  if (!userInput) return res.status(400).json({ error: "message is required" });

  try {
    // --- IAMトークン生成 ---
    const token = await getIAMToken(WXO_APIKEY);

    if (!token) {
      return res.status(500).json({ error: "IAM Token could not be generated" });
    }

    // --- watsonx Orchestrate API呼び出し ---
    const response = await fetch(`${WXO_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        input: { text: userInput }
      })
    });

    const data = await response.json();

    const reply = data.output?.generic?.[0]?.text || "No response from WXO";

    // --- 応答返却 ---
    return res.json({ message: reply });

  } catch (err) {
    console.error("WXO call failed:", err);
    return res.status(500).json({ error: "Failed to get response from Watsonx Orchestrate" });
  }
});

// シンプルUI + デザイン改善 + Bot回答青色
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Chatbot</title>
        <style>
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: Arial, sans-serif;
            background-color: #f0f2f5;
          }
          #container {
            width: 500px;
            background: white;
            padding: 20px;
            box-shadow: 0px 0px 10px rgba(0,0,0,0.1);
            border-radius: 10px;
          }
          #chat {
            height: 300px;
            overflow-y: auto;
            border: 1px solid #ddd;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 5px;
            background-color: #fafafa;
          }
          input {
            width: calc(100% - 90px);
            padding: 10px;
            font-size: 14px;
            border-radius: 5px;
            border: 1px solid #ccc;
          }
          button {
            padding: 10px 15px;
            font-size: 14px;
            border-radius: 5px;
            border: none;
            background-color: #007bff;
            color: white;
            cursor: pointer;
          }
          button:hover { background-color: #0056b3; }
          #resetBtn {
            background-color: #6c757d;
            margin-top: 10px;
          }
          #resetBtn:hover { background-color: #5a6268; }
        </style>
      </head>
      <body>
        <div id="container">
          <h2 style="text-align:center;">Chatbot</h2>
          <div id="chat"></div>
          <input id="msg" placeholder="Say something" />
          <button onclick="send()">Send</button>
          <button id="resetBtn" onclick="resetChat()">戻る</button>
        </div>

        <script>
          async function send() {
            const msgInput = document.getElementById('msg');
            const msg = msgInput.value.trim();
            if(!msg) return;
            const res = await fetch('/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: msg })
            });
            const data = await res.json();
            const chatDiv = document.getElementById('chat');
            chatDiv.innerHTML += '<p><b>You:</b> '+msg+'</p>';
            // Botの回答を青色に
            chatDiv.innerHTML += '<p><b>Bot:</b> <span style="color:blue;">'+(data.message||data.error)+'</span></p>';
            chatDiv.scrollTop = chatDiv.scrollHeight;
            msgInput.value = '';
          }

          function resetChat() {
            document.getElementById('chat').innerHTML = '';
            document.getElementById('msg').value = '';
          }
        </script>
      </body>
    </html>
  `);
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}`));
