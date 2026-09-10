import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function POST(request) {
  try {
    const orderData = await request.json();

    if (!orderData || !orderData.customer_name || !orderData.total) {
      return Response.json({ error: "Invalid order data - missing customer name or total." }, { status: 400 });
    }

    if (!supabase) {
      console.error("Supabase client NULL in /api/orders/create. ENV variables check:");
      console.error("  NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "SET" : "MISSING");
      console.error("  SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING");
      console.error("  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "SET" : "MISSING");
      return Response.json({ error: "Database not configured on server. Contact admin.", savedToDb: false }, { status: 500 });
    }

    const itemsList = Array.isArray(orderData.items) ? orderData.items : [];

    const orderId = orderData.id || crypto.randomUUID();
    const orderPayload = {
      id: orderId,
      order_number: orderData.order_number || `LP-${Date.now().toString().slice(-6)}`,
      confirmation_code: orderData.confirmation_code || `LP-${Math.floor(100000 + Math.random() * 900000)}`,
      customer_name: String(orderData.customer_name),
      phone: String(orderData.phone || ""),
      city: String(orderData.city || ""),
      address: String(orderData.address || ""),
      notes: String(orderData.notes || ""),
      total: Number(orderData.total || 0),
      payment_method: String(orderData.payment_method || "cod"),
      payment_status: String(orderData.payment_status || (orderData.payment_method === "card" ? "Paid" : "Pending")),
      paystack_reference: orderData.paystack_reference || null,
      delivery_fee: Number(orderData.delivery_fee || 30),
      status: "New",
    };

    console.log("[API] Inserting order into Supabase:", orderPayload.order_number, "payment:", orderPayload.payment_method);

    const { data: insertedOrder, error: orderError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select()
      .single();

    if (orderError) {
      console.error("[API] ERROR inserting order:", orderError.message, orderError.details || "");
      console.error("[API] Full error object:", JSON.stringify(orderError));
      return Response.json({
        error: "Database error saving order: " + orderError.message,
        details: orderError.details || null,
        savedToDb: false,
      }, { status: 500 });
    }

    console.log("[API] Order inserted successfully. ID:", insertedOrder.id);

    if (itemsList.length > 0) {
      const itemsPayload = itemsList.map((item) => ({
        order_id: insertedOrder.id,
        product_id: item.id && !String(item.id).startsWith("temp") ? item.id : null,
        product_name: String(item.name || item.product_name || "Atchar"),
        size: String(item.size || "1kg"),
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsPayload);

      if (itemsError) {
        console.error("[API] ERROR inserting order_items:", itemsError.message);
        return Response.json({
          success: true,
          savedToDb: true,
          warning: "Order saved but items could not be linked: " + itemsError.message,
          order: insertedOrder,
        }, { status: 201 });
      }
      console.log("[API] Inserted", itemsPayload.length, "order_items successfully.");
    }

    return Response.json({
      success: true,
      savedToDb: true,
      order: { ...insertedOrder, items: itemsList },
    }, { status: 201 });

  } catch (err) {
    console.error("[API] CRASH in order creation:", err);
    return Response.json({ error: "Server crash: " + (err?.message || String(err)), savedToDb: false }, { status: 500 });
  }
}
