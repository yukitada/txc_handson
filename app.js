import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

console.log(process.env)

const app = express();
app.use(bodyParser.json());

// 環境変数から取得
const WXO_URL = process.env.WATSONX_ORCHESTRATE_URL || "";
const WXO_APIKEY = process.env.WATSONX_ORCHESTRATE_APIKEY || "";

// IAMトークン生成
async function getIAMToken(apiKey) {
  if (!apiKey) return null;
  const res = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`
  });
  const data = await res.json();
  return data.access_token;
}

// ユーザーがプルダウンで指定したエージェントIDを取得
async function loadAgentId(token, agentName) {
  try {
    const res = await fetch(`${WXO_URL}/v1/orchestrate/agents`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const text = await res.text();
    console.log("=== RAW Agent API ===");
    console.log(text);

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      return;
    }

    // 配列処理
    if (!Array.isArray(json)) {
      console.error("Agent API response is not an array!", json);
      return;
    }

    // agent idを検索
   const agent = json.find(a => a.name === agentName || a.display_name === agentName);    

   if (!agent) {
      console.error(`Agent not found: ${agentName}`);
      return null;
    }

   return agent.id;   
   console.log("✔ Loaded agent.id:", agent.id);

  } catch (err) {
    console.error("Failed to load agent list:", err);
  }
}

// /chat エンドポイント
app.post("/chat", async (req, res) => {
  const userInput = req.body.message;
  const agentName = req.body.agent;
 
  if (!userInput) return res.status(400).json({ error: "message is required" });
  if (!agentName) return res.status(400).json({ error: "agent is required" });

  try {
    // --- IAMトークン生成 ---
    const token = await getIAMToken(WXO_APIKEY);

    if (!token) {
      return res.status(500).json({ error: "IAM Token could not be generated" });
    }

    // Agent ID を取得
    const agentId = await loadAgentId(token, agentName);
    if (!agentId) return res.status(500).json({ error: `Agent ID not found for ${agentName}` });


    // --- watsonx Orchestrate API呼び出し ---
    const response = await fetch(`${WXO_URL}/v1/orchestrate/${agentId}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
   body: JSON.stringify({
      stream: false,
      messages: [
      {
        role: "user",
        content: userInput
     }
  ]
})
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No response from WXO";

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
          select {
            padding: 10px;
            font-size: 14px;
            border-radius: 5px;
            border: 1px solid #007bff;
            background-color: #e8f0fe;
            color: #003e7e;
            cursor: pointer;
            width: 100%;
            margin-bottom: 10px;
          }
          select:hover {
            background-color: #dbe7ff;
          }

          select:focus {
            outline: none;
            border-color: #0056b3;
            box-shadow: 0 0 3px rgba(0, 123, 255, 0.7);
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
          <select id="agentSelect">
            <option value="AskHR1">AskHR1</option>
            <option value="AskHR2">AskHR2</option>
            <option value="AskHR3">AskHR3</option>
            <option value="AskHR4">AskHR4</option>
            <option value="AskHR5">AskHR5</option>
            <option value="AskHR6">AskHR6</option>
            <option value="AskHR7">AskHR7</option>
            <option value="AskHR8">AskHR8</option>
            <option value="AskHR9">AskHR9</option>
            <option value="AskHR10">AskHR10</option>
            <option value="AskHR11">AskHR11</option>
            <option value="AskHR12">AskHR12</option>
            <option value="AskHR13">AskHR13</option>
            <option value="AskHR14">AskHR14</option>
            <option value="AskHR15">AskHR15</option>
            <option value="AskHR16">AskHR16</option>
            <option value="AskHR17">AskHR17</option>
            <option value="AskHR18">AskHR18</option>
            <option value="AskHR19">AskHR19</option>
            <option value="AskHR20">AskHR20</option>
          </select>
          <input id="msg" placeholder="Say something" />
          <button onclick="send()">Send</button>
          <button id="resetBtn" onclick="resetChat()">Clear</button>
          <button id="envBtn" onclick="showEnv()">Env</button>
         <button id="agentBtn" onclick="showAgent()">Agent</button>
        </div>

        <script>
          async function send() {
            const msgInput = document.getElementById('msg');
            const agentName = document.getElementById('agentSelect').value;
            const msg = msgInput.value.trim();
            if(!msg) return;
            const res = await fetch('/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: msg, agent: agentName })
            });
            const data = await res.json();
            const chatDiv = document.getElementById('chat');
            chatDiv.innerHTML += '<p><b>You:</b> '+msg+'</p>';
            // Botの回答を青色に
            chatDiv.innerHTML += '<p><b>Bot:</b> <span style="color:blue;">'+(data.message||data.error)+'</span></p>';
            chatDiv.scrollTop = chatDiv.scrollHeight;
            msgInput.value = '';
          }

          async function showEnv() {
            const res = await fetch('/env');
            const data = await res.json();
            
            const chatDiv = document.getElementById('chat');
            chatDiv.innerHTML += "<p><b>Env:</b></p><pre>" + JSON.stringify(data, null, 2) + "</pre>";
            chatDiv.scrollTop = chatDiv.scrollHeight;
          }

          async function showAgent() {
           const res = await fetch('/agent');
           const data = await res.json();
           
           const chatDiv = document.getElementById('chat');
           chatDiv.innerHTML += "<p><b>agent.id:</b></p><pre>" + JSON.stringify(data, null, 2) + "</pre>";
           chatDiv.scrollTop = chatDiv.scrollHeight;
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

// --- 起動時にAGENT IDを自動取得 ---
(async () => {
  const token = await getIAMToken(WXO_APIKEY);
  if (token) {
    await loadAgentId(token);
  } else {
    console.error("Failed to get IAM token, cannot load agent ID");
  }
})();

app.listen(port, () => console.log(`Listening on port ${port}`));

// 環境変数を返す
app.get("/env", (req, res) => {
  res.json(process.env);
});

// agent.id を返す
app.get("/agent", (req, res) => {
  res.json({ agent.id });
});



