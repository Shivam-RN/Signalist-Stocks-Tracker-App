'use server';

import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection not found');

    // Better Auth stores users in the "user" collection
    const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) return [];

    const userId = (user.id as string) || String(user._id || '');
    if (!userId) return [];

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    console.error('getWatchlistSymbolsByEmail error:', err);
    return [];
  }
}
export async function addStockToWatchlist({
  email,
  symbol,
  name,
  price,
  sector,
}: {
  email: string;
  symbol: string;
  name: string;
  price: number;
  sector?: string;
}) {
  if (!email) throw new Error("Email is required");

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    // 1️⃣ Find user in BetterAuth's "user" collection
    const user = await db.collection("user").findOne<{ id?: string; _id?: unknown }>({ email });
    if (!user) throw new Error("User not found");

    const userId = (user.id as string) || String(user._id || "");
    if (!userId) throw new Error("User ID not found");

    // 2️⃣ Prevent duplicates (same stock added again)
    const existing = await Watchlist.findOne({ userId, symbol });
    if (existing) {
      return { success: false, message: "Already in watchlist" };
    }

    // 3️⃣ Add to watchlist
    await Watchlist.create({
      userId,
      symbol,
      name,
      price,
      sector,
    });

    return { success: true };
  } catch (err) {
    console.error("addStockToWatchlist error:", err);
    return { success: false, message: "Failed to add to watchlist" };
  }
}
