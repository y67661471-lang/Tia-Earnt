
import { transaction } from "./db";

type RewardResult = {
  success: boolean;
  duplicate: boolean;
  balance: string;
};

export async function addVerifiedReward(
  userId: string,
  amount: number,
  referenceId: string,
  description: string
): Promise<RewardResult> {
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > 1000000
  ) {
    throw new Error("Invalid reward amount");
  }

  if (
    !/^[a-zA-Z0-9:_-]{8,150}$/.test(referenceId)
  ) {
    throw new Error("Invalid reward reference");
  }

  return transaction(async (client) => {
    const wallet = await client.query(
      `SELECT balance
       FROM wallets
       WHERE user_id = $1
       FOR UPDATE`,
      [userId]
    );

    if (wallet.rowCount !== 1) {
      throw new Error("Wallet not found");
    }

    const inserted = await client.query(
      `INSERT INTO wallet_transactions
         (user_id, amount, transaction_type,
          reference_id, description)
       VALUES ($1, $2, 'reward', $3, $4)
       ON CONFLICT (user_id, reference_id)
       DO NOTHING
       RETURNING id`,
      [userId, amount, referenceId, description]
    );

    if (inserted.rowCount === 0) {
      return {
        success: false,
        duplicate: true,
        balance: String(wallet.rows[0].balance),
      };
    }

    const updated = await client.query(
      `UPDATE wallets
       SET balance = balance + $2,
           total_earned = total_earned + $2,
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING balance`,
      [userId, amount]
    );

    return {
      success: true,
      duplicate: false,
      balance: String(updated.rows[0].balance),
    };
  });
}
