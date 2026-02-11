import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_API_KEY is missing. Available env keys:", Object.keys(process.env).filter(k => k.includes("GOOGLE") || k.includes("API")));
      return NextResponse.json(
        { error: "Google API key not configured. Please add GOOGLE_API_KEY to your environment variables." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    // Determine MIME type (Gemini supports images AND PDFs natively)
    let mimeType = "image/jpeg";
    if (file.type === "application/pdf") {
      mimeType = "application/pdf";
    } else if (file.type) {
      mimeType = file.type;
    }

    const prompt = `You are analyzing an NCAA March Madness bracket. Extract all the picks from this bracket.

The 2025 NCAA Tournament has 4 regions: South, West, East, and Midwest.

For each region, identify the teams that were picked to advance through each round:
- Round of 64 (First Round): 8 games per region
- Round of 32 (Second Round): 4 games per region  
- Sweet 16: 2 games per region
- Elite 8: 1 game per region (determines Final Four team)

Then identify:
- Final Four picks (4 teams, one from each region)
- Championship game picks (2 teams)
- Champion pick (1 team)
- Tiebreaker score if visible (total combined points of championship game)

Return the data as JSON in this exact format:
{
  "regions": {
    "South": {
      "round1": ["team1", "team2", ...8 winners],
      "round2": ["team1", "team2", ...4 winners],
      "sweet16": ["team1", "team2"],
      "elite8": ["regional champion"]
    },
    "West": { ...same structure },
    "East": { ...same structure },
    "Midwest": { ...same structure }
  },
  "finalFour": {
    "semifinal1": { "teams": ["team1", "team2"], "winner": "team" },
    "semifinal2": { "teams": ["team1", "team2"], "winner": "team" }
  },
  "championship": {
    "teams": ["team1", "team2"],
    "winner": "champion team"
  },
  "tiebreaker": null or number,
  "confidence": "high" | "medium" | "low",
  "notes": "any issues or unclear picks"
}

If you cannot read a pick clearly, use null for that value and note it in the notes field.
Only return valid JSON, no other text.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try primary model, fall back to lite if quota exceeded
    let result;
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      result = await model.generateContent([
        prompt,
        { inlineData: { mimeType, data: base64 } },
      ]);
    } catch (primaryError) {
      const msg = primaryError instanceof Error ? primaryError.message : "";
      if (msg.includes("429") || msg.includes("quota") || msg.includes("Resource exhausted")) {
        console.log("Primary model quota exceeded, falling back to gemini-2.0-flash-lite");
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
        result = await fallbackModel.generateContent([
          prompt,
          { inlineData: { mimeType, data: base64 } },
        ]);
      } else {
        throw primaryError;
      }
    }

    const content = result.response.text();

    if (!content) {
      return NextResponse.json(
        { error: "Failed to extract picks from bracket" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extractedData = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { 
          error: "Failed to parse extracted data",
          rawResponse: content 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
      message: "Bracket picks extracted successfully",
    });

  } catch (error) {
    console.error("Error processing bracket:", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("429") || message.includes("quota")) {
      return NextResponse.json(
        { error: "AI service quota exceeded. Please try again later or enter picks manually." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Failed to process bracket. Please try again or enter picks manually." },
      { status: 500 }
    );
  }
}
