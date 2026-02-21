import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs } from "firebase/firestore";

function ProductList() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const getProducts = async () => {
      const data = await getDocs(collection(db, "products"));
      setProducts(data.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    };
    getProducts();
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', padding: '20px' }}>
      {products.map(p => (
        <div key={p.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
          <h3>{p.name}</h3>
          <p>Price: ${p.price}</p>
          <button style={{ background: '#f39c12', color: 'white', border: 'none', padding: '10px' }}>Add to Cart</button>
        </div>
      ))}
    </div>
  );
}

export default ProductList;