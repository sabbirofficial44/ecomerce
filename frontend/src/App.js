import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import Admin from './Admin';
import Login from './login';

const firebaseConfig = {
  apiKey: "AIzaSyA90ImxNOiWsR5VAn-p1zHKSoqwhG8pZaQ",
  authDomain: "e-commerce-shop-site.firebaseapp.com",
  projectId: "e-commerce-shop-site",
  storageBucket: "e-commerce-shop-site.firebasestorage.app",
  messagingSenderId: "97870190376",
  appId: "1:97870190376:web:3de3ba20b58b63d51a621d",
  measurementId: "G-4DNX6CBYP0"
};
const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, "");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

function App() {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
    const [products, setProducts] = useState([]);
    const [cat, setCat] = useState('Home');
    
    // --- ডাইনামিক ক্যাটাগরি স্টেট ---
    const [categories, setCategories] = useState(['Home', 'Cloth', 'Gadget', 'Book']);

    const [showAuth, setShowAuth] = useState(false);
    const [showCart, setShowCart] = useState(false);
    const [showWishlist, setShowWishlist] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [isAdminMode, setIsAdminMode] = useState(false);

    // --- নতুন স্টেট (অর্ডার দেখার জন্য) ---
    const [showMyOrders, setShowMyOrders] = useState(false);
    const [userOrders, setUserOrders] = useState([]);
    
    const [cart, setCart] = useState(user?.cart || []);
    const [wishlist, setWishlist] = useState(user?.wishlist || []);

    const [checkoutData, setCheckoutData] = useState({ address: '', phone: '', paymentMethod: 'COD' });

    // ক্যাটাগরি এবং প্রোডাক্ট লোড করা
    useEffect(() => { 
        fetch(`${API_BASE}/products`).then(r => r.json()).then(setProducts); 
        console.log("API URL from Env:", process.env.REACT_APP_API_URL);
        // ক্যাটাগরি লোড করার লজিক
        fetch(`${API_BASE}/categories`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data && data.length > 0) setCategories(data);
                else loadLocalCategories();
            })
            .catch(() => loadLocalCategories());
    }, [isAdminMode]); // অ্যাডমিন প্যানেল বন্ধ করলে রিফ্রেশ হবে

    const loadLocalCategories = () => {
        const localCats = JSON.parse(localStorage.getItem('categories'));
        if (localCats && localCats.length > 0) setCategories(localCats);
    };

    useEffect(() => {
        if (user) {
            fetch(`${API_BASE}/user/sync`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, cart, wishlist })
            });
            localStorage.setItem('user', JSON.stringify({ ...user, cart, wishlist }));
        }
    }, [cart, wishlist, user]);

    // --- ইউজার নিজের অর্ডার দেখার ফাংশন ---
    const fetchUserOrders = async () => {
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE}/user/orders/${user.email}`);
            const data = await res.json();
            setUserOrders(data);
            setShowMyOrders(true);
        } catch (err) {
            alert("Could not fetch orders.");
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const loggedInUser = { name: result.user.displayName, email: result.user.email, role: 'user', cart: [], wishlist: [] };
            setUser(loggedInUser); setCart([]); setWishlist([]); setShowAuth(false);
        } catch (error) {
            console.error("Google Login Error:", error);
            alert("Google Login failed! Check console for details.");
        }
    };

    const handleBuyNow = (product) => {
        if (!user) return setShowAuth(true);
        if (!cart.some(item => item.id === product.id)) {
            setCart([...cart, product]);
        }
        setShowCart(false);
        setShowCheckout(true);
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        const total = cart.reduce((sum, i) => sum + Number(i.price), 0);
        await fetch(`${API_BASE}/place-order`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userEmail: user.email, items: cart, total, ...checkoutData })
        });
        setCart([]); setShowCheckout(false);
        alert(`Order Placed Successfully via ${checkoutData.paymentMethod}!`);
    };

    const filtered = cat === 'Home' ? products : products.filter(p => p.category === cat);
    const cartTotal = cart.reduce((total, item) => total + Number(item.price), 0);

    // Logout Button Style
    const logoutBtnStyle = {
        background: 'transparent',
        border: '1px solid #e94560',
        color: '#e94560',
        padding: '6px 12px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 'bold',
        transition: '0.3s ease'
    };

    return (
        <div style={{ background: '#f8f9fa', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            <nav style={{ background: '#1a1a2e', color: '#fff', padding: '15px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position:'sticky', top:0, zIndex: 1000 }}>
                <h2 onClick={() => {setIsAdminMode(false); setCat('Home')}} style={{cursor:'pointer', color:'#e94560'}}>NoboDeal</h2>
                <div style={{ display: 'flex', gap: '25px' }}>
                    {/* ডাইনামিক ক্যাটাগরি রেন্ডার */}
                    {categories.map(item => (
                        <span key={item} onClick={() => {setCat(item); setIsAdminMode(false)}} style={{cursor:'pointer', color: cat===item ? '#e94560' : '#fff', fontWeight: cat===item?'bold':'normal'}}>{item}</span>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{cursor:'pointer'}} onClick={() => setShowWishlist(true)}>❤️ <b style={{background:'#e94560', borderRadius:'50%', padding:'2px 6px', fontSize:'12px'}}>{wishlist.length}</b></div>
                    <div style={{cursor:'pointer'}} onClick={() => setShowCart(true)}>🛒 <b style={{background:'#e94560', borderRadius:'50%', padding:'2px 6px', fontSize:'12px'}}>{cart.length}</b></div>
                    
                    {user ? (
                        <>
                            <span onClick={fetchUserOrders} style={{fontSize:'13px', color:'#fff', cursor:'pointer', borderBottom:'1px dashed #e94560'}}>My Orders</span>
                            <span style={{fontSize:'13px', color:'#aaa'}}>{user.name}</span>
                            {(user.email === 'sabbirmolla801@gmail.com' || user.role === 'admin') && 
                                <button onClick={() => setIsAdminMode(!isAdminMode)} style={{background:'#e94560', border:'none', color:'#fff', padding:'5px 10px', borderRadius:'5px', cursor:'pointer'}}>Admin Panel</button>
                            }
                            <button 
                                style={logoutBtnStyle}
                                onMouseOver={(e) => {e.target.style.background='#e94560'; e.target.style.color='#fff'}}
                                onMouseOut={(e) => {e.target.style.background='transparent'; e.target.style.color='#e94560'}}
                                onClick={() => {localStorage.clear(); window.location.reload()}}
                            >
                                Logout
                            </button>
                        </>
                    ) : <button onClick={() => setShowAuth(true)} style={{background:'#e94560', border:'none', color:'#fff', padding:'8px 15px', borderRadius:'5px', cursor:'pointer'}}>Login</button>}
                </div>
            </nav>

            <div style={{ padding: '30px 50px' }}>
                {isAdminMode && user ? <Admin user={user} /> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '25px' }}>
                        {filtered.map(p => (
                            <div key={p.id} style={{ background: '#fff', padding: '15px', borderRadius: '12px', textAlign:'center', boxShadow:'0 4px 12px rgba(0,0,0,0.05)', position:'relative' }}>
                                <div onClick={() => wishlist.some(i=>i.id===p.id) ? setWishlist(wishlist.filter(i=>i.id!==p.id)) : setWishlist([...wishlist, p])} style={{position:'absolute', top:10, right:10, cursor:'pointer', fontSize:'20px'}}>{wishlist.some(i=>i.id===p.id)?'❤️':'🤍'}</div>
                                <img src={p.img || 'https://via.placeholder.com/150'} style={{width:'100%', height:'180px', objectFit:'cover', borderRadius:'8px'}} alt="product"/>
                                <h3>{p.name}</h3>
                                <p style={{color:'#e94560', fontWeight:'bold', fontSize:'18px'}}>${p.price}</p>
                                
                                <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                                    <button onClick={() => setCart([...cart, p])} style={{flex: 1, padding:'10px', background:'#1a1a2e', color:'#fff', border:'none', borderRadius:'5px', cursor:'pointer'}}>Add to Cart</button>
                                    <button onClick={() => handleBuyNow(p)} style={{flex: 1, padding:'10px', background:'#e94560', color:'#fff', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>Buy Now</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- MY ORDERS MODAL --- */}
            {showMyOrders && (
                <div style={{position:'fixed', top:'50%', left:'50%', transform:'translate(-50%, -50%)', background:'#fff', padding:'30px', borderRadius:'12px', zIndex:1005, width:'90%', maxWidth:'550px', maxHeight:'80vh', overflowY:'auto', boxShadow:'0 10px 30px rgba(0,0,0,0.3)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px', borderBottom:'2px solid #eee', paddingBottom:'10px'}}>
                        <h2 style={{margin:0}}>My Orders 📦</h2>
                        <button onClick={() => setShowMyOrders(false)} style={{background:'none', border:'none', fontSize:'20px', cursor:'pointer'}}>✖</button>
                    </div>
                    {userOrders.length === 0 ? <p>No orders found.</p> : userOrders.map(order => (
                        <div key={order.id} style={{border:'1px solid #ddd', padding:'15px', borderRadius:'8px', marginBottom:'15px', background:'#fafafa'}}>
                            <div style={{display:'flex', justifyContent:'space-between'}}>
                                <strong>ID: {order.id}</strong>
                                <span style={{color: order.status === 'Pending' ? '#f39c12' : '#2ecc71', fontWeight:'bold'}}>{order.status}</span>
                            </div>
                            <p style={{margin:'5px 0', fontSize:'13px', color:'#666'}}>{new Date(order.date).toLocaleString()}</p>
                            <div style={{marginTop:'10px'}}>
                                {order.items.map((item, idx) => <span key={idx} style={{background:'#eee', padding:'2px 6px', borderRadius:'4px', marginRight:'5px', fontSize:'11px'}}>{item.name}</span>)}
                            </div>
                            <p style={{marginTop:'10px', fontWeight:'bold'}}>Total: ${order.total} ({order.paymentMethod})</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Cart Panel */}
            <SidePanel show={showCart} title="Cart 🛒" close={() => setShowCart(false)}>
                {cart.length === 0 ? <p>Your cart is empty.</p> : cart.map((item, i) => <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #eee'}}>{item.name} - ${item.price} <button onClick={() => setCart(cart.filter((_, idx)=>idx!==i))}>🗑️</button></div>)}
                {cart.length > 0 && (
                    <>
                        <h3 style={{marginTop:20}}>Total: ${cartTotal}</h3>
                        <button onClick={() => { if(!user) return setShowAuth(true); setShowCart(false); setShowCheckout(true); }} style={{width:'100%', padding:'12px', background:'#e94560', color:'#fff', border:'none', borderRadius:'5px', marginTop:10, cursor:'pointer'}}>Proceed to Checkout</button>
                    </>
                )}
            </SidePanel>

            <SidePanel show={showWishlist} title="Wishlist ❤️" close={() => setShowWishlist(false)}>
                {wishlist.map((item, i) => <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #eee'}}>{item.name} <button onClick={() => setCart([...cart, item])}>+🛒</button></div>)}
            </SidePanel>

            {/* Checkout Modal */}
            {showCheckout && (
                <div style={{position:'fixed', top:'50%', left:'50%', transform:'translate(-50%, -50%)', background:'#fff', padding:'30px', borderRadius:'12px', zIndex:1002, width:'400px', boxShadow:'0 10px 30px rgba(0,0,0,0.2)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                        <h2 style={{margin:0}}>Checkout</h2>
                        <button onClick={() => setShowCheckout(false)} style={{background:'none', border:'none', fontSize:'20px', cursor:'pointer'}}>✖</button>
                    </div>
                    <form onSubmit={handlePlaceOrder}>
                        <h4 style={{marginBottom:'10px'}}>Shipping Information</h4>
                        <input type="text" placeholder="Full Address" required value={checkoutData.address} onChange={e=>setCheckoutData({...checkoutData, address: e.target.value})} style={{width:'100%', padding:'10px', marginBottom:'10px', boxSizing:'border-box'}} />
                        <input type="tel" placeholder="Phone Number" required value={checkoutData.phone} onChange={e=>setCheckoutData({...checkoutData, phone: e.target.value})} style={{width:'100%', padding:'10px', marginBottom:'15px', boxSizing:'border-box'}} />
                        
                        <h4 style={{marginBottom:'10px'}}>Payment Method</h4>
                        <select value={checkoutData.paymentMethod} onChange={e=>setCheckoutData({...checkoutData, paymentMethod: e.target.value})} style={{width:'100%', padding:'10px', marginBottom:'20px', boxSizing:'border-box'}}>
                            <option value="COD">Cash on Delivery (COD)</option>
                            <option value="bKash">bKash Mobile Banking</option>
                            <option value="Card">Credit/Debit Card</option>
                        </select>
                        
                        <div style={{background:'#f4f4f4', padding:'15px', borderRadius:'8px', marginBottom:'15px'}}>
                            <strong>Total Amount: ${cartTotal}</strong>
                        </div>
                        <button type="submit" style={{width:'100%', padding:'12px', background:'#2ecc71', color:'#fff', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold', fontSize:'16px'}}>Confirm Order</button>
                    </form>
                </div>
            )}

            {/* Auth Panel */}
            {showAuth && !user && (
                <div style={{position:'fixed', top:0, right:0, width:'380px', height:'100vh', background:'#f8f9fa', zIndex:1001, padding:'30px', boxShadow:'-5px 0 15px rgba(0,0,0,0.1)', display:'flex', flexDirection:'column'}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                        <h2 style={{margin:0}}>Sign In</h2>
                        <button onClick={() => setShowAuth(false)} style={{background:'none', border:'none', fontSize:'20px', cursor:'pointer'}}>✖</button>
                    </div>
                    <Login setUser={(u) => {setUser(u); setCart(u.cart || []); setWishlist(u.wishlist || []); setShowAuth(false)}} />
                    <div style={{borderTop:'1px solid #ccc', paddingTop:'20px', marginTop:'20px', textAlign:'center'}}>
                        <span style={{color:'#888', fontSize:'12px', background:'#f8f9fa', padding:'0 10px', position:'relative', top:'-30px'}}>OR</span>
                        <button onClick={handleGoogleLogin} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', width:'100%', padding:'12px', background:'#fff', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', fontSize:'15px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)' }}>
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/pwa/google.svg" alt="google" style={{width:'20px'}} />
                            Sign in with Google
                        </button>
                    </div>
                </div>
            )}
            
            {(showCart || showWishlist || showAuth || showCheckout || showMyOrders) && <div onClick={() => {setShowCart(false); setShowWishlist(false); setShowAuth(false); setShowCheckout(false); setShowMyOrders(false);}} style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.5)', zIndex:1000}} />}
        </div>
    );
}

const SidePanel = ({ show, title, close, children }) => show && (
    <div style={{position:'fixed', top:0, right:0, width:'350px', height:'100vh', background:'#fff', zIndex:1002, padding:'20px', boxShadow:'-5px 0 15px rgba(0,0,0,0.1)', overflowY: 'auto'}}>
        <div style={{display:'flex', justifyContent:'space-between', borderBottom:'1px solid #ddd', paddingBottom:'10px'}}><h2>{title}</h2> <button onClick={close} style={{background:'none', border:'none', fontSize:'20px', cursor:'pointer'}}>✖</button></div>
        <div style={{marginTop:20}}>{children}</div>
    </div>
);

export default App;