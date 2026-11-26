const PROVIDERS = {
  gemini: {
    key: process.env.GEMINI_API_KEY,
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    label: "Gemini"
  },
  groq: {
    key: process.env.GROQ_API_KEY,
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
    label: "Groq"
  },
  openrouter: {
    key: process.env.OPENROUTER_API_KEY,
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: process.env.OPENROUTER_MODEL || "openrouter/free",
    label: "OpenRouter"
  }
};
const order = preference => {
  const all = ["gemini", "groq", "openrouter"];
  return preference === "auto" ? all : [preference, ...all.filter(x => x !== preference)];
};
const response = (status, data) => ({
  statusCode: status,
  headers: {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"},
  body: JSON.stringify(data)
});
const configured = () => Object.entries(PROVIDERS).filter(([,p]) => !!p.key).map(([name]) => name);

async function ask(name, messages, requestedModel) {
  const p = PROVIDERS[name];
  if (!p.key) throw new Error(`${p.label}: API key belum dipasang.`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const headers = {"Authorization":`Bearer ${p.key}`,"Content-Type":"application/json"};
    if (name === "openrouter") {
      headers["HTTP-Referer"] = process.env.APP_URL || "https://aether-ai.vercel.app";
      headers["X-Title"] = "AETHER AI";
    }
    const upstream = await fetch(p.url, {
      method:"POST", headers, signal:controller.signal,
      body:JSON.stringify({
        model: requestedModel && requestedModel !== "auto" ? requestedModel : p.model,
        messages, temperature:0.7, max_tokens:4096, stream:false
      })
    });
    const data = await upstream.json().catch(()=>({}));
    if (!upstream.ok) throw new Error(data?.error?.message || data?.message || `HTTP ${upstream.status}`);
    const content = data?.choices?.[0]?.message?.content;
    const reply = typeof content === "string" ? content :
      Array.isArray(content) ? content.map(x=>x.text || "").join("") : "";
    if (!reply.trim()) throw new Error(`${p.label}: jawaban kosong.`);
    return {reply,provider:name,providerLabel:p.label,model:data.model || p.model};
  } finally { clearTimeout(timer); }
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control","no-store");
  if (req.method === "GET") {
    if (req.url.split("?")[0] === "/api/health") {
      return res.status(200).json({ok:true,ready:configured().length>0,providers:configured()});
    }
    return res.status(404).json({error:"Tidak ditemukan."});
  }
  if (req.method !== "POST") return res.status(405).json({error:"Method not allowed"});
  try {
    const input = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    if (!Array.isArray(input.messages) || input.messages.length === 0)
      return res.status(400).json({error:"Pesan chat kosong."});
    const messages = input.messages.slice(-24).map(m => ({
      role:["system","user","assistant"].includes(m.role) ? m.role : "user",
      content:String(m.content || "").slice(0,20000)
    }));
    const pref = ["auto","gemini","groq","openrouter"].includes(input.provider) ? input.provider : "auto";
    const failures = [];
    for (const name of order(pref)) {
      if (!PROVIDERS[name].key) { failures.push(`${PROVIDERS[name].label}: key belum tersedia`); continue; }
      try {
        const result = await ask(name,messages,typeof input.model==="string"?input.model:"auto");
        return res.status(200).json(result);
      } catch (e) { failures.push(e.message || `${PROVIDERS[name].label}: gagal`); }
    }
    return res.status(502).json({error:"Semua provider AI gagal atau belum dikonfigurasi.",details:failures});
  } catch (e) {
    return res.status(400).json({error:e.message || "Permintaan tidak valid."});
  }
};
