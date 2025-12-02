"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { userRegistrationSchema, UserRegistrationInput } from "@/lib/validations/user";
import { isUserAdmin } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createUser(data: UserRegistrationInput) {
  try {
    // Check authentication and admin status
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "You must be logged in to perform this action",
      };
    }

    // Check if user has admin role in any branch
    const hasAdminAccess = await isUserAdmin(session.user.id);
    if (!hasAdminAccess) {
      return {
        success: false,
        error: "You do not have permission to create users",
      };
    }

    // Validate input
    const validation = userRegistrationSchema.safeParse(data);

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0].message,
      };
    }

    const { username, name, email, password, role, branchId } = validation.data;

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return {
        success: false,
        error: "A user with this username already exists",
      };
    }

    // If email is provided, check if it already exists
    if (email && email.trim() !== "") {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        return {
          success: false,
          error: "A user with this email already exists",
        };
      }
    }

    // Check if branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      return {
        success: false,
        error: "Invalid branch selected",
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and assign to branch
    const user = await prisma.user.create({
      data: {
        username,
        name,
        email: email && email.trim() !== "" ? email : null,
        password: hashedPassword,
        userOnBranches: {
          create: {
            branchId,
            role,
          },
        },
      },
      include: {
        userOnBranches: {
          include: {
            branch: true,
          },
        },
      },
    });

    revalidatePath("/dashboard/users");

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      message: "User created successfully",
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function getBranches() {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        restaurant: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      data: branches,
    };
  } catch (error) {
    console.error("Error fetching branches:", error);
    return {
      success: false,
      error: "Failed to fetch branches",
      data: [],
    };
  }
}
