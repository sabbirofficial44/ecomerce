import React, { useState, useEffect } from 'react';

function Admin({ user }) {
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({ totalUsers: 0, totalProducts: 0, totalOrders: 0, totalRevenue: 0 });
    const [activeTab, setActiveTab] = useState('Dashboard');
    
    // --- ক্যাটাগরি স্টেট ---
    const [categories, setCategories] = useState(['Home', 'Cloth', 'Gadget', 'Book']);
    const [newCat, setNewCat] = useState('');
    const [editIndex, setEditIndex] = useState(null);
    const [editCatText, setEditCatText] = useState('');

    const [form, setForm] = useState({ name: '', price: '', category: 'Cloth', img: '' });

    // --- প্রোডাক্ট এডিট স্টেট (নতুন যোগ করা হয়েছে) ---
    const [editId, setEditId] = useState(null); 
    const [editForm, setEditForm] = useState({ name: '', price: '', img: '', category: '' });

    useEffect(() => {
        fetch('http://localhost:5000/products').then(r => r.json()).then(setProducts);
        fetch('http://localhost:5000/admin/orders').then(r => r.json()).then(setOrders);
        fetch('http://localhost:5000/admin/stats').then(r => r.json()).then(setStats);
        
        fetch('http://localhost:5000/categories')
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

    const saveCategories = (updatedCats) => {
        setCategories(updatedCats);
        localStorage.setItem('categories', JSON.stringify(updatedCats));
        fetch('http://localhost:5000/update-categories', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedCats)
        }).catch(err => console.log("Saved locally"));
    };

    const handleAddCategory = (e) => {
        e.preventDefault();
        if (!newCat.trim()) return;
        if (categories.includes(newCat)) return alert("Category already exists!");
        saveCategories([...categories, newCat]);
        setNewCat('');
    };

    const handleAddProduct = (e) => {
        e.preventDefault();
        fetch('http://localhost:5000/add-product', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
        .then(r => r.json()).then(d => { 
            if(d.success) setProducts([...products, d.product]); 
            setForm({name:'', price:'', category: categories[1] || 'Home', img:''}); 
        });
    };

    // --- প্রোডাক্ট এডিট সেভ করার ফাংশন ---
    const handleSaveEditProduct = (id) => {
        fetch(`http://localhost:5000/edit-product/${id}`, {
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
        if(window.confirm("Are you sure you want to delete?")){
            fetch(`http://localhost:5000/delete-product/${id}`, {method:'DELETE'})
            .then(() => setProducts(products.filter(p => p.id !== id)));
        }
    };

    return (
        <div style={{ display: 'flex', gap: '20px', minHeight: '80vh' }}>
            {/* Sidebar */}
            <div style={{ width: '250px', background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', color: '#1a1a2e' }}>Admin Panel</h3>
                {['Dashboard', 'Products', 'Orders', 'Categories'].map(tab => (
                    <div key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '12px 15px', margin: '10px 0', background: activeTab === tab ? '#e94560' : 'transparent', color: activeTab === tab ? '#fff' : '#333', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        {tab}
                    </div>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, background: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                
                {activeTab === 'Dashboard' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                        <StatCard title="Revenue" value={`$${stats.totalRevenue}`} color="#2ecc71" />
                        <StatCard title="Orders" value={stats.totalOrders} color="#3498db" />
                        <StatCard title="Products" value={stats.totalProducts} color="#9b59b6" />
                        <StatCard title="Users" value={stats.totalUsers} color="#f39c12" />
                    </div>
                )}

                {activeTab === 'Products' && (
                    <div>
                        <h2>Manage Products</h2>
                        {/* Add Product Form */}
                        <form onSubmit={handleAddProduct} style={{ display: 'flex', gap: '10px', marginBottom: '25px', background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                            <input placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={inputStyle} />
                            <input type="number" placeholder="Price" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required style={inputStyle} />
                            <input placeholder="Image URL" value={form.img} onChange={e => setForm({...form, img: e.target.value})} style={inputStyle} />
                            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={inputStyle}>
                                {categories.filter(c => c !== 'Home').map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button type="submit" style={{ background: '#1a1a2e', color: '#fff', padding: '10px', borderRadius: '5px', border:'none', cursor:'pointer' }}>+ Add</button>
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
                {/* Categories Tab code remains same as your previous logic */}
            </div>
        </div>
    );
}

const StatCard = ({ title, value, color }) => (
    <div style={{ background: color, color: '#fff', padding: '20px', borderRadius: '10px' }}>
        <p style={{ margin: 0, opacity: 0.8 }}>{title}</p>
        <h2 style={{ margin: '5px 0 0 0' }}>{value}</h2>
    </div>
);

const inputStyle = { padding: '8px', border: '1px solid #ddd', borderRadius: '5px', outline: 'none' };

export default Admin;