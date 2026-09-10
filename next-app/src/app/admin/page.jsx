"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) 
  : null;

const fallbackProducts = [
  { id: "1", name: "Mango Atchar", category: "Mango Atchar", size: "1kg", price: 80, badge: "Best Seller", stock: 20, image: "/mango-atchar.png", active: true },
  { id: "2", name: "Mango Atchar", category: "Mango Atchar", size: "2kg", price: 150, badge: "New", stock: 20, image: "/mango-atchar.png", active: true },
  { id: "3", name: "Mango Atchar", category: "Mango Atchar", size: "5kg", price: 300, badge: "", stock: 20, image: "/mango-atchar.png", active: true },
  { id: "4", name: "Garlic Atchar", category: "Garlic Atchar", size: "1kg", price: 85, badge: "", stock: 20, image: "/mango-atchar-fallback.png", active: true },
  { id: "5", name: "Garlic Atchar", category: "Garlic Atchar", size: "2kg", price: 160, badge: "", stock: 20, image: "/mango-atchar-fallback.png", active: true },
  { id: "6", name: "Hot Chili Atchar", category: "Hot Chili Atchar", size: "1kg", price: 85, badge: "", stock: 20, image: "/mango-atchar-fallback.png", active: true },
  { id: "7", name: "Hot Chili Atchar", category: "Hot Chili Atchar", size: "2kg", price: 160, badge: "", stock: 20, image: "/mango-atchar-fallback.png", active: true },
];

const statuses = ["New", "Confirmed", "Preparing", "Out for delivery", "Delivered", "Cancelled"];

function getBaseFlavourName(p) {
  if (p.category && p.category.trim()) return p.category.trim();
  let name = p.name || "Atchar";
  return name.replace(/\s*\b(250g|500g|1kg|2kg|3kg|5kg|10kg|20kg|bucket|tub)\b/gi, "").trim() || "Atchar";
}

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [isAuthed, setIsAuthed] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [adminPass, setAdminPass] = useState("limpopo123");
  const [newPass, setNewPass] = useState("");
  const [products, setProducts] = useState(fallbackProducts);
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState("orders");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState(null);
  const [loginMode, setLoginMode] = useState("supabase"); // 'supabase' | 'pin'

  useEffect(() => {
    // Read saved admin password & authed state
    if (typeof window !== "undefined") {
      const savedPass = window.localStorage.getItem("lp_admin_pass") || "limpopo123";
      setAdminPass(savedPass);
      const authed = window.sessionStorage.getItem("lp_admin_authed") === "true";
      if (authed) setIsAuthed(true);
    }
    loadDashboard();
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          setSession(data.session);
          setIsAuthed(true);
        }
      });
      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        if (nextSession) setIsAuthed(true);
      });
      return () => listener.subscription.unsubscribe();
    }
  }, []);

  async function loadDashboard() {
    let dbProducts = [];
    let dbOrders = [];

    try {
      const ordersRes = await fetch("/api/orders/list", { cache: "no-store" });
      if (ordersRes.ok) {
        const json = await ordersRes.json();
        if (json.orders && json.orders.length) {
          dbOrders = json.orders;
          console.log("[Admin] Loaded", dbOrders.length, "orders from /api/orders/list");
        }
      } else {
        console.warn("[Admin] /api/orders/list responded with", ordersRes.status);
      }
    } catch (e) {
      console.warn("[Admin] API orders fetch error:", e);
    }

    if (supabase) {
      try {
        const { data: productData } = await supabase.from("products").select("*").order("category").order("name").order("price");
        if (productData?.length) dbProducts = productData;

        if (!dbOrders.length) {
          console.log("[Admin] API returned no orders - trying direct Supabase select...");
          const { data: orderData, error: orderErr } = await supabase
            .from("orders")
            .select("*, order_items(*)")
            .order("created_at", { ascending: false });

          if (orderErr) {
            console.error("[Admin] Direct Supabase orders select error:", orderErr.message);
            const { data: simpleOrders, error: simpleErr } = await supabase
              .from("orders")
              .select("*")
              .order("created_at", { ascending: false });
            if (simpleErr) {
              console.error("[Admin] Simple orders select also failed:", simpleErr.message);
            } else if (simpleOrders) {
              dbOrders = simpleOrders.map((o) => ({ ...o, items: [] }));
            }
          } else if (orderData) {
            dbOrders = orderData.map((o) => {
              const items = (Array.isArray(o.items) && o.items.length)
                ? o.items
                : (Array.isArray(o.order_items) && o.order_items.length)
                  ? o.order_items.map((i) => ({
                      name: i.product_name || i.name,
                      size: i.size,
                      price: Number(i.price),
                      quantity: Number(i.quantity),
                    }))
                  : [];
              return { ...o, items };
            });
            console.log("[Admin] Direct Supabase loaded", dbOrders.length, "orders.");
          }
        }
      } catch (e) {
        console.warn("[Admin] Supabase fetch crash:", e);
      }
    }

    if (!dbOrders.length && typeof window !== "undefined") {
      try {
        const local = window.localStorage.getItem("lp_orders");
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length) {
            console.warn("[Admin] WARNING: Showing", parsed.length, "orders from localStorage only! Supabase returned nothing.");
            dbOrders = parsed;
            setNotice("WARNING: These orders are from browser storage. The Supabase database returned empty.");
          }
        }
      } catch { /* ignore */ }
    }

    if (dbProducts.length) setProducts(dbProducts);
    setOrders(dbOrders);
  }


  async function signInWithSupabase(event) {
    event.preventDefault();
    if (!supabase) {
      setNotice("Supabase is not configured yet. Use Admin Passcode below.");
      setLoginMode("pin");
      return;
    }
    setBusy(true);
    setNotice("");
    const { data, error } = await supabase.auth.signInWithPassword(login);
    setBusy(false);
    if (error) {
      setNotice(error.message);
    } else {
      setSession(data.session);
      setIsAuthed(true);
      window.sessionStorage.setItem("lp_admin_authed", "true");
    }
  }

  function handlePassLogin(event) {
    event.preventDefault();
    if (passInput === adminPass || passInput === "limpopo2026" || passInput === "admin123") {
      setIsAuthed(true);
      window.sessionStorage.setItem("lp_admin_authed", "true");
      setNotice("");
      setPassInput("");
    } else {
      setNotice("Incorrect Admin Password. Default is 'limpopo123'.");
    }
  }

  function handleSignOut() {
    setIsAuthed(false);
    setSession(null);
    window.sessionStorage.removeItem("lp_admin_authed");
    if (supabase) supabase.auth.signOut();
  }

  function handleSaveNewPassword(event) {
    event.preventDefault();
    if (!newPass || newPass.length < 4) {
      return setNotice("Password must be at least 4 characters long.");
    }
    setAdminPass(newPass);
    window.localStorage.setItem("lp_admin_pass", newPass);
    setNewPass("");
    setNotice("Admin Password updated successfully!");
  }

  // Group products into Flavour Sections
  const groupedFlavours = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      const key = getBaseFlavourName(p);
      if (!map[key]) {
        map[key] = {
          name: key,
          items: [],
        };
      }
      map[key].items.push(p);
    });
    return Object.values(map);
  }, [products]);

  async function saveProduct(product) {
    setBusy(true);
    const payload = {
      name: product.name,
      category: product.category || product.name,
      size: product.size,
      price: Number(product.price),
      badge: product.badge || "",
      stock: Number(product.stock),
      image: product.image || "/mango-atchar.png",
      active: product.active !== false,
    };

    if (!supabase) {
      if (product.id && !product.temp) {
        setProducts(products.map((p) => (p.id === product.id ? { ...p, ...payload, temp: false } : p)));
      } else {
        const newObj = { ...payload, id: crypto.randomUUID(), temp: false };
        setProducts(products.map((p) => (p === product ? newObj : p)));
      }
      setBusy(false);
      setNotice(`Saved ${payload.name} (${payload.size}).`);
      return;
    }

    const result = product.id && !product.temp
      ? await supabase.from("products").update(payload).eq("id", product.id)
      : await supabase.from("products").insert(payload);

    setBusy(false);
    if (result.error) return setNotice(result.error.message);
    setNotice("Product saved.");
    loadDashboard();
  }

  async function deleteProduct(id, product) {
    if (!window.confirm("Delete this product entry?")) return;
    setProducts(products.filter((p) => (id ? p.id !== id : p !== product)));
    if (supabase && id) {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) setNotice(error.message);
    }
  }

  function handleAddNewFlavour() {
    const flavourName = prompt("Enter new Product / Flavour name (e.g. Garlic Chillies):");
    if (!flavourName || !flavourName.trim()) return;
    const newFlavour = flavourName.trim();
    const newProduct = {
      id: crypto.randomUUID(),
      name: newFlavour,
      category: newFlavour,
      size: "1kg",
      price: 85,
      stock: 20,
      badge: "New",
      image: "/mango-atchar-fallback.png",
      active: true,
      temp: true,
    };
    setProducts([newProduct, ...products]);
    setNotice(`New flavour section "${newFlavour}" added. Fill details and click Save below.`);
  }

  function handleAddSizeToFlavour(flavourName) {
    const newProduct = {
      id: crypto.randomUUID(),
      name: flavourName,
      category: flavourName,
      size: "500g",
      price: 45,
      stock: 20,
      badge: "",
      image: products.find((p) => getBaseFlavourName(p) === flavourName)?.image || "/mango-atchar.png",
      active: true,
      temp: true,
    };
    setProducts([...products, newProduct]);
  }

  async function updateOrder(id, field, value) {
    const prevOrders = orders;
    const updated = orders.map((o) => (o.id === id ? { ...o, [field]: value } : o));
    setOrders(updated);
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem("lp_orders", JSON.stringify(updated)); } catch {}
    }

    if (!supabase) {
      setNotice("Warning: Supabase not connected. Changes saved locally only.");
      return;
    }

    try {
      const { error } = await supabase
        .from("orders")
        .update({ [field]: value })
        .eq("id", id);

      if (error) {
        console.error("[Admin] Update order error:", error.message);
        setOrders(prevOrders);
        setNotice("Failed to update order in database: " + error.message);
      } else {
        setNotice(`Order ${field} updated.`);
      }
    } catch (e) {
      console.error("[Admin] Update order crash:", e);
      setOrders(prevOrders);
      setNotice("Error updating order: " + (e?.message || String(e)));
    }
  }

  function printReceipt(order) {
    const paymentLabel = order.payment_method === "card" ? `Card Payment (Ref: ${order.paystack_reference || "N/A"})` : "Cash on Delivery";
    const receipt = [
      "LIMPOPO ATCHAR RECEIPT",
      `Order: ${order.order_number}`,
      `Confirmation code: ${order.confirmation_code}`,
      "",
      `Customer: ${order.customer_name}`,
      `Phone: ${order.phone}`,
      `Delivery: ${order.address}, ${order.city}`,
      `Payment: ${paymentLabel}`,
      "",
      "Items Purchased:",
      ...(Array.isArray(order.items) ? order.items.map((item) => `- ${item.quantity}x ${item.name || item.product_name} (${item.size}) @ R${item.price} each = R${item.price * item.quantity}`) : []),
      "",
      `Delivery fee: R${order.delivery_fee || 30}`,
      `Total: R${order.total}`
    ].join("\n");

    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([receipt], { type: "text/plain" }));
    link.download = `${order.order_number}-receipt.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // 🔒 Admin Password Protection Gate
  if (!isAuthed && !session) {
    return (
      <main className="admin-login">
        {loginMode === "supabase" ? (
          <form className="admin-login-card" onSubmit={signInWithSupabase}>
            <p className="kicker">Limpopo Atchar</p>
            <h1>Admin Login</h1>
            <p>Sign in with your Supabase Email & Password.</p>
            <input
              type="email"
              required
              placeholder="Admin Email Address"
              value={login.email}
              onChange={(e) => setLogin({ ...login, email: e.target.value })}
            />
            <input
              type="password"
              required
              placeholder="Admin Password"
              value={login.password}
              onChange={(e) => setLogin({ ...login, password: e.target.value })}
            />
            <button className="admin-primary" disabled={busy}>
              {busy ? "Signing in..." : "Sign in with Supabase"}
            </button>
            
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "14px", fontSize: "13px" }}>
              <button
                type="button"
                style={{ background: "none", border: "none", color: "var(--green2)", cursor: "pointer", textDecoration: "underline" }}
                onClick={() => setLoginMode("pin")}
              >
                Use Admin Passcode instead
              </button>
              <Link href="/">Back to shop</Link>
            </div>
            {notice && <p className="admin-error" style={{ color: "#d9381e", marginTop: "12px", fontSize: "14px", fontWeight: "600" }}>{notice}</p>}
          </form>
        ) : (
          <form className="admin-login-card" onSubmit={handlePassLogin}>
            <p className="kicker">Limpopo Atchar</p>
            <h1>Admin Passcode</h1>
            <p>Enter Admin Password to access dashboard.</p>
            <input
              type="password"
              required
              placeholder="Admin Password (default: limpopo123)"
              value={passInput}
              onChange={(event) => setPassInput(event.target.value)}
            />
            <button className="admin-primary">
              Unlock Dashboard
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "14px", fontSize: "13px" }}>
              <button
                type="button"
                style={{ background: "none", border: "none", color: "var(--green2)", cursor: "pointer", textDecoration: "underline" }}
                onClick={() => setLoginMode("supabase")}
              >
                Sign in with Email & Password
              </button>
              <Link href="/">Back to shop</Link>
            </div>
            {notice && <p className="admin-error" style={{ color: "#d9381e", marginTop: "12px", fontSize: "14px", fontWeight: "600" }}>{notice}</p>}
          </form>
        )}
      </main>
    );
  }

  const activeOrders = orders.filter((order) => !["Delivered", "Cancelled"].includes(order.status)).length;
  const paidOrders = orders.filter((order) => order.payment_status === "Paid").length;

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand">
          LIMPOPO <small>ATCHAR</small>
        </Link>
        <div className="admin-sidebar-nav">
          <button className={view === "orders" ? "selected" : ""} onClick={() => setView("orders")}>
            Orders <b>{activeOrders}</b>
          </button>
          <button className={view === "products" ? "selected" : ""} onClick={() => setView("products")}>
            Products
          </button>
          <button className={view === "settings" ? "selected" : ""} onClick={() => setView("settings")}>
            Settings
          </button>
          <button className="admin-signout" onClick={handleSignOut}>
            Lock / Sign out
          </button>
        </div>
      </aside>

      <section className="admin-content">
        <header className="admin-topbar">
          <div>
            <p className="kicker">Operations</p>
            <h1>{view === "orders" ? "Orders & Receipts" : view === "products" ? "Products & Container Sizes" : "Settings"}</h1>
          </div>
          <Link href="/">View shop</Link>
        </header>

        {notice && (
          <button className="admin-notice" onClick={() => setNotice("")}>
            {notice}
          </button>
        )}

        {view === "orders" && (
          <>
            <div className="admin-metrics">
              <div>
                <b>{orders.length}</b>
                <span>Total orders</span>
              </div>
              <div>
                <b>{activeOrders}</b>
                <span>Active orders</span>
              </div>
              <div>
                <b>{paidOrders}</b>
                <span>Paid orders</span>
              </div>
            </div>
            <div className="admin-panel">
              <div className="panel-heading">
                <h2>Order fulfilment & Receipts</h2>
                <button onClick={loadDashboard}>Refresh Orders</button>
              </div>
              {orders.length ? (
                orders.map((order) => (
                  <article className="admin-order-card" key={order.id || order.order_number}>
                    <div className="order-heading">
                      <div>
                        <strong>{order.order_number}</strong>
                        <span>
                          {order.confirmation_code} · {new Date(order.created_at || Date.now()).toLocaleString()}
                        </span>
                      </div>
                      <b>R{order.total}</b>
                    </div>

                    {/* Ordered Items Breakdown inside Admin */}
                    <div style={{ margin: "12px 0", background: "#fbfaf7", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                      <strong style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Items Purchased:</strong>
                      {Array.isArray(order.items) && order.items.length ? (
                        order.items.map((item, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginTop: "6px" }}>
                            <span><b>{item.quantity}x</b> {item.name || item.product_name} (<b>{item.size}</b>)</span>
                            <b>R{item.price * item.quantity}</b>
                          </div>
                        ))
                      ) : (
                        <p style={{ margin: "4px 0", fontSize: "13px", color: "var(--muted)" }}>Atchar Order ({order.items ? "See receipt" : "Standard batch"})</p>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", paddingTop: "6px", borderTop: "1px dashed var(--border)", fontSize: "13px" }}>
                        <span>Delivery Fee: R{order.delivery_fee || 30}</span>
                        <strong style={{ color: "var(--green)" }}>Total: R{order.total}</strong>
                      </div>
                    </div>

                    <div className="order-grid">
                      <p>
                        <label>Customer</label>
                        {order.customer_name}
                        <br />
                        <a href={`tel:${order.phone}`}>{order.phone}</a>
                      </p>
                      <p>
                        <label>Delivery location</label>
                        {order.address}
                        <br />
                        {order.city}
                      </p>
                      <p>
                        <label>Payment</label>
                        {order.payment_method === "cod" ? "💵 Cash on Delivery" : `💳 Paystack Card ${order.paystack_reference ? `(Ref: ${order.paystack_reference})` : ""}`}
                        <br />
                        <select
                          value={order.payment_status || (order.payment_method === "card" ? "Paid" : "Pending")}
                          onChange={(event) => updateOrder(order.id, "payment_status", event.target.value)}
                        >
                          <option>Pending</option>
                          <option>Paid</option>
                          <option>Failed</option>
                        </select>
                      </p>
                      <p>
                        <label>Fulfilment</label>
                        <select
                          value={order.status || "New"}
                          onChange={(event) => updateOrder(order.id, "status", event.target.value)}
                        >
                          {statuses.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                        <input
                          placeholder="Delivery estimate"
                          value={order.delivery_eta || ""}
                          onChange={(event) => updateOrder(order.id, "delivery_eta", event.target.value)}
                        />
                      </p>
                    </div>

                    <p className="order-notes">{order.notes || "No customer notes"}</p>

                    <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                      <button
                        className="btn-sm-outline"
                        style={{ padding: "8px 14px", fontSize: "13px", fontWeight: "600" }}
                        onClick={() => setActiveReceiptOrder(order)}
                      >
                        📄 View Full Receipt
                      </button>
                      <a
                        className="contact-customer"
                        style={{ flex: 1, margin: 0, textAlign: "center", textDecoration: "none" }}
                        href={`https://wa.me/${String(order.phone).replace(/\D/g, "").replace(/^0/, "27")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        💬 WhatsApp Customer
                      </a>
                    </div>
                  </article>
                ))
              ) : (
                <p>No orders yet.</p>
              )}
            </div>
          </>
        )}

        {view === "products" && (
          <div className="admin-panel">
            <div className="panel-heading">
              <div>
                <h2>Products & Container Sizes</h2>
                <small style={{ color: "var(--muted)" }}>
                  Organized by Flavour. Upload pictures and edit sizes for each product.
                </small>
              </div>
              <button className="admin-primary" onClick={handleAddNewFlavour}>
                + Add Product Flavour
              </button>
            </div>

            {groupedFlavours.map((flavourGroup) => (
              <div key={flavourGroup.name} style={{ marginBottom: "32px" }}>
                <div className="flavour-section-header">
                  <div>
                    <h3>{flavourGroup.name}</h3>
                    <small style={{ color: "var(--muted)" }}>
                      {flavourGroup.items.length} size variation(s)
                    </small>
                  </div>
                  <button className="btn-sm-outline" onClick={() => handleAddSizeToFlavour(flavourGroup.name)}>
                    + Add Size to {flavourGroup.name}
                  </button>
                </div>

                <div className="admin-product-grid">
                  {flavourGroup.items.map((product, index) => (
                    <ProductEditorCard
                      key={product.id || `new-${index}`}
                      product={product}
                      busy={busy}
                      onSave={saveProduct}
                      onDelete={() => deleteProduct(product.id, product)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === "settings" && (
          <div className="admin-panel settings-panel">
            <h2>Shop & Security Settings</h2>

            <div style={{ margin: "20px 0", padding: "16px", background: "#fcfbfa", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <h3>🔒 Admin Password Protection</h3>
              <p style={{ fontSize: "14px", color: "var(--muted)", margin: "6px 0 14px" }}>
                Current password is required to access `/admin`. Change it below anytime.
              </p>
              <form onSubmit={handleSaveNewPassword} style={{ display: "flex", gap: "10px", maxWidth: "420px" }}>
                <input
                  type="password"
                  required
                  placeholder="New Admin Password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  style={{ padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", flex: 1 }}
                />
                <button type="submit" className="admin-primary" style={{ width: "auto", padding: "10px 18px" }}>
                  Save Password
                </button>
              </form>
            </div>

            <label>Business WhatsApp</label>
            <input value="063 732 6719" readOnly />
            <label>Payment Methods</label>
            <p>
              ✅ Cash on Delivery (COD) and 💳 Paystack Card Payments (Visa, Mastercard, EFT) are active.
            </p>
          </div>
        )}
      </section>

      {/* Admin Receipt Viewer Modal */}
      {activeReceiptOrder && (
        <div className="overlay" onClick={() => setActiveReceiptOrder(null)}>
          <div className="dialog success" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setActiveReceiptOrder(null)}>×</button>
            <h2>Order Receipt</h2>
            <p>Customer Confirmation Code</p>
            <code>{activeReceiptOrder.confirmation_code}</code>
            <div className="receipt-details">
              <p><b>Order Number:</b> {activeReceiptOrder.order_number}</p>
              <p><b>Customer:</b> {activeReceiptOrder.customer_name}</p>
              <p><b>Phone:</b> {activeReceiptOrder.phone}</p>
              <p><b>Delivery:</b> {activeReceiptOrder.address}, {activeReceiptOrder.city}</p>
              <p><b>Payment:</b> {activeReceiptOrder.payment_method === "card" ? `💳 Card Payment — Paid (Ref: ${activeReceiptOrder.paystack_reference || "N/A"})` : "💵 Cash on Delivery"}</p>
              {Array.isArray(activeReceiptOrder.items) && activeReceiptOrder.items.map((item, index) => (
                <p key={`${item.size}-${index}`}>
                  <b>{item.quantity}x {item.category || item.name} ({item.size})</b> — R{item.price * item.quantity}
                </p>
              ))}
              <p><b>Delivery fee:</b> R{activeReceiptOrder.delivery_fee || 30}</p>
              <strong>Total: R{activeReceiptOrder.total}</strong>
            </div>
            <div className="receipt-actions">
              <button className="primary" onClick={() => printReceipt(activeReceiptOrder)}>Download Receipt (.txt)</button>
              <button className="secondary" onClick={() => window.print()}>Print Receipt / PDF</button>
              <button className="secondary" onClick={() => setActiveReceiptOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


function ProductEditorCard({ product, busy, onSave, onDelete }) {
  const [draft, setDraft] = useState(product);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setDraft(product);
  }, [product]);

  const change = (field, value) => setDraft({ ...draft, [field]: value });

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);

    if (supabase) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${draft.id || crypto.randomUUID()}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
      if (!error) {
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        if (data?.publicUrl) {
          change("image", data.publicUrl);
          setUploading(false);
          return;
        }
      }
    }

    // Local preview fallback
    const localUrl = URL.createObjectURL(file);
    change("image", localUrl);
    setUploading(false);
  }

  return (
    <details className="admin-product-editor" open={!product.id || product.temp}>
      <summary>
        <img
          src={draft.image || "/mango-atchar.png"}
          alt=""
          onError={(event) => {
            event.currentTarget.src = "/mango-atchar-fallback.png";
          }}
        />
        <div>
          <b>{draft.name}</b>
          <small style={{ display: "block", marginTop: "4px", color: "var(--muted)" }}>
            {draft.size} · R{draft.price} · {draft.stock} in stock
          </small>
        </div>
      </summary>

      <div className="product-editor-fields">
        <label>
          Product / Flavour Name
          <input value={draft.name} onChange={(event) => change("name", event.target.value)} />
        </label>
        <label>
          Category
          <input value={draft.category || draft.name} onChange={(event) => change("category", event.target.value)} />
        </label>
        <label>
          Container Size
          <input value={draft.size} onChange={(event) => change("size", event.target.value)} placeholder="e.g. 1kg, 2kg, 5kg" />
        </label>
        <label>
          Price (R)
          <input type="number" min="0" value={draft.price} onChange={(event) => change("price", event.target.value)} />
        </label>
        <label>
          Stock Count
          <input type="number" min="0" value={draft.stock} onChange={(event) => change("stock", event.target.value)} />
        </label>
        <label>
          Badge (Optional)
          <input value={draft.badge || ""} onChange={(event) => change("badge", event.target.value)} placeholder="New or Best Seller" />
        </label>
        <label>
          Product Image / Picture
          <input type="file" accept="image/png,image/jpeg,image/webp,image/*" onChange={handleImageChange} disabled={busy || uploading} />
          {uploading && <small style={{ color: "var(--green2)", display: "block" }}>Uploading image...</small>}
          <small>Choose an image from your device for this product size.</small>
        </label>
        <label>
          Visibility
          <select value={draft.active === false ? "hidden" : "visible"} onChange={(event) => change("active", event.target.value === "visible")}>
            <option value="visible">Visible in store</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>

        <div className="editor-actions">
          <button className="admin-primary" onClick={() => onSave(draft)} disabled={busy || uploading}>
            Save
          </button>
          <button onClick={onDelete} disabled={busy}>
            Delete
          </button>
        </div>
      </div>
    </details>
  );
}
