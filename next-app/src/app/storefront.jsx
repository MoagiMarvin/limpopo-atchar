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
  const [paymentMethod, setPaymentMethod] = useState("cod"); // 'cod' | 'card'
  const deliveryFee = 30;

  useEffect(() => {
    async function loadProducts() {
      if (!supabase) return;
      const { data } = await supabase.from("products").select("*").eq("active", true).order("name").order("price");
      if (data?.length) setProducts(data);
    }
    loadProducts();
  }, []);

  // Restore cart AND last receipt from localStorage after hydration (client-only, avoids SSR mismatch)
  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem("lp_cart");
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedReceipt = window.localStorage.getItem("lp_last_receipt");
      if (savedReceipt) {
        const order = JSON.parse(savedReceipt);
        setSuccess({ code: order.confirmation_code, order });
      }
    } catch { /* storage unavailable */ }
  }, []);

  // Save cart to localStorage whenever it changes — survives page refresh
  useEffect(() => {
    try {
      if (cart.length > 0) {
        window.localStorage.setItem("lp_cart", JSON.stringify(cart));
      } else {
        window.localStorage.removeItem("lp_cart");
      }
    } catch { /* storage unavailable */ }
  }, [cart]);

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
    const paymentLabel = order.payment_method === "card" ? "Card Payment (Paid)" : "Cash on Delivery";
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

  async function finaliseOrder({ customerName, phone, city, address, notes, method, paystackRef }) {
    const code = `LP-${Math.floor(100000 + Math.random() * 900000)}`;
    const order = {
      id: crypto.randomUUID(),
      order_number: `LP-${Date.now().toString().slice(-6)}`,
      confirmation_code: code,
      customer_name: customerName,
      phone,
      city,
      address,
      notes: notes || "",
      items: [...cart],
      total: total + deliveryFee,
      payment_method: method,
      payment_status: method === "card" ? "Paid" : "Pending",
      paystack_reference: paystackRef || null,
      delivery_fee: deliveryFee,
    };

    const paymentLabel = method === "card" ? `Card Payment (Ref: ${paystackRef})` : "Cash on Delivery";
    const receipt = [
      "LIMPOPO ATCHAR ORDER",
      `Confirmation code: ${code}`,
      "",
      `Customer: ${order.customer_name}`,
      `Phone: ${order.phone}`,
      `Delivery: ${order.address}, ${order.city}`,
      `Payment: ${paymentLabel}`,
      "",
      "Items Ordered:",
      ...cart.map((item) => `- ${item.quantity}x ${item.name} (${item.size}) - R${item.price * item.quantity}`),
      "",
      `Delivery fee: R${deliveryFee}`,
      `Total: R${order.total}`
    ].join("\n");

    const whatsappWindow = window.open(`https://wa.me/27637326719?text=${encodeURIComponent(receipt)}`, "_blank");
    window.localStorage.setItem("lp_last_receipt", JSON.stringify(order));
    try {
      const existingOrders = JSON.parse(window.localStorage.getItem("lp_orders") || "[]");
      const updatedOrders = [order, ...existingOrders.filter((o) => o.id !== order.id)];
      window.localStorage.setItem("lp_orders", JSON.stringify(updatedOrders.slice(0, 50)));
    } catch { /* storage fallback */ }
    setCart([]);
    setCartOpen(false);
    setCheckoutOpen(false);
    setSuccess({ code, order });
    setBusy(false);

    // Direct Supabase insert (restored exactly as before)
    if (supabase) {
      try {
        const dbOrderPayload = {
          id: order.id,
          order_number: order.order_number,
          confirmation_code: order.confirmation_code,
          customer_name: order.customer_name,
          phone: order.phone,
          city: order.city,
          address: order.address,
          notes: order.notes,
          total: order.total,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          paystack_reference: order.paystack_reference,
          delivery_fee: order.delivery_fee,
        };
        const saved = await supabase.from("orders").insert(dbOrderPayload);
        if (saved.error) {
          console.warn("Direct orders insert attempt 1 error:", saved.error.message);
          // Try with items array if schema expects items column
          await supabase.from("orders").insert(order);
        }

        const itemsPayload = cart.map((item) => ({
          order_id: order.id,
          product_id: item.id && !String(item.id).startsWith("temp") ? item.id : null,
          product_name: item.name,
          size: item.size,
          price: item.price,
          quantity: item.quantity
        }));
        await supabase.from("order_items").insert(itemsPayload);
      } catch (err) {
        console.warn("Direct Supabase insert notice:", err);
      }
    }

    // Sync order with backend database API as secondary layer
    try {
      await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
    } catch (e) {
      console.warn("API order sync notice:", e);
    }

    if (!whatsappWindow) setNotice("Order confirmed! Please click Download Receipt below or send on WhatsApp.");
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (busy || !cart.length) return;
    setBusy(true);

    const form = new FormData(event.currentTarget);
    const customerName = String(form.get("name"));
    const phone = String(form.get("phone"));
    const city = String(form.get("city"));
    const address = String(form.get("address"));
    const notes = String(form.get("notes") || "");
    const email = String(form.get("email") || `${phone.replace(/\s/g, "")}@limpopoatchar.co.za`);

    if (paymentMethod === "cod") {
      await finaliseOrder({ customerName, phone, city, address, notes, method: "cod" });
      return;
    }

    // --- Paystack card payment ---
    try {
      const initRes = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount: total + deliveryFee,
          metadata: {
            customer_name: customerName,
            phone,
            city,
            address,
            notes,
            cart_summary: cart.map((i) => `${i.quantity}x ${i.name} ${i.size}`).join(", "),
          },
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.access_code) {
        setNotice(initData.error || "Could not initialise payment. Please try again.");
        setBusy(false);
        return;
      }

      // Load Paystack inline script and open popup
      const PaystackPop = await loadPaystackScript();
      const handler = PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email,
        amount: (total + deliveryFee) * 100,
        currency: "ZAR",
        ref: initData.reference,
        onClose() {
          setNotice("Payment cancelled. You can try again.");
          setBusy(false);
        },
        callback(response) {
          if (response.status === "success") {
            finaliseOrder({ customerName, phone, city, address, notes, method: "card", paystackRef: response.reference })
              .catch(() => setNotice("Order save failed. Contact us with ref: " + response.reference));
          } else {
            setNotice("Payment was not completed. Please try again.");
            setBusy(false);
          }
        },
      });
      handler.openIframe();
    } catch (err) {
      console.error("Paystack error:", err);
      setNotice("Payment error. Please try again or choose Cash on Delivery.");
      setBusy(false);
    }
  }

  function loadPaystackScript() {
    return new Promise((resolve, reject) => {
      if (window.PaystackPop) return resolve(window.PaystackPop);
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.onload = () => resolve(window.PaystackPop);
      script.onerror = () => reject(new Error("Failed to load Paystack script"));
      document.head.appendChild(script);
    });
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
            <input name="email" type="email" placeholder="Email (for card payment receipt)" />
            <input name="city" required placeholder="Town / City" />
            <textarea name="address" required placeholder="Delivery address" />
            <textarea name="notes" placeholder="Order notes (optional)" />

            {/* Payment method selector */}
            <div className="payment-method-group">
              <p className="payment-method-label">Choose payment method:</p>
              <div className="payment-method-options">
                <label className={`pay-option ${paymentMethod === "cod" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                  />
                  <span className="pay-icon">💵</span>
                  <span>
                    <strong>Cash on Delivery</strong>
                    <small>Pay when your order arrives</small>
                  </span>
                </label>

                <label className={`pay-option ${paymentMethod === "card" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                  />
                  <span className="pay-icon">💳</span>
                  <span>
                    <strong>Pay by Card</strong>
                    <small>Visa, Mastercard, EFT — Secure via Paystack</small>
                  </span>
                </label>
              </div>
            </div>

            <p className="payment">Delivery fee: R{deliveryFee} · Total: <strong>R{total + deliveryFee}</strong></p>

            <button className="primary full" disabled={busy}>
              {busy
                ? paymentMethod === "card" ? "Opening payment..." : "Placing order..."
                : paymentMethod === "card"
                  ? `💳 Pay R${total + deliveryFee} by Card`
                  : `✅ Place Order (R${total + deliveryFee}) — COD`
              }
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
              <p><b>Payment:</b> {success.order.payment_method === "card" ? `💳 Card Payment — Paid (Ref: ${success.order.paystack_reference || "N/A"})` : "💵 Cash on Delivery"}</p>
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
              <button className="secondary" onClick={() => { window.localStorage.removeItem("lp_last_receipt"); setSuccess(null); }}>Continue Shopping</button>
            </div>
          </div>
        </div>
      )}

      {notice && <button className="toast" onClick={() => setNotice("")}>{notice}</button>}
    </>
  );
}
