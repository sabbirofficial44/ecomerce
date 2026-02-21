import React, { useState, useEffect } from 'react';
import Login from './login'; 
import Admin from './Admin';

function App() {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
    const [products, setProducts] = useState([]);
    const [isAdminMode, setIsAdminMode] = useState(false);

    useEffect(() => {
        fetch('http://localhost:5000/products')
            .then(r => r.json())
            .then(data => setProducts(data))
            .catch(err => console.error("Connection Error:", err));
    }, [isAdminMode]);

    const logout = () => {
        localStorage.removeItem('user');
        setUser(null);
        setIsAdminMode(false);
    };

    return (
        <div style={{ fontFamily: 'Arial', backgroundColor: '#f4f4f4', minHeight: '100vh' }}>
            <nav style={{ background: '#2c3e50', color: '#fff', padding: '15px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 onClick={() => setIsAdminMode(false)} style={{ cursor: 'pointer' }}>🛒 MyShop</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {user ? (
                        <>
                            <span>{user.email}</span>
                            {user.email === 'sabbirmolla801@gmail.com' && (
                                <button onClick={() => setIsAdminMode(!isAdminMode)} style={{ background: '#f39c12', border: 'none', padding: '8px 15px', color: 'white', cursor: 'pointer', borderRadius: '5px' }}>
                                    {isAdminMode ? "🏠 Home" : "⚙️ Admin Panel"}
                                </button>
                            )}
                            <button onClick={logout} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
                        </>
                    ) : (
                        <span>Welcome Guest</span>
                    )}
                </div>
            </nav>

            <div style={{ padding: '30px' }}>
                {!user ? (
                    <div style={{ display: 'flex', justifyContent: 'center' }}><Login setUser={setUser} /></div>
                ) : isAdminMode ? (
                    <Admin />
                ) : (
                    <div>
                        <h2 style={{ textAlign: 'center' }}>Latest Products</h2>
                        {products.length === 0 ? <p style={{ textAlign: 'center' }}>No products found.</p> : 
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                            {products.map(p => (
                                <div key={p.id} style={{ background: 'white', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                                    <h3>{p.name}</h3>
                                    <p style={{ color: 'green', fontWeight: 'bold' }}>${p.price}</p>
                                    <button style={{ width: '100%', padding: '8px', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px' }}>Add to Cart</button>
                                </div>
                            ))}
                        </div>}
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;