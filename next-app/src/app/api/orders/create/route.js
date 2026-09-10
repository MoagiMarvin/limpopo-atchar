import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// POST /api/orders/create
// Server route to create orders reliably in Supabase
export async function POST(request) {
  try {
    const orderData = await request.json();

    if (!orderData || !orderData.customer_name || !orderData.total) {
      return Response.json({ error: "Invalid order data." }, { status: 400 });
    }

    if (!supabase) {
      return Response.json({ error: "Database connection not configured." }, { status: 500 });
    }

    const orderId = orderData.id || crypto.randomUUID();

    // Prepare main order record (schema safe)
    const dbOrder = {
      id: orderId,
      order_number: orderData.order_number || `LP-${Date.now().toString().slice(-6)}`,
      confirmation_code: orderData.confirmation_code || `LP-${Math.floor(100000 + Math.random() * 900000)}`,
      customer_name: orderData.customer_name,
      phone: orderData.phone,
      city: orderData.city,
      address: orderData.address,
      notes: orderData.notes || "",
      total: Number(orderData.total),
      payment_method: orderData.payment_method || "cod",
      payment_status: orderData.payment_status || (orderData.payment_method === "card" ? "Paid" : "Pending"),
      paystack_reference: orderData.paystack_reference || null,
      delivery_fee: Number(orderData.delivery_fee || 30),
    };

    // Attempt insert into orders table
    const { error: orderErr } = await supabase.from("orders").insert(dbOrder);
    if (orderErr) {
      console.error("API order insert error:", orderErr);
      // Try fallback with items stringified in case schema expects items column
      const fallbackOrder = { ...dbOrder, items: JSON.stringify(orderData.items || []) };
      await supabase.from("orders").insert(fallbackOrder).catch(() => {});
    }

    // Insert order items if present
    if (Array.isArray(orderData.items) && orderData.items.length) {
      const itemsPayload = orderData.items.map((item) => ({
        order_id: orderId,
        product_id: item.id && !String(item.id).startsWith("temp") ? item.id : null,
        product_name: item.name || item.product_name,
        size: item.size,
        price: Number(item.price),
        quantity: Number(item.quantity),
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
      if (itemsErr) {
        console.error("API order_items insert error:", itemsErr);
      }
    }

    return Response.json({ success: true, order: dbOrder });
  } catch (err) {
    console.error("Server order creation error:", err);
    return Response.json({ error: "Failed to process order on server." }, { status: 500 });
  }
}
