import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    body: { type: "string" },
    tone: { type: "string" },
    bullets: { type: "array", items: { type: "string" } },
    essayType: { type: "string" },
    note: { type: "string" }
  },
  required: ["title", "body", "tone", "bullets", "essayType", "note"]
};

const SYSTEM = `You are an IELTS exam question writer. Generate ONE fresh, realistic IELTS General Training writing task of the requested kind and type. Vary the scenario every time so the student gets a genuinely new prompt.

If it is a Task 1 letter:
- body: the scenario in 2-3 sentences addressed to the candidate (e.g. "You recently...", ending with "Write a letter to...").
- tone: the required register, exactly one of "Formal", "Semi-formal", or "Informal".
- bullets: EXACTLY 3 bullet points, each starting with an imperative such as "Describe...", "Explain...", "Say...".
- essayType: "" (empty string).
- note: "" or a very short tip (max 12 words).

If it is a Task 2 essay:
- body: the essay question — a statement followed by the instruction (e.g. "...To what extent do you agree or disagree?").
- essayType: the exact type label you were given.
- tone: "" ; bullets: [].
- note: a very short tip on how to approach it (max 15 words).

title: a short 2-4 word label for the topic. Return ONLY JSON matching the schema.`;

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
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not set on the server." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { kind, type, avoid } = body;

    const kindLabel = kind === "t1"
      ? "Task 1 letter"
      : "Task 2 essay";
    const typeLabel = (type && String(type).trim()) || (kind === "t1" ? "any common letter type" : "any common essay type");

    const seed = Math.random().toString(36).slice(2) + "-" + Date.now();
    const avoidList = Array.isArray(avoid) && avoid.length
      ? "\n\nAlready practised (do NOT reuse any of these, or anything closely similar):\n- " + avoid.slice(0, 12).join("\n- ")
      : "";

    const userContent =
      "KIND: " + kindLabel + "\n" +
      "TYPE: " + typeLabel + "\n" +
      "Invent a NEW, specific, realistic scenario that is clearly different from common textbook examples. Change the setting, the people, the product or service, and the details every time \u2014 be genuinely creative and varied." +
      avoidList +
      "\n\nRandomization token (use it to pick a genuinely different scenario; never mention it in the output): " + seed;

    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 800,
      thinking: { type: "disabled" },
      system: SYSTEM,
      messages: [{ role: "user", content: userContent }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } }
    });

    const block = response.content.find((b) => b.type === "text");
    const data = JSON.parse((block && block.text) || "{}");
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || "Prompt generation failed." });
  }
}
