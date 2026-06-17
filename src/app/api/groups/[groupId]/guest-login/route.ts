import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections } from "@/lib/firebase/collections";

export async function GET(
  request: Request,
  props: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await props.params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  try {
    const db = getAdminDb();
    const inviteRef = db.collection(Collections.invites).doc(token);
    const snap = await inviteRef.get();

    if (!snap.exists) {
      return new NextResponse("Invalid or expired invite link", { status: 404 });
    }

    const inviteData = snap.data();
    if (inviteData?.groupId !== groupId) {
      return new NextResponse("Token group mismatch", { status: 400 });
    }

    if (inviteData?.status !== "pending") {
      return new NextResponse("This invite has already been accepted/used.", { status: 400 });
    }

    const guestUid = inviteData.guestUid;
    if (!guestUid) {
      return new NextResponse("Missing guest member reference", { status: 500 });
    }

    // Set a lightweight cookie tracking the guest identity
    const cookieStore = await cookies();
    cookieStore.set(`guest_session_${groupId}`, guestUid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Also store the guest's name for UI rendering convenience
    cookieStore.set(`guest_name_${groupId}`, inviteData.invitedName || "Guest", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    // Redirect to the guest ledger page
    return NextResponse.redirect(new URL(`/groups/${groupId}/guest`, request.url));
  } catch (error) {
    console.error("Guest login failed:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
