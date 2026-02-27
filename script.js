// AutoIndex simple client-side functionality

// State for cart and saved items
const cartItems = [];
const savedItems = [];

// Utility to update cart and saved counters in header
function updateCounters() {
  const cartCount = document.getElementById('cart-count');
  const savedCount = document.getElementById('saved-count');
  if (cartCount) cartCount.textContent = cartItems.length;
  if (savedCount) savedCount.textContent = savedItems.length;
}

// Render the cart drawer contents
function renderCart() {
  const list = document.getElementById('cart-list');
  const totalEl = document.getElementById('cart-total');
  if (!list || !totalEl) return;
  list.innerHTML = '';
  let total = 0;
  cartItems.forEach((item, index) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.name} ($${item.price.toFixed(2)})</span> <button onclick="removeCartItem(${index})">x</button>`;
    list.appendChild(li);
    total += item.price;
  });
  totalEl.textContent = `Total: $${total.toFixed(2)}`;
}

// Render saved valuations
function renderSaved() {
  const list = document.getElementById('saved-list');
  if (!list) return;
  list.innerHTML = '';
  savedItems.forEach((item, index) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.name} ($${item.price.toFixed(2)})</span> <button onclick="removeSavedItem(${index})">x</button>`;
    list.appendChild(li);
  });
}

// Add item to cart
function addToCart(name, price) {
  cartItems.push({ name, price });
  updateCounters();
  renderCart();
}

// Add item to saved valuations
function saveItem(name, price) {
  savedItems.push({ name, price });
  updateCounters();
  renderSaved();
}

// Remove item from cart
function removeCartItem(index) {
  cartItems.splice(index, 1);
  updateCounters();
  renderCart();
}

// Remove item from saved list
function removeSavedItem(index) {
  savedItems.splice(index, 1);
  updateCounters();
  renderSaved();
}

// Toggle drawers
function toggleCart() {
  const drawer = document.getElementById('cart-drawer');
  drawer.classList.toggle('open');
  renderCart();
}

function toggleSaved() {
  const drawer = document.getElementById('saved-drawer');
  drawer.classList.toggle('open');
  renderSaved();
}

// Valuation logic
function getValuation() {
  const part = document.getElementById('part-input').value;
  const vehicle = document.getElementById('vehicle-input').value;
  const zip = document.getElementById('zip-input').value;
  const condition = document.getElementById('condition-select').value;
  if (!part || !vehicle || !zip) {
    alert('Please fill out all valuation fields.');
    return;
  }
  // Simulate valuations: generate min and max within plausible ranges
  const base = Math.floor(Math.random() * 400) + 100; // 100-500
  const spread = Math.floor(Math.random() * 150) + 50; // 50-200
  const low = base;
  const high = base + spread;
  const average = ((low + high) / 2).toFixed(0);
  // Update range bar widths
  const bar = document.getElementById('range-bar');
  if (bar) {
    bar.innerHTML = '';
    // Define segments: Great, Good, Fair, High
    const segments = [
      { label: 'Great Deal', color: '#2ECC40' },
      { label: 'Good Deal', color: '#FFDC00' },
      { label: 'Fair Deal', color: '#FF851B' },
      { label: 'High Price', color: '#FF4136' },
    ];
    segments.forEach((seg) => {
      const span = document.createElement('span');
      span.style.width = '25%';
      span.style.backgroundColor = seg.color;
      span.textContent = seg.label;
      bar.appendChild(span);
    });
    const label = document.getElementById('valuation-range-label');
    if (label) label.textContent = `$${low.toFixed(0)} - $${high.toFixed(0)} (Avg $${average})`;
  }
}

// Attach event listeners after DOM load
document.addEventListener('DOMContentLoaded', () => {
  const valBtn = document.getElementById('valuation-btn');
  if (valBtn) valBtn.addEventListener('click', getValuation);
  updateCounters();
});