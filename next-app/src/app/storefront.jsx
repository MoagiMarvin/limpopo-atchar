"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const fallbackProducts = [
  { name: "Mango Atchar", size: "1kg", price: 80, badge: "Best Seller", stock: 20, image: "/mango-atchar.png", active: true },
  { name: "Mango Atchar", size: "2kg", price: 150, badge: "New", stock: 20, image: "/mango-atchar.png", active: true },
  { name: "Mango Atchar", size: "5kg", price: 300, badge: "", stock: 20, image: "/mango-atchar.png", active: true },
  { name: "Mango Atchar", size: "10kg", price: 550, badge: "", stock: 20, image: "/mango-atchar.png", active: true },
];
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) : null;

export default function Storefront() {
  const [products, setProducts] = useState(fallbackProducts);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [success, setSuccess] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const deliveryFee = 30;

  useEffect(() => {
    async function loadProducts() {
      if (!supabase) return;
      const { data } = await supabase.from("products").select("*").eq("active", true).order("name").order("price");
      if (data?.length) setProducts(data);
    }
    loadProducts();
  }, []);

  const visibleProducts = useMemo(() => products.filter((product) => product.active !== false), [products]);
  const total = cart.reduce((sum, item) => sum + Number(item.price), 0);

  function downloadReceipt(order) {
    const receipt = ["LIMPOPO ATCHAR RECEIPT", `Order: ${order.order_number}`, `Confirmation code: ${order.confirmation_code}`, "", `Customer: ${order.customer_name}`, `Phone: ${order.phone}`, `Delivery: ${order.address}, ${order.city}`, "Payment: Cash on Delivery", ...order.items.map((item) => `- ${item.name} (${item.size}) - R${item.price}`), `Delivery fee: R${order.delivery_fee}`, `Total: R${order.total}`].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([receipt], { type: "text/plain" }));
    link.download = `${order.order_number}-receipt.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function addToCart(product) {
    if (product.stock <= 0) return setNotice("This size is out of stock.");
    const next = [...cart, product];
    setCart(next);
    setNotice(`${product.name} ${product.size} added to cart.`);
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const code = `LP-${Math.floor(100000 + Math.random() * 900000)}`;
    const order = { id: crypto.randomUUID(), order_number: `LP-${Date.now().toString().slice(-6)}`, confirmation_code: code, customer_name: String(form.get("name")), phone: String(form.get("phone")), city: String(form.get("city")), address: String(form.get("address")), notes: String(form.get("notes") || ""), items: [...cart], total: total + deliveryFee, payment_method: "cod", payment_status: "Pending", delivery_fee: deliveryFee };
    const receipt = ["LIMPOPO ATCHAR ORDER", `Confirmation code: ${code}`, "", `Customer: ${order.customer_name}`, `Phone: ${order.phone}`, `Delivery: ${order.address}, ${order.city}`, "Payment: Cash on Delivery", `Delivery fee: R${deliveryFee}`, "", "Items:", ...cart.map((item) => `- ${item.name} ${item.size} - R${item.price}`), "", `Total: R${order.total}`].join("\n");
    const whatsappWindow = window.open(`https://wa.me/27637326719?text=${encodeURIComponent(receipt)}`, "_blank");
    window.localStorage.setItem("lp_last_receipt", JSON.stringify(order));
    setCart([]); setCartOpen(false); setCheckoutOpen(false); setSuccess({ code, order }); setBusy(false);
    if (supabase) {
      try {
        const saved = await supabase.from("orders").insert(order);
        if (saved.error) throw saved.error;
        const items = cart.map((item) => ({ order_id: order.id, product_id: item.id || null, product_name: item.name, size: item.size, price: item.price, quantity: 1 }));
        const itemResult = await supabase.from("order_items").insert(items);
        if (itemResult.error) throw itemResult.error;
      } catch { setNotice("Order confirmed. Online sync needs attention."); }
    }
    if (!whatsappWindow) setNotice("Order confirmed. Please open WhatsApp and send the receipt manually.");
  }

  return <>
    <div className="topbar"><span>🚚 Free delivery on orders over R500</span><span>🌿 100% Natural Ingredients &nbsp; • &nbsp; Handmade in Small Batches</span><a href="https://wa.me/27637326719" target="_blank" rel="noreferrer">WhatsApp Orders: 063 732 6719</a></div>
    <header className="nav"><a className="brand" href="#home">LIMPOPO <small>ATCHAR</small><i>Traditional Taste. Homemade with Love.</i></a><nav><a href="#home">Home</a><a href="#shop">Shop</a><a href="#about">About Us</a><a href="#story">Our Story</a><a href="#recipes">Recipes</a><a href="#contact">Contact Us</a></nav><button className="menu" aria-label="Open menu">☰</button><button className="cart-icon" onClick={() => setCartOpen(true)}>🛒<b>{cart.length}</b></button></header>
    <main id="home">
      <section className="hero"><div className="hero-copy"><h1>Pure <em>Mango Atchar</em>,<br />Made the Traditional Way</h1><div className="hero-buttons"><a href="#shop" className="primary">Shop Mango Atchar &nbsp;→</a><a href="#story" className="secondary">Our Story &nbsp;▷</a></div></div></section>
      <section className="section"><h2>Shop by Category</h2><div className="ornament">— ❧ —</div><div className="categories"><button className="active"><img src="/mango-atchar.png" alt="Mango Atchar" />Mango Atchar</button><button onClick={() => setNotice("Garlic Atchar is coming soon.")}><img src="/mango-atchar-fallback.png" alt="Garlic Atchar" />Garlic Atchar</button><button onClick={() => setNotice("Hot Chili Atchar is coming soon.")}><img src="/mango-atchar-fallback.png" alt="Hot Chili Atchar" />Hot Chili</button></div></section>
      <section className="section products-section" id="shop"><h2>Our Mango Atchar</h2><div className="ornament">— ❧ —</div><div className="products">{visibleProducts.map((product) => <article className="product" key={product.id || `${product.name}-${product.size}`}><span className="product-tag">{product.badge}</span><div className="product-photo"><img src={product.image || "/mango-atchar.png"} alt={`${product.name} ${product.size}`} /></div><div className="product-info"><h3>{product.name}</h3><p className="size-label">Container size: <b>{product.size}</b></p><div className="price">R{product.price}</div><button className="add" onClick={() => addToCart(product)} disabled={product.stock <= 0}>{product.stock <= 0 ? "Out of stock" : "🛒 Add to Cart"}</button></div></article>)}</div></section>
      <section className="story" id="story"><h2>Our Story</h2><p>Traditional taste, homemade with love. Limpopo Atchar brings bold mango flavour to your table in convenient plastic tubs.</p></section><section className="story" id="about"><h2>About Us</h2><p>Fresh mangoes, traditional preparation and small-batch goodness.</p></section><section className="story" id="recipes"><h2>Recipes</h2><p>Serving ideas and recipes coming soon.</p></section>
    </main>
    <footer id="contact"><strong>LIMPOPO ATCHAR</strong><a href="https://wa.me/27637326719" target="_blank" rel="noreferrer">WhatsApp Orders: 063 732 6719</a><a href="/admin">Admin</a></footer>
    {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)}><aside className="drawer" onClick={(event) => event.stopPropagation()}><button className="close" onClick={() => setCartOpen(false)}>×</button><h2>Your Cart</h2>{cart.length ? cart.map((item, index) => <div className="cart-row" key={`${item.size}-${index}`}><span>{item.name} ({item.size})</span><b>R{item.price}</b></div>) : <p>Your cart is empty.</p>}<h3>Total: R{total}</h3><button className="primary full" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }} disabled={!cart.length}>Checkout</button></aside></div>}
    {checkoutOpen && <div className="overlay"><form className="dialog" onSubmit={submitOrder}><button type="button" className="close" onClick={() => setCheckoutOpen(false)}>×</button><h2>Checkout</h2><input name="name" required placeholder="Full name" /><input name="phone" required placeholder="Phone number" /><input name="city" required placeholder="Town / City" /><textarea name="address" required placeholder="Delivery address" /><textarea name="notes" placeholder="Order notes (optional)" /><p className="payment">Cash on Delivery · Delivery fee: R{deliveryFee}</p><button className="primary full" disabled={busy}>{busy ? "Placing order..." : "Place Order"}</button></form></div>}
    {success && <div className="overlay"><div className="dialog success"><h2>Order Receipt</h2><p>Keep this confirmation code for delivery.</p><code>{success.code}</code><div className="receipt-details"><p><b>Order:</b> {success.order.order_number}</p><p><b>Customer:</b> {success.order.customer_name}</p><p><b>Delivery:</b> {success.order.address}, {success.order.city}</p><p><b>Payment:</b> Cash on Delivery</p>{success.order.items.map((item, index) => <p key={`${item.size}-${index}`}>{item.name} ({item.size}) <b>R{item.price}</b></p>)}<p><b>Delivery fee:</b> R{success.order.delivery_fee}</p><strong>Total: R{success.order.total}</strong></div><div className="receipt-actions"><button className="primary" onClick={() => downloadReceipt(success.order)}>Download Receipt</button><button className="secondary" onClick={() => window.print()}>Print / Save PDF</button><button className="secondary" onClick={() => setSuccess(null)}>Continue Shopping</button></div></div></div>}
    {notice && <button className="toast" onClick={() => setNotice("")}>{notice}</button>}
  </>;
}
