import React, { useState, useEffect } from 'react';

function Admin() {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetch('http://localhost:5000/products').then(r => r.json()).then(setProducts);
    }, []);

    const addProduct = (e) => {
        e.preventDefault();
        fetch('http://localhost:5000/add-product', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, price: Number(price) })
        }).then(r => r.json()).then(newP => {
            setProducts([...products, newP]);
            alert("Product Added!");
        });
        setName(''); setPrice('');
    };

    return (
        <div style={{ background: 'white', padding: '20px', borderRadius: '10px' }}>
            <h3>Add New Product</h3>
            <form onSubmit={addProduct}>
                <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
                <input placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} required />
                <button type="submit">Add</button>
            </form>
        </div>
    );
}
export default Admin;