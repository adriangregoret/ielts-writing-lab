import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    explanation: { type: "string" },
    examples: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          incorrect: { type: "string" },
          correct: { type: "string" },
          note: { type: "string" }
        },
        required: ["incorrect", "correct", "note"]
      }
    },
    exercises: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          prompt: { type: "string" },
          answer: { type: "string" }
        },
        required: ["prompt", "answer"]
      }
    }
  },
  required: ["title", "explanation", "examples", "exercises"]
};

const SYSTEM = `You are an IELTS Writing tutor in the IELTS Advantage (Chris Pell) style. A student has been told to practise ONE specific skill and wants to master it. Produce a short, focused mini-lesson they can work through in a few minutes:
- title: a short, clear title for the skill.
- explanation: a practical explanation of the rule/skill in 3-6 sentences of plain English, including the key patterns or Band 8 phrasing where relevant.
- examples: 3-4 pairs, each with an INCORRECT version, the CORRECT version, and a one-line note explaining why.
- exercises: 4-5 short practice items. Each 'prompt' is a task for the student (a sentence to correct, a gap to fill, or a short rewrite) and 'answer' is the model answer. Keep every exercise focused on this one skill, at IELTS General Training level.
Be concise, practical and encouraging. Return ONLY data matching the JSON schema.`;

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
    const { topic, task } = body;

    if (!topic || String(topic).trim().length < 3) {
      res.status(400).json({ error: "No topic provided." });
      return;
    }

    const taskLabel = task === "t1"
      ? "an IELTS General Training Task 1 letter"
      : task === "t2"
        ? "an IELTS General Training Task 2 essay"
        : "IELTS General Training writing";

    const userContent =
      "Create a mini-lesson so the student can master this skill for " + taskLabel + ".\n\n" +
      "SKILL TO PRACTISE:\n" + String(topic).trim();

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
    res.status(500).json({ error: (err && err.message) || "Lesson generation failed." });
  }
}
