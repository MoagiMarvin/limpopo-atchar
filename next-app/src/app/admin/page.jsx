"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const emptyProduct = { name: "Mango Atchar", category: "Mango Atchar", size: "500g", price: 0, badge: "", stock: 0, image: "/mango-atchar.png", active: true };
const statuses = ["New", "Confirmed", "Preparing", "Out for delivery", "Delivered", "Cancelled"];

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState("orders");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadDashboard();
  }, [session]);

  async function loadDashboard() {
    const [{ data: productData, error: productError }, { data: orderData, error: orderError }] = await Promise.all([
      supabase.from("products").select("*").order("name").order("price"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
    ]);
    if (productError || orderError) return setNotice("Could not load dashboard data. Check your database policies.");
    setProducts(productData || []);
    setOrders(orderData || []);
  }

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(login);
    setBusy(false);
    if (error) setNotice(error.message);
  }

  async function saveProduct(product) {
    setBusy(true);
    const payload = { name: product.name, category: product.category || product.name, size: product.size, price: Number(product.price), badge: product.badge || "", stock: Number(product.stock), image: product.image || "/mango-atchar.png", active: product.active !== false };
    const result = product.id ? await supabase.from("products").update(payload).eq("id", product.id) : await supabase.from("products").insert(payload);
    setBusy(false);
    if (result.error) return setNotice(result.error.message);
    setNotice("Product saved.");
    loadDashboard();
  }

  async function deleteProduct(id) {
    if (!window.confirm("Delete this product size?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return setNotice(error.message);
    loadDashboard();
  }

  async function updateOrder(id, field, value) {
    const { error } = await supabase.from("orders").update({ [field]: value }).eq("id", id);
    if (error) return setNotice(error.message);
    setOrders(orders.map((order) => order.id === id ? { ...order, [field]: value } : order));
  }

  if (!session) return <main className="admin-login"><form className="admin-login-card" onSubmit={signIn}><p className="kicker">Limpopo Atchar</p><h1>Admin Login</h1><p>Sign in to manage products, orders, payments and delivery.</p><input type="email" required placeholder="Email address" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} /><input type="password" required placeholder="Password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /><button className="admin-primary" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button><Link href="/">Back to shop</Link>{notice && <p className="admin-error">{notice}</p>}</form></main>;

  const activeOrders = orders.filter((order) => !["Delivered", "Cancelled"].includes(order.status)).length;
  const paidOrders = orders.filter((order) => order.payment_status === "Paid").length;

  return <main className="admin-shell"><aside className="admin-sidebar"><Link href="/" className="admin-brand">LIMPOPO <small>ATCHAR</small></Link><button className={view === "orders" ? "selected" : ""} onClick={() => setView("orders")}>Orders <b>{activeOrders}</b></button><button className={view === "products" ? "selected" : ""} onClick={() => setView("products")}>Products</button><button className={view === "settings" ? "selected" : ""} onClick={() => setView("settings")}>Settings</button><button className="admin-signout" onClick={() => supabase.auth.signOut()}>Sign out</button></aside><section className="admin-content"><header className="admin-topbar"><div><p className="kicker">Operations</p><h1>{view === "orders" ? "Orders" : view === "products" ? "Products" : "Settings"}</h1></div><Link href="/">View shop</Link></header>{notice && <button className="admin-notice" onClick={() => setNotice("")}>{notice}</button>}{view === "orders" && <><div className="admin-metrics"><div><b>{orders.length}</b><span>Total orders</span></div><div><b>{activeOrders}</b><span>Active orders</span></div><div><b>{paidOrders}</b><span>Paid orders</span></div></div><div className="admin-panel"><div className="panel-heading"><h2>Order fulfilment</h2><button onClick={loadDashboard}>Refresh</button></div>{orders.length ? orders.map((order) => <article className="admin-order-card" key={order.id}><div className="order-heading"><div><strong>{order.order_number}</strong><span>{order.confirmation_code} · {new Date(order.created_at).toLocaleString()}</span></div><b>R{order.total}</b></div><div className="order-grid"><p><label>Customer</label>{order.customer_name}<br /><a href={`tel:${order.phone}`}>{order.phone}</a></p><p><label>Delivery location</label>{order.address}<br />{order.city}</p><p><label>Payment</label>{order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method}<br /><select value={order.payment_status || "Pending"} onChange={(event) => updateOrder(order.id, "payment_status", event.target.value)}><option>Pending</option><option>Paid</option><option>Failed</option></select></p><p><label>Fulfilment</label><select value={order.status || "New"} onChange={(event) => updateOrder(order.id, "status", event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select><input placeholder="Delivery estimate" value={order.delivery_eta || ""} onChange={(event) => updateOrder(order.id, "delivery_eta", event.target.value)} /></p></div><p className="order-notes">{order.notes || "No customer notes"}</p><a className="contact-customer" href={`https://wa.me/${String(order.phone).replace(/\D/g, "").replace(/^0/, "27")}`} target="_blank" rel="noreferrer">WhatsApp customer</a></article>) : <p>No orders yet.</p>}</div></>}{view === "products" && <div className="admin-panel"><div className="panel-heading"><h2>Products and container sizes</h2><button onClick={() => setProducts([...products, { ...emptyProduct, temp: true }])}>+ Add size</button></div><div className="admin-product-grid">{products.map((product, index) => <ProductEditor key={product.id || `new-${index}`} product={product} busy={busy} onSave={saveProduct} onDelete={product.id ? deleteProduct : () => setProducts(products.filter((_item, itemIndex) => itemIndex !== index))} />)}</div></div>}{view === "settings" && <div className="admin-panel settings-panel"><h2>Shop settings</h2><label>Business WhatsApp</label><input value="063 732 6719" readOnly /><label>Payment policy</label><p>Cash on Delivery is active. Payment status is confirmed manually by admin until an online payment provider is connected.</p></div>}</section></main>;
}

function ProductEditor({ product, busy, onSave, onDelete }) {
  const [draft, setDraft] = useState(product);
  const [uploading, setUploading] = useState(false);
  const change = (field, value) => setDraft({ ...draft, [field]: value });
  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${draft.id || crypto.randomUUID()}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    const url = data.publicUrl;
    setUploading(false);
    if (url) change("image", url);
  }
  return <details className="admin-product-editor" open={!product.id}><summary style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", listStyle: "none" }}><img style={{ width: "72px", height: "72px", objectFit: "cover", background: "var(--cream)" }} src={draft.image || "/mango-atchar.png"} alt="" onError={(event) => { event.currentTarget.src = "/mango-atchar-fallback.png"; }} /><span><b>{draft.name}</b><small style={{ display: "block", marginTop: "5px", color: "var(--muted)" }}>{draft.size} · R{draft.price} · {draft.stock} in stock</small></span></summary><div className="product-editor-fields"><label>Name<input value={draft.name} onChange={(event) => change("name", event.target.value)} /></label><label>Container size<input value={draft.size} onChange={(event) => change("size", event.target.value)} /></label><label>Price (R)<input type="number" min="0" value={draft.price} onChange={(event) => change("price", event.target.value)} /></label><label>Stock<input type="number" min="0" value={draft.stock} onChange={(event) => change("stock", event.target.value)} /></label><label>Badge<input value={draft.badge || ""} onChange={(event) => change("badge", event.target.value)} placeholder="New or Best Seller" /></label><label>Product image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} disabled={busy || uploading} />{uploading && <small>Uploading image...</small>}<small>Choose an image from your device. It will be saved in product storage.</small></label><label>Visibility<select value={draft.active === false ? "hidden" : "visible"} onChange={(event) => change("active", event.target.value === "visible")}><option value="visible">Visible</option><option value="hidden">Hidden</option></select></label><div className="editor-actions"><button className="admin-primary" onClick={() => onSave(draft)} disabled={busy || uploading}>Save</button><button onClick={onDelete}>Delete</button></div></div></details>;
}
