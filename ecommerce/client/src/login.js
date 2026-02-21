import React, { useState } from 'react';

function Login({ setUser }) {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        const endpoint = isRegister ? '/register' : '/login';
        
        try {
            // আইপি এড্রেস ব্যবহার করে কানেকশন নিশ্চিত করা
            const res = await fetch(`http://127.0.0.1:5000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isRegister ? { name, email, password } : { email, password })
            });

            if (!res.ok) throw new Error("Server response was not ok");

            const data = await res.json();
            if (data.success) {
                if (isRegister) {
                    alert("Registration successful! Please login.");
                    setIsRegister(false);
                } else {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setUser(data.user);
                }
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
            alert("কানেকশন এরর! আপনার 'node app.js' কি ঠিকঠাক চলছে?");
        }
    };

    return (
        <div style={{ background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', width: '300px' }}>
            <h2 style={{ textAlign: 'center' }}>{isRegister ? 'Register' : 'Login'}</h2>
            <form onSubmit={handleAuth}>
                {isRegister && <input type="text" placeholder="Name" required style={{ width: '92%', padding: '10px', marginBottom: '10px' }} onChange={(e) => setName(e.target.value)} />}
                <input type="email" placeholder="Email" required style={{ width: '92%', padding: '10px', marginBottom: '10px' }} onChange={(e) => setEmail(e.target.value)} />
                <input type="password" placeholder="Password" required style={{ width: '92%', padding: '10px', marginBottom: '15px' }} onChange={(e) => setPassword(e.target.value)} />
                <button type="submit" style={{ width: '100%', padding: '10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px' }}>{isRegister ? 'Register' : 'Login'}</button>
            </form>
            <p onClick={() => setIsRegister(!isRegister)} style={{ textAlign: 'center', marginTop: '15px', color: '#3498db', cursor: 'pointer' }}>
                {isRegister ? 'Already have an account? Login' : 'New here? Create account'}
            </p>
        </div>
    );
}

export default Login;