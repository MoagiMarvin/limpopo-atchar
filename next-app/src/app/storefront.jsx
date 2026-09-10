"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const fallbackProducts = [
  { id: "1", name: "Mango Atchar", category: "Mango Atchar", size: "1kg", price: 80, badge: "Best Seller", stock: 50, image: "/mango-atchar.png", active: true },
  { id: "2", name: "Mango Atchar", category: "Mango Atchar", size: "2kg", price: 150, badge: "New", stock: 50, image: "/mango-atchar.png", active: true },
  { id: "3", name: "Mango Atchar", category: "Mango Atchar", size: "5kg", price: 300, badge: "", stock: 30, image: "/mango-atchar.png", active: true },
  { id: "4", name: "Garlic Atchar", category: "Garlic Atchar", size: "1kg", price: 85, badge: "", stock: 50, image: "/mango-atchar-fallback.png", active: true },
  { id: "5", name: "Garlic Atchar", category: "Garlic Atchar", size: "2kg", price: 160, badge: "", stock: 40, image: "/mango-atchar-fallback.png", active: true },
  { id: "6", name: "Hot Chili Atchar", category: "Hot Chili Atchar", size: "1kg", price: 85, badge: "", stock: 50, image: "/mango-atchar-fallback.png", active: true },
  { id: "7", name: "Hot Chili Atchar", category: "Hot Chili Atchar", size: "2kg", price: 160, badge: "", stock: 40, image: "/mango-atchar-fallback.png", active: true },
];

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) 
  : null;

export default function Storefront() {
  const [products, setProducts] = useState(fallbackProducts);
  const [cart, setCart] = useState([]);
  const [productQuantities, setProductQuantities] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [success, setSuccess] = useState(null);
  const [notice, setNotice] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
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

  const categoryItems = useMemo(() => {
    const map = new Map();
    map.set("All", "/mango-atchar.png");
    products.forEach((p) => {
      const cat = p.category || p.name;
      if (cat && !map.has(cat)) {
        map.set(cat, p.image || "/mango-atchar.png");
      }
    });
    return Array.from(map.entries()).map(([name, image]) => ({ name, image }));
  }, [products]);

  const visibleProducts = useMemo(() => {
    return products.filter((product) => product.active !== false && (selectedCategory === "All" || (product.category || product.name) === selectedCategory));
  }, [products, selectedCategory]);

  // Total item count and total monetary price
  const totalItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const total = useMemo(() => cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0), [cart]);

  function getCardQty(prodKey) {
    return productQuantities[prodKey] || 1;
  }

  function setCardQty(prodKey, val) {
    const qty = Math.max(1, Math.min(100, Number(val) || 1));
    setProductQuantities({ ...productQuantities, [prodKey]: qty });
  }

  function addToCart(product, qtyToAdd = 1) {
    if (product.stock <= 0) return setNotice("This size is out of stock.");

    const key = product.id || `${product.name}-${product.size}`;
    const existingIndex = cart.findIndex((item) => (item.id && item.id === product.id) || (`${item.name}-${item.size}` === `${product.name}-${product.size}`));

    if (existingIndex > -1) {
      const existing = cart[existingIndex];
      const newQty = existing.quantity + qtyToAdd;
      if (newQty > product.stock) {
        return setNotice(`Stock limit reached! Only ${product.stock} available.`);
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex] = { ...existing, quantity: newQty };
      setCart(updatedCart);
    } else {
      if (qtyToAdd > product.stock) {
        return setNotice(`Only ${product.stock} available in stock.`);
      }
      setCart([...cart, { ...product, quantity: qtyToAdd }]);
    }
    setNotice(`Added ${qtyToAdd}x ${product.name} (${product.size}) to cart.`);
  }

  function updateCartQuantity(index, newQty) {
    if (newQty <= 0) {
      removeCartItem(index);
      return;
    }
    const item = cart[index];
    if (newQty > item.stock) {
      setNotice(`Only ${item.stock} available in stock.`);
      return;
    }
    const updated = [...cart];
    updated[index] = { ...updated[index], quantity: newQty };
    setCart(updated);
  }

  function removeCartItem(index) {
    const item = cart[index];
    setCart(cart.filter((_, i) => i !== index));
    setNotice(`Removed ${item.name} (${item.size}) from cart.`);
  }

  function downloadReceipt(order) {
    const receipt = [
      "LIMPOPO ATCHAR RECEIPT",
      `Order: ${order.order_number}`,
      `Confirmation code: ${order.confirmation_code}`,
      "",
      `Customer: ${order.customer_name}`,
      `Phone: ${order.phone}`,
      `Delivery: ${order.address}, ${order.city}`,
      "Payment: Cash on Delivery",
      "",
      "Items Purchased:",
      ...order.items.map((item) => `- ${item.quantity}x ${item.name} (${item.size}) @ R${item.price} each = R${item.price * item.quantity}`),
      "",
      `Delivery fee: R${order.delivery_fee}`,
      `Total: R${order.total}`
    ].join("\n");

    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([receipt], { type: "text/plain" }));
    link.download = `${order.order_number}-receipt.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (busy || !cart.length) return;
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const code = `LP-${Math.floor(100000 + Math.random() * 900000)}`;
    const order = {
      id: crypto.randomUUID(),
      order_number: `LP-${Date.now().toString().slice(-6)}`,
      confirmation_code: code,
      customer_name: String(form.get("name")),
      phone: String(form.get("phone")),
      city: String(form.get("city")),
      address: String(form.get("address")),
      notes: String(form.get("notes") || ""),
      items: [...cart],
      total: total + deliveryFee,
      payment_method: "cod",
      payment_status: "Pending",
      delivery_fee: deliveryFee
    };

    const receipt = [
      "LIMPOPO ATCHAR ORDER",
      `Confirmation code: ${code}`,
      "",
      `Customer: ${order.customer_name}`,
      `Phone: ${order.phone}`,
      `Delivery: ${order.address}, ${order.city}`,
      "Payment: Cash on Delivery",
      "",
      "Items Ordered:",
      ...cart.map((item) => `- ${item.quantity}x ${item.name} (${item.size}) - R${item.price * item.quantity}`),
      "",
      `Delivery fee: R${deliveryFee}`,
      `Total: R${order.total}`
    ].join("\n");

    const whatsappWindow = window.open(`https://wa.me/27637326719?text=${encodeURIComponent(receipt)}`, "_blank");
    window.localStorage.setItem("lp_last_receipt", JSON.stringify(order));
    setCart([]);
    setCartOpen(false);
    setCheckoutOpen(false);
    setSuccess({ code, order });
    setBusy(false);

    if (supabase) {
      try {
        const saved = await supabase.from("orders").insert(order);
        if (saved.error) throw saved.error;
        const items = cart.map((item) => ({
          order_id: order.id,
          product_id: item.id || null,
          product_name: item.name,
          size: item.size,
          price: item.price,
          quantity: item.quantity
        }));
        await supabase.from("order_items").insert(items);
      } catch {
        setNotice("Order confirmed. Online sync needs attention.");
      }
    }
    if (!whatsappWindow) setNotice("Order confirmed. Please open WhatsApp and send receipt manually.");
  }

  return (
    <>
      <div className="topbar">
        <span>🚚 Free delivery on orders over R500</span>
        <span>🌿 100% Natural Ingredients &nbsp; • &nbsp; Handmade in Small Batches</span>
        <a href="https://wa.me/27637326719" target="_blank" rel="noreferrer">WhatsApp Orders: 063 732 6719</a>
      </div>

      <header className="nav">
        <a className="brand" href="#home">
          LIMPOPO <small>ATCHAR</small><i>Traditional Taste. Homemade with Love.</i>
        </a>
        <nav>
          <a href="#home">Home</a>
          <a href="#shop">Shop</a>
          <a href="#about">About Us</a>
          <a href="#story">Our Story</a>
          <a href="#recipes">Recipes</a>
          <a href="#contact">Contact Us</a>
        </nav>
        <button className="menu" aria-label="Open menu">☰</button>
        <button className="cart-icon" onClick={() => setCartOpen(true)}>
          🛒<b>{totalItemCount}</b>
        </button>
      </header>

      <main id="home">
        <section className="hero">
          <div className="hero-copy">
            <h1>Pure <em>Mango Atchar</em>,<br />Made the Traditional Way</h1>
            <div className="hero-buttons">
              <a href="#shop" className="primary">Shop Mango Atchar &nbsp;→</a>
              <a href="#story" className="secondary">Our Story &nbsp;▷</a>
            </div>
          </div>
        </section>

        <section className="section products-section" id="shop">
          <h2>Choose Your Atchar</h2>
          <div className="categories" role="tablist" aria-label="Atchar categories">
            {categoryItems.map((cat) => (
              <button key={cat.name} className={selectedCategory === cat.name ? "active" : ""} onClick={() => setSelectedCategory(cat.name)}>
                <img src={cat.image} alt={cat.name} onError={(e) => { e.currentTarget.src = "/mango-atchar.png"; }} />
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
          <div className="ornament">— ❧ —</div>

          <div className="products">
            {visibleProducts.map((product) => {
              const prodKey = product.id || `${product.name}-${product.size}`;
              const qty = getCardQty(prodKey);
              return (
                <article className="product" key={prodKey}>
                  <span className="product-tag">{product.badge}</span>
                  <div className="product-photo">
                    <img src={product.image || "/mango-atchar.png"} alt={`${product.name} ${product.size}`} />
                  </div>
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <p className="size-label">Container size: <b>{product.size}</b></p>
                    <div className="price">R{product.price}</div>

                    {/* Quantity Selector on Product Card */}
                    <div className="card-qty-row">
                      <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--muted)" }}>QTY:</label>
                      <div className="qty-controls">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => setCardQty(prodKey, qty - 1)}
                          disabled={qty <= 1}
                        >
                          -
                        </button>
                        <input
                          className="qty-input"
                          type="number"
                          min="1"
                          max={product.stock}
                          value={qty}
                          onChange={(e) => setCardQty(prodKey, e.target.value)}
                        />
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => setCardQty(prodKey, qty + 1)}
                          disabled={qty >= product.stock}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      className="add"
                      onClick={() => addToCart(product, qty)}
                      disabled={product.stock <= 0}
                      style={{ marginTop: "10px" }}
                    >
                      {product.stock <= 0 ? "Out of stock" : `🛒 Add ${qty > 1 ? `${qty}x ` : ""}${product.size} to Cart`}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="story" id="story">
          <h2>Our Story</h2>
          <p>Traditional taste, homemade with love. Limpopo Atchar brings bold mango flavour to your table in convenient plastic tubs.</p>
        </section>
        <section className="story" id="about">
          <h2>About Us</h2>
          <p>Fresh mangoes, traditional preparation and small-batch goodness.</p>
        </section>
        <section className="story" id="recipes">
          <h2>Recipes</h2>
          <p>Serving ideas and recipes coming soon.</p>
        </section>
      </main>

      <footer id="contact">
        <strong>LIMPOPO ATCHAR</strong>
        <a href="https://wa.me/27637326719" target="_blank" rel="noreferrer">WhatsApp Orders: 063 732 6719</a>
        <a href="/admin">Admin</a>
      </footer>

      {/* Cart Drawer with Quantity Controls */}
      {cartOpen && (
        <div className="overlay" onClick={() => setCartOpen(false)}>
          <aside className="drawer" onClick={(event) => event.stopPropagation()}>
            <button className="close" onClick={() => setCartOpen(false)}>×</button>
            <h2>Your Cart ({totalItemCount})</h2>

            {cart.length ? (
              <div className="cart-item-list">
                {cart.map((item, index) => (
                  <div className="cart-row-main" key={`${item.size}-${index}`}>
                    <img className="cart-row-img" src={item.image || "/mango-atchar.png"} alt="" />
                    <div className="cart-row-details">
                      <h4>{item.name}</h4>
                      <p>Container: <b>{item.size}</b> · R{item.price} each</p>
                      
                      {/* Quantity adjustment inside Cart Drawer */}
                      <div className="qty-controls" style={{ marginTop: "4px" }}>
                        <button className="qty-btn" type="button" onClick={() => updateCartQuantity(index, item.quantity - 1)}>-</button>
                        <input
                          className="qty-input"
                          type="number"
                          min="1"
                          max={item.stock}
                          value={item.quantity}
                          onChange={(e) => updateCartQuantity(index, Number(e.target.value))}
                        />
                        <button className="qty-btn" type="button" onClick={() => updateCartQuantity(index, item.quantity + 1)}>+</button>
                      </div>
                    </div>

                    <div className="cart-row-price">
                      <b>R{item.price * item.quantity}</b>
                      <button className="btn-remove-item" type="button" onClick={() => removeCartItem(index)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Your cart is empty.</p>
            )}

            <div style={{ borderTop: "2px solid var(--border)", paddingTop: "16px", marginTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
                <span>Subtotal:</span>
                <b>R{total}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "14px" }}>
                <span>Delivery Fee:</span>
                <b>R{deliveryFee}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", fontSize: "18px", color: "var(--green)" }}>
                <strong>Total Amount:</strong>
                <strong>R{total + deliveryFee}</strong>
              </div>
              <button className="primary full" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }} disabled={!cart.length}>
                Proceed to Checkout
              </button>
            </div>
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <div className="overlay">
          <form className="dialog" onSubmit={submitOrder}>
            <button type="button" className="close" onClick={() => setCheckoutOpen(false)}>×</button>
            <h2>Checkout</h2>
            <input name="name" required placeholder="Full name" />
            <input name="phone" required placeholder="Phone number" />
            <input name="city" required placeholder="Town / City" />
            <textarea name="address" required placeholder="Delivery address" />
            <textarea name="notes" placeholder="Order notes (optional)" />
            <p className="payment">Cash on Delivery · Delivery fee: R{deliveryFee}</p>
            <button className="primary full" disabled={busy}>
              {busy ? "Placing order..." : `Place Order (R${total + deliveryFee})`}
            </button>
          </form>
        </div>
      )}

      {success && (
        <div className="overlay">
          <div className="dialog success">
            <h2>Order Receipt</h2>
            <p>Keep this confirmation code for delivery.</p>
            <code>{success.code}</code>
            <div className="receipt-details">
              <p><b>Order:</b> {success.order.order_number}</p>
              <p><b>Customer:</b> {success.order.customer_name}</p>
              <p><b>Delivery:</b> {success.order.address}, {success.order.city}</p>
              <p><b>Payment:</b> Cash on Delivery</p>
              {success.order.items.map((item, index) => (
                <p key={`${item.size}-${index}`}>
                  <b>{item.quantity}x {item.category || item.name} ({item.size})</b> — R{item.price * item.quantity}
                </p>
              ))}
              <p><b>Delivery fee:</b> R{success.order.delivery_fee}</p>
              <strong>Total: R{success.order.total}</strong>
            </div>
            <div className="receipt-actions">
              <button className="primary" onClick={() => downloadReceipt(success.order)}>Download Receipt</button>
              <button className="secondary" onClick={() => window.print()}>Print / Save PDF</button>
              <button className="secondary" onClick={() => setSuccess(null)}>Continue Shopping</button>
            </div>
          </div>
        </div>
      )}

      {notice && <button className="toast" onClick={() => setNotice("")}>{notice}</button>}
    </>
  );
}
