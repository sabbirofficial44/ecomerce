import React, { useState, useEffect } from 'react';

function Admin({ user }) {
    const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, "");

    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({ totalUsers: 0, totalProducts: 0, totalOrders: 0, totalRevenue: 0 });
    const [activeTab, setActiveTab] = useState('Dashboard');
    
    // --- ক্যাটাগরি স্টেট এবং লজিক ---
    const [categories, setCategories] = useState(['Home', 'Cloth', 'Gadget', 'Book']);
    const [newCat, setNewCat] = useState('');
    const [editIndex, setEditIndex] = useState(null);
    const [editCatText, setEditCatText] = useState('');

    const [form, setForm] = useState({ name: '', price: '', category: 'Cloth', img: '' });

    // --- প্রোডাক্ট এডিট স্টেট (নতুন যোগ করা হয়েছে) ---
        const [editId, setEditId] = useState(null); 
        const [editForm, setEditForm] = useState({ name: '', price: '', img: '', category: '' });
    

    useEffect(() => {
        fetch(`${API_BASE}/products`).then(r => r.json()).then(setProducts);
        fetch(`${API_BASE}/admin/orders`).then(r => r.json()).then(setOrders);
        fetch(`${API_BASE}/admin/stats`).then(r => r.json()).then(setStats);
        
        // ক্যাটাগরি ফেচ করা
        fetch(`${API_BASE}/categories`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d && d.length > 0) setCategories(d);
                else loadLocalCats();
            }).catch(loadLocalCats);
    }, []);

    const loadLocalCats = () => {
        const local = JSON.parse(localStorage.getItem('categories'));
        if (local && local.length > 0) setCategories(local);
    };

    // ক্যাটাগরি সেভ করা (লোকাল স্টোরেজ + সার্ভার)
    const saveCategories = (updatedCats) => {
        setCategories(updatedCats);
        localStorage.setItem('categories', JSON.stringify(updatedCats));
        // অপশনাল: সার্ভারে আপডেট করার জন্য
        fetch(`${API_BASE}/update-categories`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedCats)
        }).catch(err => console.log("Categories saved locally"));
    };

    const handleAddCategory = (e) => {
        e.preventDefault();
        if (!newCat.trim()) return;
        if (categories.includes(newCat)) return alert("Category already exists!");
        saveCategories([...categories, newCat]);
        setNewCat('');
    };

    const handleDeleteCategory = (catName) => {
        if (catName === 'Home') return alert("You cannot delete the 'Home' category!");
        if (window.confirm(`Are you sure you want to delete '${catName}'?`)) {
            saveCategories(categories.filter(c => c !== catName));
        }
    };

    const handleEditCategorySave = (index) => {
        if (!editCatText.trim() || editCatText === 'Home') {
            setEditIndex(null);
            return;
        }
        const updated = [...categories];
        updated[index] = editCatText;
        saveCategories(updated);
        setEditIndex(null);
    };




    const handleAddProduct = (e) => {
        e.preventDefault();
        fetch(`${API_BASE}/add-product`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
        .then(r => r.json()).then(d => { 
            if(d.success) setProducts([...products, d.product]); 
            setForm({name:'', price:'', category: categories[1] || 'Home', img:''}); 
        });
    };

        // --- প্রোডাক্ট এডিট সেভ করার ফাংশন ---
    const handleSaveEditProduct = (id) => {
        fetch(`${API_BASE}/edit-product/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editForm)
        })
        .then(r => r.json())
        .then(d => {
            if (d.success) {
                // মেইন প্রোডাক্ট লিস্ট আপডেট করা
                setProducts(products.map(p => p.id === id ? d.product : p));
                setEditId(null); // এডিট মোড বন্ধ করা
                alert("Product updated successfully!");
            }
        });
    };

    const handleDeleteProduct = (id) => {
        fetch(`${API_BASE}/delete-product/${id}`, {method:'DELETE'})
        .then(() => setProducts(products.filter(p => p.id !== id)));
    };

    const updateOrderStatus = (id, status) => {
        fetch(`${API_BASE}/admin/update-order/${id}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ status })
        }).then(() => setOrders(orders.map(o => o.id === id ? { ...o, status } : o)));
    };

    return (
        <div style={{ display: 'flex', gap: '20px', minHeight: '80vh' }}>
            {/* Admin Sidebar */}
            <div style={{ width: '250px', background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', color: '#1a1a2e' }}>Admin Panel</h3>
                {/* নতুন ট্যাব "Categories" যোগ করা হলো */}
                {['Dashboard', 'Products', 'Orders', 'Categories', 'Settings'].map(tab => (
                    <div key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '12px 15px', margin: '10px 0', background: activeTab === tab ? '#e94560' : 'transparent', color: activeTab === tab ? '#fff' : '#333', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}>
                        {tab}
                    </div>
                ))}
            </div>

            {/* Admin Content */}
            <div style={{ flex: 1, background: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                
                {/* Dashboard Tab */}
                {activeTab === 'Dashboard' && (
                    <div>
                        <h2>Overview</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '20px' }}>
                            <StatCard title="Revenue" value={`$${stats.totalRevenue}`} color="#2ecc71" />
                            <StatCard title="Total Orders" value={stats.totalOrders} color="#3498db" />
                            <StatCard title="Total Products" value={stats.totalProducts} color="#9b59b6" />
                            <StatCard title="Total Users" value={stats.totalUsers} color="#f39c12" />
                        </div>
                    </div>
                )}

                {/* Categories Tab (NEW FEATURE) */}
                {activeTab === 'Categories' && (
                    <div>
                        <h2>Manage Categories (Navigation Bar)</h2>
                        
                        <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '15px', marginBottom: '25px', background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
                            <input placeholder="New Category Name..." value={newCat} onChange={e => setNewCat(e.target.value)} required style={inputStyle} />
                            <button type="submit" style={{ padding: '10px 20px', background: '#2ecc71', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>+ Add Category</button>
                        </form>

                        <table style={tableStyle}>
                            <thead><tr style={{background:'#f4f4f4', textAlign:'left'}}><th>ID</th><th>Category Name</th><th>Action</th></tr></thead>
                            <tbody>
                                {categories.map((cat, index) => (
                                    <tr key={index} style={{borderBottom: '1px solid #eee'}}>
                                        <td>{index + 1}</td>
                                        <td>
                                            {editIndex === index ? (
                                                <input 
                                                    value={editCatText} 
                                                    onChange={(e) => setEditCatText(e.target.value)} 
                                                    style={{...inputStyle, padding:'5px', width:'80%'}} 
                                                />
                                            ) : (
                                                <span style={{fontWeight: cat === 'Home' ? 'bold' : 'normal'}}>{cat} {cat === 'Home' && '(Default)'}</span>
                                            )}
                                        </td>
                                        <td>
                                            {cat !== 'Home' && (
                                                <div style={{display:'flex', gap:'10px'}}>
                                                    {editIndex === index ? (
                                                        <button onClick={() => handleEditCategorySave(index)} style={{background:'#3498db', color:'white', border:'none', padding:'6px 12px', borderRadius:'4px', cursor:'pointer'}}>Save</button>
                                                    ) : (
                                                        <button onClick={() => {setEditIndex(index); setEditCatText(cat)}} style={{background:'#f39c12', color:'white', border:'none', padding:'6px 12px', borderRadius:'4px', cursor:'pointer'}}>Edit</button>
                                                    )}
                                                    <button onClick={() => handleDeleteCategory(cat)} style={{background:'#e74c3c', color:'white', border:'none', padding:'6px 12px', borderRadius:'4px', cursor:'pointer'}}>Delete</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Products Tab */}
                {activeTab === 'Products' && (
                    <div>
                        <h2>Manage Products</h2>
                        <form onSubmit={handleAddProduct} style={{ display: 'flex', gap: '15px', marginBottom: '25px', background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
                            <input placeholder="Product Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={inputStyle} />
                            <input type="number" placeholder="Price ($)" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required style={inputStyle} />
                            <input placeholder="Image URL (Optional)" value={form.img} onChange={e => setForm({...form, img: e.target.value})} style={inputStyle} />
                            
                            {/* ডাইনামিক ক্যাটাগরি ড্রপডাউন */}
                            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={inputStyle}>
                                {categories.filter(c => c !== 'Home').map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            
                            <button type="submit" style={{ padding: '10px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>+ Add</button>
                        </form>

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
                                    <th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                
                                {products.map(p => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                                        
                                        <td>
                                            {editId === p.id ? 
                                                <input value={editForm.img} onChange={e => setEditForm({...editForm, img: e.target.value})} placeholder="Image URL" style={{...inputStyle, width: '80px'}} /> :
                                                <img src={p.img || 'https://via.placeholder.com/40'} style={{ width: '40px', height: '40px', borderRadius: '5px' }} alt="" />
                                            }
                                        </td>
                                        <td>
                                            {editId === p.id ? 
                                                <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} style={inputStyle} /> : p.name
                                            }
                                        </td>
                                        <td>
                                            {editId === p.id ? 
                                                <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} style={inputStyle}>
                                                    {categories.filter(c => c !== 'Home').map(c => <option key={c} value={c}>{c}</option>)}
                                                </select> : p.category
                                            }
                                        </td>
                                        <td>
                                            {editId === p.id ? 
                                                <input type="number" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} style={{...inputStyle, width: '80px'}} /> : `$${p.price}`
                                            }
                                        </td>
                                        <td>
                                            {editId === p.id ? (
                                                <div style={{display:'flex', gap:'5px'}}>
                                                    <button onClick={() => handleSaveEditProduct(p.id)} style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                                                    <button onClick={() => setEditId(null)} style={{ background: '#95a5a6', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                                                </div>
                                            ) : (
                                                <div style={{display:'flex', gap:'5px'}}>
                                                    <button onClick={() => { setEditId(p.id); setEditForm(p); }} style={{ background: '#f39c12', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                                                    <button onClick={() => handleDeleteProduct(p.id)} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                                                </div>
                                            )}
                                            </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Orders Tab */}
                {activeTab === 'Orders' && (
                    <div>
                        <h2>Recent Orders</h2>
                        <table style={tableStyle}>
                            <thead><tr style={{background:'#f4f4f4', textAlign:'left'}}><th>Order ID</th><th>User</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                            <tbody>
                                {orders.map(o => (
                                    <tr key={o.id} style={{borderBottom: '1px solid #eee'}}>
                                        <td>{o.id}</td><td>{o.userEmail}</td><td>${o.total}</td>
                                        <td><span style={{padding:'4px 8px', borderRadius:'12px', fontSize:'12px', background: o.status==='Pending'?'#f39c12': o.status==='Delivered'?'#2ecc71':'#e74c3c', color:'#fff'}}>{o.status}</span></td>
                                        <td>
                                            <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)} style={{padding:'5px', borderRadius:'4px'}}>
                                                <option>Pending</option><option>Shipped</option><option>Delivered</option><option>Cancelled</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {activeTab === 'Settings' && <h3>Settings panel is under construction.</h3>}
            </div>
        </div>
    );
}

// Subcomponents & Styles
const StatCard = ({ title, value, color }) => (
    <div style={{ background: color, color: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <h4 style={{ margin: 0, opacity: 0.9 }}>{title}</h4>
        <h1 style={{ margin: '10px 0 0 0', fontSize: '32px' }}>{value}</h1>
    </div>
);

const inputStyle = { padding: '10px', border: '1px solid #ddd', borderRadius: '5px', flex: 1 };
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '10px' };

export default Admin;