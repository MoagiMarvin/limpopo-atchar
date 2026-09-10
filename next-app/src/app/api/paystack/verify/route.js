// GET /api/paystack/verify?reference=xxx
// Verifies a Paystack payment by reference after the customer completes payment
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return Response.json({ error: "Payment reference is required." }, { status: 400 });
    }

    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const result = await paystackRes.json();

    if (!result.status) {
      return Response.json({ error: result.message || "Verification failed." }, { status: 400 });
    }

    const { status, amount, currency, customer, metadata } = result.data;

    return Response.json({
      success: status === "success",
      status,
      amount: amount / 100, // Convert back from kobo/cents to Rands
      currency,
      customer,
      metadata,
      reference,
    });
  } catch (err) {
    console.error("Paystack verify error:", err);
    return Response.json({ error: "Server error verifying payment." }, { status: 500 });
  }
}
