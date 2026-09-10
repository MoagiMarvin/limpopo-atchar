import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const dynamic = "force-dynamic";

// GET /api/orders/list
// Server route to list orders reliably for Admin
export async function GET() {
  try {
    if (!supabase) {
      return Response.json({ orders: [] });
    }

    const { data: orderData, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("API orders list error:", error);
      // Fallback attempt without order_items join if join syntax fails
      const { data: simpleOrders } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      return Response.json({ orders: simpleOrders || [] });
    }

    const formattedOrders = (orderData || []).map((o) => {
      let items = [];
      if (Array.isArray(o.items) && o.items.length) {
        items = o.items;
      } else if (typeof o.items === "string") {
        try { items = JSON.parse(o.items); } catch {}
      }
      if (!items.length && Array.isArray(o.order_items)) {
        items = o.order_items.map((i) => ({
          name: i.product_name || i.name,
          size: i.size,
          price: Number(i.price),
          quantity: Number(i.quantity),
        }));
      }
      return { ...o, items };
    });

    return Response.json({ orders: formattedOrders });
  } catch (err) {
    console.error("Server orders fetch error:", err);
    return Response.json({ orders: [] }, { status: 500 });
  }
}
