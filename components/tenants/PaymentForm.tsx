"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/FormControls";
import { SubmitButton, useAction } from "@/components/ui/useAction";
import { submitPaymentAction } from "@/app/actions/applications";

export default function PaymentForm({
  monthlyRent,
  dueDay,
  hasPendingPayment,
}: {
  monthlyRent: string;
  dueDay: number;
  hasPendingPayment: boolean;
}) {
  const [transactionCode, setTransactionCode] = useState("");
  const [amount, setAmount] = useState(Number(monthlyRent));
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const { pending, run } = useAction();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[A-Za-z0-9]{6,15}$/.test(transactionCode.trim())) {
      setError("Enter a valid M-Pesa transaction code, e.g. QKJ3WX2L (6–15 letters/numbers).");
      return;
    }
    if (!amount || amount <= 0) {
      setError("Enter the amount you paid.");
      return;
    }
    run(() =>
      submitPaymentAction({
        transactionCode: transactionCode.trim().toUpperCase(),
        amount: Number(amount),
        paymentDate,
      }),
      { successMessage: "Payment submitted! Awaiting admin confirmation." }
    );
  }

  if (hasPendingPayment) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
        <p className="font-semibold">⏳ You have a payment awaiting confirmation.</p>
        <p className="mt-1">
          Our team is verifying it. You can submit a new payment once it is confirmed or rejected.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="M-Pesa transaction code"
        required
        hint="From the SMS you received after paying, e.g. QKJ3WX2L"
      >
        <Input
          placeholder="e.g. QKJ3WX2L"
          value={transactionCode}
          onChange={(e) => setTransactionCode(e.target.value)}
          required
          maxLength={15}
          className="font-mono uppercase"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount paid (KSh)" required>
          <Input
            type="number"
            min={1}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
          />
        </Field>
        <Field label="Payment date" required>
          <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required max={new Date().toISOString().slice(0, 10)} />
        </Field>
      </div>
      <p className="text-xs text-slate-500">
        Expected rent: <strong>KSh {Number(monthlyRent).toLocaleString()}</strong> · due on the {dueDay}th of the month.
      </p>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      <SubmitButton pending={pending} className="btn-primary w-full">
        Submit Payment
      </SubmitButton>
    </form>
  );
}
