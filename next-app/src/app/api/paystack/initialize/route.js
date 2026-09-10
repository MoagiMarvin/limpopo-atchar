// POST /api/paystack/initialize
// Creates a Paystack payment transaction and returns the authorization_url
export async function POST(request) {
  try {
    const { email, amount, metadata, callback_url } = await request.json();

    if (!email || !amount) {
      return Response.json({ error: "Email and amount are required." }, { status: 400 });
    }

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Paystack expects amount in KOBO (cents) — for ZAR: rands × 100
        currency: "ZAR",
        callback_url: callback_url || `${request.headers.get("origin")}/`,
        metadata: metadata || {},
        channels: ["card", "bank", "ussd", "mobile_money"],
      }),
    });

    const result = await paystackRes.json();

    if (!result.status) {
      return Response.json({ error: result.message || "Paystack initialization failed." }, { status: 500 });
    }

    return Response.json({
      authorization_url: result.data.authorization_url,
      access_code: result.data.access_code,
      reference: result.data.reference,
    });
  } catch (err) {
    console.error("Paystack initialize error:", err);
    return Response.json({ error: "Server error initializing payment." }, { status: 500 });
  }
}
