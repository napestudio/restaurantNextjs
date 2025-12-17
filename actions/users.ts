"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  userRegistrationSchema,
  userUpdateSchema,
  UserRegistrationInput,
  UserUpdateInput,
} from "@/lib/validations/user";
import { isUserAdmin } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { UserWithBranches } from "@/types/user";

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

    const { username, name, password, role, branchId } = validation.data;

    // Generate email from username
    const email = `${username}@kikusushi.com`;

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

    // Check if generated email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return {
        success: false,
        error: "A user with this email already exists",
      };
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
        email,
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

export async function getUsers(): Promise<{
  success: boolean;
  data?: UserWithBranches[];
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Debes iniciar sesión para realizar esta acción",
      };
    }

    const hasAdminAccess = await isUserAdmin(session.user.id);
    if (!hasAdminAccess) {
      return {
        success: false,
        error: "No tienes permisos para ver usuarios",
      };
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        userOnBranches: {
          select: {
            id: true,
            role: true,
            branch: {
              select: {
                id: true,
                name: true,
                restaurant: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedUsers: UserWithBranches[] = users.map((user) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
      userOnBranches: user.userOnBranches.map((ub) => ({
        id: ub.id,
        name: ub.branch.name,
        role: ub.role,
        restaurant: {
          id: ub.branch.restaurant.id,
          name: ub.branch.restaurant.name,
        },
      })),
    }));

    return {
      success: true,
      data: formattedUsers,
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    return {
      success: false,
      error: "Error al obtener usuarios",
    };
  }
}

export async function updateUser(
  userId: string,
  data: UserUpdateInput
): Promise<{
  success: boolean;
  data?: { id: string; name: string | null; email: string | null };
  error?: string;
  message?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Debes iniciar sesión para realizar esta acción",
      };
    }

    const hasAdminAccess = await isUserAdmin(session.user.id);
    if (!hasAdminAccess) {
      return {
        success: false,
        error: "No tienes permisos para editar usuarios",
      };
    }

    const validation = userUpdateSchema.safeParse(data);

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0].message,
      };
    }

    const { username, name, email, password, role, branchId } = validation.data;

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userOnBranches: true,
      },
    });

    if (!existingUser) {
      return {
        success: false,
        error: "Usuario no encontrado",
      };
    }

    // Check if username is taken by another user
    if (username !== existingUser.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username },
      });

      if (usernameExists) {
        return {
          success: false,
          error: "El nombre de usuario ya existe",
        };
      }
    }

    // Check if email is taken by another user
    if (email && email.trim() !== "" && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return {
          success: false,
          error: "El email ya está en uso",
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
        error: "Sucursal no válida",
      };
    }

    // Prepare update data
    const updateData: {
      username: string;
      name: string;
      email: string | null;
      password?: string;
    } = {
      username,
      name,
      email: email && email.trim() !== "" ? email : null,
    };

    // Only update password if provided
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Update or create branch assignment
    const existingBranchAssignment = existingUser.userOnBranches.find(
      (ub) => ub.branchId === branchId
    );

    if (existingBranchAssignment) {
      // Update role if same branch
      await prisma.userOnBranch.update({
        where: { id: existingBranchAssignment.id },
        data: { role },
      });
    } else {
      // Delete old assignments and create new one
      await prisma.userOnBranch.deleteMany({
        where: { userId },
      });

      await prisma.userOnBranch.create({
        data: {
          userId,
          branchId,
          role,
        },
      });
    }

    revalidatePath("/dashboard/config/users");

    return {
      success: true,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
      },
      message: "Usuario actualizado correctamente",
    };
  } catch (error) {
    console.error("Error updating user:", error);
    return {
      success: false,
      error: "Error al actualizar usuario",
    };
  }
}

export async function deleteUser(userId: string): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Debes iniciar sesión para realizar esta acción",
      };
    }

    const hasAdminAccess = await isUserAdmin(session.user.id);
    if (!hasAdminAccess) {
      return {
        success: false,
        error: "No tienes permisos para eliminar usuarios",
      };
    }

    // Prevent self-deletion
    if (session.user.id === userId) {
      return {
        success: false,
        error: "No puedes eliminar tu propio usuario",
      };
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        assignedOrders: {
          where: {
            status: {
              in: ["PENDING", "IN_PROGRESS"],
            },
          },
        },
      },
    });

    if (!existingUser) {
      return {
        success: false,
        error: "Usuario no encontrado",
      };
    }

    // Check if user has active orders
    if (existingUser.assignedOrders.length > 0) {
      return {
        success: false,
        error: "No se puede eliminar un usuario con pedidos activos",
      };
    }

    // Delete branch assignments first
    await prisma.userOnBranch.deleteMany({
      where: { userId },
    });

    // Delete accounts and sessions
    await prisma.account.deleteMany({
      where: { userId },
    });

    await prisma.session.deleteMany({
      where: { userId },
    });

    // Delete the user
    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/dashboard/config/users");

    return {
      success: true,
      message: "Usuario eliminado correctamente",
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      success: false,
      error: "Error al eliminar usuario",
    };
  }
}
