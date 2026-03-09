import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPaths = ["/deck"];

export async function middlewareAuth(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = protectedPaths.some((path) =>
    pathname === path || pathname.startsWith(`${path}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/sign-in", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

