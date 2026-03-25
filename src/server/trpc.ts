import { initTRPC, TRPCError } from "@trpc/server";
import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function createContext() {
  const cookieStore = cookies();
  
  // Get all auth-related cookies
  const sessionToken = cookieStore.get("next-auth.session-token")?.value || 
                       cookieStore.get("__Secure-next-auth.session-token")?.value;
  
  if (!sessionToken) {
    return { session: null, prisma };
  }
  
  try {
    // Use getServerSession instead of getToken
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return { session: null, prisma };
    }

    // Fetch full user data from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        orgId: true,
        organization: {
          select: { slug: true },
        },
      },
    });

    if (!user) {
      return { session: null, prisma };
    }

    return {
      session: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          orgId: user.orgId,
          orgSlug: user.organization?.slug,
        },
        expires: session.expires,
      },
      prisma,
    };
  } catch (error) {
    return { session: null, prisma };
  }
}

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next({
    ctx: {
      session: ctx.session,
      prisma: ctx.prisma,
    },
  });
});

const isOrgMember = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.orgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a member of an organization",
    });
  }
  return next({
    ctx: {
      session: ctx.session,
      prisma: ctx.prisma,
      orgId: ctx.session.user.orgId,
    },
  });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
export const orgProcedure = t.procedure.use(isAuthed).use(isOrgMember);
