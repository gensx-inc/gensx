import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GenSX } from "@gensx/client";

// Schema for the request body
const createScopedTokenSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  name: z.string().min(1).max(255).optional().default("Genie Copilot Token"),
  expiresAt: z
    .string()
    .datetime()
    .optional()
    .default(() => {
      // Default to 30 days from now
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date.toISOString();
    }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, expiresAt } = createScopedTokenSchema.parse(body);

    const gensx = new GenSX({
      apiKey: process.env.GENSX_API_KEY,
      org: process.env.GENSX_ORG,
      project: process.env.GENSX_PROJECT,
      environment: process.env.GENSX_ENVIRONMENT,
    });

    // Create scoped token with execution scope that includes the userId
    const scopedToken = await gensx.createScopedToken({
      name: `${name} - ${userId}`,
      executionScope: {
        userId,
      },
      projectName: process.env.GENSX_PROJECT!,
      environmentName: process.env.GENSX_ENVIRONMENT,
      permissions: [
        "start",
        "run",
        "progress",
        "output",
        "status",
        "externalTool",
      ],
      expiresAt,
      requiredMatchFields: ["userId"],
    });

    return NextResponse.json({
      success: true,
      token: scopedToken.token,
      id: scopedToken.id,
      expiresAt: scopedToken.expiresAt,
      userId,
    });
  } catch (error) {
    console.error("Error creating scoped token:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create scoped token",
      },
      { status: 500 },
    );
  }
}
