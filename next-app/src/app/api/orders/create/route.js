import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

async function fetchColumnsForTable(tableName) {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from(tableName)
      .select("*")
      .limit(0);
    if (data) {
      return Object.keys(data);
    }
  } catch {
    return null;
  }
  return null;
}

function filterObjectByKeys(obj, allowedKeys) {
  const filtered = {};
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      filtered[key] = obj[key];
    }
  }
  return filtered;
}

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
    const fullPayload = {
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

    console.log("[API] Inserting order into Supabase:", fullPayload.order_number, "payment:", fullPayload.payment_method);

    const insertStrategies = [
      { name: "full_payload", payload: fullPayload },
      { name: "no_paystack_ref", payload: (() => { const { paystack_reference, ...rest } = fullPayload; return rest; })() },
      { name: "no_status_or_paystack", payload: (() => { const { paystack_reference, status, ...rest } = fullPayload; return rest; })() },
      { name: "minimal_safe", payload: {
          id: fullPayload.id,
          order_number: fullPayload.order_number,
          confirmation_code: fullPayload.confirmation_code,
          customer_name: fullPayload.customer_name,
          phone: fullPayload.phone,
          city: fullPayload.city,
          address: fullPayload.address,
          notes: fullPayload.notes,
          total: fullPayload.total,
          payment_method: fullPayload.payment_method,
          payment_status: fullPayload.payment_status,
          delivery_fee: fullPayload.delivery_fee,
        }
      },
    ];

    let insertedOrder = null;
    let lastError = null;
    let strategyUsed = null;

    for (const strategy of insertStrategies) {
      try {
        console.log(`[API] Trying insert strategy: ${strategy.name}...`);
        const { data, error } = await supabase
          .from("orders")
          .insert(strategy.payload)
          .select()
          .single();

        if (!error && data) {
          insertedOrder = data;
          strategyUsed = strategy.name;
          console.log(`[API] SUCCESS with strategy: ${strategy.name}. Order ID:`, insertedOrder.id);
          break;
        } else {
          lastError = error;
          console.warn(`[API] Strategy '${strategy.name}' failed:`, error?.message || "unknown");
        }
      } catch (e) {
        lastError = e;
        console.warn(`[API] Strategy '${strategy.name}' crashed:`, e?.message || String(e));
      }
    }

    if (!insertedOrder) {
      console.error("[API] ALL insert strategies failed. Last error:", lastError?.message || lastError);
      console.error("[API] Full error details:", JSON.stringify(lastError, null, 2));
      return Response.json({
        error: "Database error saving order: " + (lastError?.message || String(lastError)),
        hint: "Run the fix-orders-and-products.sql migration in Supabase SQL Editor to add missing columns.",
        details: lastError?.details || null,
        savedToDb: false,
      }, { status: 500 });
    }

    if (itemsList.length > 0) {
      const itemsPayload = itemsList.map((item) => ({
        order_id: insertedOrder.id,
        product_id: item.id && !String(item.id).startsWith("temp") ? item.id : null,
        product_name: String(item.name || item.product_name || "Atchar"),
        size: String(item.size || "1kg"),
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
      }));

      try {
        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(itemsPayload);

        if (itemsError) {
          console.warn("[API] order_items insert warning:", itemsError.message);
        } else {
          console.log("[API] Inserted", itemsPayload.length, "order_items successfully.");
        }
      } catch (itemsCrash) {
        console.warn("[API] order_items crashed (non-fatal):", itemsCrash?.message || String(itemsCrash));
      }
    }

    return Response.json({
      success: true,
      savedToDb: true,
      strategy: strategyUsed,
      order: { ...insertedOrder, items: itemsList },
    }, { status: 201 });

  } catch (err) {
    console.error("[API] CRASH in order creation:", err);
    return Response.json({ error: "Server crash: " + (err?.message || String(err)), savedToDb: false }, { status: 500 });
  }
}
