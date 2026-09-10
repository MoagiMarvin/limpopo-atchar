import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// POST /api/orders/create
export async function POST(request) {
  try {
    const orderData = await request.json();

    if (!orderData || !orderData.customer_name || !orderData.total) {
      return Response.json({ error: "Invalid order data." }, { status: 400 });
    }

    if (!supabase) {
      console.warn("Supabase client null in /api/orders/create. Check ENV variables.");
      return Response.json({ error: "Database client not configured.", savedToDb: false }, { status: 500 });
    }

    // Base order payload
    const basePayload = {
      order_number: orderData.order_number || `LP-${Date.now().toString().slice(-6)}`,
      confirmation_code: orderData.confirmation_code || `LP-${Math.floor(100000 + Math.random() * 900000)}`,
      customer_name: orderData.customer_name,
      phone: String(orderData.phone),
      city: String(orderData.city),
      address: String(orderData.address),
      notes: String(orderData.notes || ""),
      total: Number(orderData.total),
      payment_method: orderData.payment_method || "cod",
      payment_status: orderData.payment_status || (orderData.payment_method === "card" ? "Paid" : "Pending"),
      paystack_reference: orderData.paystack_reference || null,
      delivery_fee: Number(orderData.delivery_fee || 30),
    };

    // Include items if passed
    const itemsList = Array.isArray(orderData.items) ? orderData.items : [];
    
    // Strategy 1: Insert with UUID id and JSON items
    let insertedOrder = null;
    let dbError = null;

    const payloadWithId = {
      id: orderData.id || crypto.randomUUID(),
      ...basePayload,
      items: itemsList,
    };

    const attempt1 = await supabase.from("orders").insert(payloadWithId).select().single();
    if (!attempt1.error && attempt1.data) {
      insertedOrder = attempt1.data;
    } else {
      dbError = attempt1.error;
      console.warn("Attempt 1 (with items json) failed:", attempt1.error?.message);

      // Strategy 2: Insert without items column (if schema uses order_items table or has no items column)
      const payloadWithoutItems = {
        id: orderData.id || crypto.randomUUID(),
        ...basePayload,
      };
      const attempt2 = await supabase.from("orders").insert(payloadWithoutItems).select().single();
      if (!attempt2.error && attempt2.data) {
        insertedOrder = attempt2.data;
      } else {
        console.warn("Attempt 2 (without items) failed:", attempt2.error?.message);

        // Strategy 3: Insert without explicit ID (if DB auto-generates ID)
        const attempt3 = await supabase.from("orders").insert(basePayload).select().single();
        if (!attempt3.error && attempt3.data) {
          insertedOrder = attempt3.data;
        } else {
          console.error("All order insert attempts failed. Last error:", attempt3.error?.message || attempt1.error?.message);
        }
      }
    }

    // Insert order_items table if we have an inserted order ID and items
    const activeOrderId = insertedOrder?.id || orderData.id;
    if (activeOrderId && itemsList.length) {
      const itemsPayload = itemsList.map((item) => ({
        order_id: activeOrderId,
        product_name: item.name || item.product_name || "Atchar",
        size: item.size || "1kg",
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
      if (itemsErr) {
        console.warn("order_items insert notice:", itemsErr.message);
      }
    }

    if (!insertedOrder && dbError) {
      return Response.json({
        success: false,
        error: dbError.message,
        hint: dbError.hint || "Check Supabase table RLS permissions or schema.",
      }, { status: 400 });
    }

    return Response.json({ success: true, savedToDb: true, order: insertedOrder || basePayload });
  } catch (err) {
    console.error("Server order creation crash:", err);
    return Response.json({ error: "Server error processing order." }, { status: 500 });
  }
}

