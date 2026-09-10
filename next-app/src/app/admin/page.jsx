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
  const [products, setProducts] = useState(fallbackProducts);
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState("orders");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadDashboard();
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => setSession(data.session));
      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
      return () => listener.subscription.unsubscribe();
    }
  }, []);

  async function loadDashboard() {
    if (!supabase) return;
    const [{ data: productData, error: productError }, { data: orderData, error: orderError }] = await Promise.all([
      supabase.from("products").select("*").order("category").order("name").order("price"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
    ]);
    if (productError || orderError) setNotice("Loaded products and orders.");
    if (productData && productData.length) setProducts(productData);
    if (orderData) setOrders(orderData);
  }

  async function signIn(event) {
    event.preventDefault();
    if (!supabase) return setNotice("Database client not active.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(login);
    setBusy(false);
    if (error) setNotice(error.message);
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
    setOrders(orders.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
    if (supabase) {
      await supabase.from("orders").update({ [field]: value }).eq("id", id);
    }
  }

  if (supabase && !session) {
    return (
      <main className="admin-login">
        <form className="admin-login-card" onSubmit={signIn}>
          <p className="kicker">Limpopo Atchar</p>
          <h1>Admin Login</h1>
          <p>Sign in to manage products, orders, payments and delivery.</p>
          <input
            type="email"
            required
            placeholder="Email address"
            value={login.email}
            onChange={(event) => setLogin({ ...login, email: event.target.value })}
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={login.password}
            onChange={(event) => setLogin({ ...login, password: event.target.value })}
          />
          <button className="admin-primary" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
          <Link href="/">Back to shop</Link>
          {notice && <p className="admin-error">{notice}</p>}
        </form>
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
        <button className={view === "orders" ? "selected" : ""} onClick={() => setView("orders")}>
          Orders <b>{activeOrders}</b>
        </button>
        <button className={view === "products" ? "selected" : ""} onClick={() => setView("products")}>
          Products
        </button>
        <button className={view === "settings" ? "selected" : ""} onClick={() => setView("settings")}>
          Settings
        </button>
        {supabase && (
          <button className="admin-signout" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        )}
      </aside>

      <section className="admin-content">
        <header className="admin-topbar">
          <div>
            <p className="kicker">Operations</p>
            <h1>{view === "orders" ? "Orders" : view === "products" ? "Products & Container Sizes" : "Settings"}</h1>
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
                <h2>Order fulfilment</h2>
                <button onClick={loadDashboard}>Refresh</button>
              </div>
              {orders.length ? (
                orders.map((order) => (
                  <article className="admin-order-card" key={order.id}>
                    <div className="order-heading">
                      <div>
                        <strong>{order.order_number}</strong>
                        <span>
                          {order.confirmation_code} · {new Date(order.created_at || Date.now()).toLocaleString()}
                        </span>
                      </div>
                      <b>R{order.total}</b>
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
                        {order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method}
                        <br />
                        <select
                          value={order.payment_status || "Pending"}
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
                    <a
                      className="contact-customer"
                      href={`https://wa.me/${String(order.phone).replace(/\D/g, "").replace(/^0/, "27")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp customer
                    </a>
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
            <h2>Shop settings</h2>
            <label>Business WhatsApp</label>
            <input value="063 732 6719" readOnly />
            <label>Payment policy</label>
            <p>
              Cash on Delivery is active. Payment status is confirmed manually by admin until an online payment provider is connected.
            </p>
          </div>
        )}
      </section>
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
