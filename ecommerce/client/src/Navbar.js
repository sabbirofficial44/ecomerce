import React from 'react';

function Navbar({ user, onLogout, onAdminClick, onHomeClick }) {
    return (
        <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 30px', background: '#333', color: 'white', alignItems: 'center' }}>
            <h2 style={{ cursor: 'pointer' }} onClick={onHomeClick}>MyLocalShop</h2>
            <div>
                {user ? (
                    <>
                        <span style={{ marginRight: '15px' }}>{user.name} ({user.role})</span>
                        {user.role === 'admin' && <button onClick={onAdminClick} style={{ marginRight: '10px', padding: '5px' }}>Admin Panel</button>}
                        <button onClick={onLogout} style={{ background: 'red', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>Logout</button>
                    </>
                ) : (
                    <span>Please Login</span>
                )}
            </div>
        </nav>
    );
}

export default Navbar;