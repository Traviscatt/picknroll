import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 2025 NCAA Tournament teams by region for validation
const TEAMS_BY_REGION = {
  South: ["Auburn", "Michigan State", "Iowa State", "Texas A&M", "Michigan", "Ole Miss", "Marquette", "Louisville", "Creighton", "New Mexico", "UC San Diego", "UC Irvine", "Yale", "Lipscomb", "Bryant", "Alabama State"],
  West: ["Florida", "St. John's", "Texas Tech", "Arizona", "Clemson", "Illinois", "Kansas State", "UConn", "Baylor", "Arkansas", "Drake", "Colorado State", "Grand Canyon", "UNC Wilmington", "Omaha", "Norfolk State"],
  East: ["Duke", "Alabama", "Wisconsin", "Tennessee", "Kentucky", "BYU", "Saint Mary's", "Mississippi State", "Georgia", "Vanderbilt", "VCU", "Liberty", "Akron", "Montana", "Robert Morris", "American"],
  Midwest: ["Houston", "Purdue", "Kentucky", "Gonzaga", "Oregon", "Missouri", "UCLA", "Memphis", "Texas", "Utah State", "Xavier", "High Point", "Troy", "Wofford", "SIU Edwardsville", "SIUE"],
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables." },
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
    
    // Determine media type
    let mediaType = "image/jpeg";
    if (file.type === "application/pdf") {
      mediaType = "application/pdf";
    } else if (file.type) {
      mediaType = file.type;
    }

    // For PDFs, we need to handle differently - OpenAI Vision doesn't directly support PDFs
    // For now, we'll return an error for PDFs and suggest using an image
    if (file.type === "application/pdf") {
      return NextResponse.json(
        { 
          error: "PDF processing is not yet supported. Please upload an image (PNG, JPG, HEIC) of your bracket instead.",
          suggestion: "Take a screenshot or photo of your bracket and upload that."
        },
        { status: 400 }
      );
    }

    const prompt = `You are analyzing an NCAA March Madness bracket image. Extract all the picks from this bracket.

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mediaType};base64,${base64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      return NextResponse.json(
        { error: "Failed to extract picks from image" },
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
    console.error("Error processing bracket image:", error);
    return NextResponse.json(
      { error: "Failed to process bracket image" },
      { status: 500 }
    );
  }
}
