import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    bands: {
      type: "object",
      additionalProperties: false,
      properties: {
        task: { type: "number" },
        coherence: { type: "number" },
        lexical: { type: "number" },
        grammar: { type: "number" },
        overall: { type: "number" }
      },
      required: ["task", "coherence", "lexical", "grammar", "overall"]
    },
    mistakes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string" },
          original: { type: "string" },
          correction: { type: "string" },
          explanation: { type: "string" }
        },
        required: ["category", "original", "correction", "explanation"]
      }
    },
    band8_rewrite: { type: "string" },
    practice: { type: "array", items: { type: "string" } }
  },
  required: ["bands", "mistakes", "band8_rewrite", "practice"]
};

const SYSTEM = `You are Chris Pell, an experienced IELTS examiner from the IELTS Advantage YouTube channel, marking a General Training Writing answer.

Follow the official IELTS band descriptors and mark strictly like a real examiner. Score each of the four criteria from 0 to 9 in 0.5 steps:
- Task Achievement (Task 1) / Task Response (Task 2)
- Coherence & Cohesion
- Lexical Resource
- Grammatical Range & Accuracy
The overall band is the average of the four, rounded to the nearest 0.5.

Then:
1) List the student's concrete mistakes. For each, give: a category (Grammar, Vocabulary, Spelling, Cohesion, Register, or Task), the exact original wording, the corrected wording, and a short plain-English explanation. Focus on the errors that most hold the score back. Do not invent errors that are not in the text.
2) Provide a Band 8+ model rewrite that keeps the student's own ideas and message, but fixes accuracy, vocabulary, structure and register. LENGTH IS CRITICAL — write only as much as a strong candidate would under real exam time, and never pad, repeat, or over-explain. Task 1 (a letter): 160-190 words, and NEVER exceed 200. Task 2 (an essay): 250-290 words, and NEVER exceed 300. Count your words and stay within range: be concise, cut redundancy, and make every sentence earn its place. An over-long rewrite is a failure even if it is well written.
3) Give exactly 3 concrete, specific things to practise next.

Be direct, practical and encouraging, in the IELTS Advantage style. Emphasise answering the question fully and clear structure. Return ONLY data matching the required JSON schema — no extra commentary.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }
  const pw = process.env.APP_PASSWORD;
  if (pw && req.headers["x-app-password"] !== pw) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not set on the server. Add it in Vercel → Settings → Environment Variables." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { kind, prompt, bullets, tone, text } = body;

    if (!text || String(text).trim().length < 20) {
      res.status(400).json({ error: "Text is too short to evaluate." });
      return;
    }

    const taskLabel = kind === "t1"
      ? "IELTS General Training Writing Task 1 (a letter)"
      : "IELTS General Training Writing Task 2 (an essay)";

    const lengthRule = kind === "t1"
      ? "The Band 8 rewrite MUST be 160-190 words and must NEVER exceed 200 words. Do not pad it."
      : "The Band 8 rewrite MUST be 250-290 words and must NEVER exceed 300 words. Do not pad it.";

    const promptBlock = String(prompt || "") +
      (kind === "t1" && Array.isArray(bullets) && bullets.length
        ? "\nBullet points to cover:\n- " + bullets.join("\n- ")
        : "");

    const userContent =
      "TASK: " + taskLabel + "\n" +
      (tone ? "REGISTER / TYPE: " + tone + "\n" : "") +
      "\nPROMPT:\n" + promptBlock +
      "\n\nLENGTH REQUIREMENT FOR THE REWRITE: " + lengthRule +
      "\n\nSTUDENT ANSWER:\n" + String(text).trim();

    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2500,
      thinking: { type: "disabled" },
      system: SYSTEM,
      messages: [{ role: "user", content: userContent }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } }
    });

    const block = response.content.find((b) => b.type === "text");
    const data = JSON.parse((block && block.text) || "{}");
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || "AI evaluation failed." });
  }
}
