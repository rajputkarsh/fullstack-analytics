import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/configs/db";
import { usersTable } from "@/configs/schema";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();

        const email =
            user?.primaryEmailAddress?.emailAddress ??
            user?.emailAddresses?.[0]?.emailAddress;

        if (!user || !email) {
            return NextResponse.json(
                { error: "Unauthorized or missing email address" },
                { status: 401 }
            );
        }

        // Check if user already exists
        const existingUsers = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, email));

        if (existingUsers.length > 0) {
            return NextResponse.json(existingUsers[0]);
        }

        // Insert new user
        const insertedUsers = await db
            .insert(usersTable)
            .values({
                name: user.fullName ?? "",
                email: email,
            })
            .returning();

        return NextResponse.json(insertedUsers[0]);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
    }
}
