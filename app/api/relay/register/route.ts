import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const REGISTRATION_TOKEN = process.env.RELAY_REGISTRATION_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { branchId, tunnelUrl, relayApiKey, token } = body;

    // Validate registration token
    if (!REGISTRATION_TOKEN) {
      console.error("RELAY_REGISTRATION_TOKEN not configured");
      return NextResponse.json(
        { success: false, message: "Server not configured for relay registration" },
        { status: 500 }
      );
    }

    if (token !== REGISTRATION_TOKEN) {
      return NextResponse.json(
        { success: false, message: "Invalid registration token" },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!branchId || !tunnelUrl || !relayApiKey) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: branchId, tunnelUrl, relayApiKey" },
        { status: 400 }
      );
    }

    // Validate branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      return NextResponse.json(
        { success: false, message: "Branch not found" },
        { status: 404 }
      );
    }

    // Update branch with relay info
    await prisma.branch.update({
      where: { id: branchId },
      data: {
        relayUrl: tunnelUrl,
        relayApiKey: relayApiKey,
        relayLastSeen: new Date(),
      },
    });

    console.log(`Relay registered for branch ${branchId}: ${tunnelUrl}`);

    return NextResponse.json({
      success: true,
      message: "Relay registered successfully",
    });
  } catch (error) {
    console.error("Relay registration error:", error);
    return NextResponse.json(
      { success: false, message: "Registration failed" },
      { status: 500 }
    );
  }
}
