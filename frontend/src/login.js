import React, { useState } from 'react';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

function Login({ setUser }) {
    const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, "");
    const [authMode, setAuthMode] = useState('email'); // 'email', 'register', 'phone', 'forgot'
    const [step, setStep] = useState(1);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmationResult, setConfirmationResult] = useState(null);
    
    // লোডিং স্টেট
    const [isLoading, setIsLoading] = useState(false);

    const auth = getAuth();

    // --- Email Auth ---
    const handleEmailAuth = async (e) => {
        e.preventDefault();
        const payload = authMode === 'register' ? { name, email, password } : { email, password };
        const endpoint = authMode === 'register' ? '/register' : '/login';

        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                if (authMode === 'register') {
                    alert("Registration successful! Please login.");
                    setAuthMode('email');
                } else {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setUser(data.user);
                }
            } else alert(data.message);
        } catch (err) { alert("Server connection error!"); }
    };

    // --- Forgot Password Logic ---
    const handleSendOTP = async () => {
        if (!email) return alert("Please enter your email!");
        
        setIsLoading(true); // রিকোয়েস্ট যাওয়ার আগে লোডিং শুরু
        
        try {
            const res = await fetch(`${API_BASE}/forgot-password`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
            });
            const data = await res.json();
            
            if (data.success) { 
                alert(data.message); 
                setStep(2); 
            } else {
                alert(data.message);
            }
        } catch (err) { 
            alert("Server error! Backend is not running or network issue."); 
        } finally {
            setIsLoading(false); // রিকোয়েস্ট শেষ হলে লোডিং বন্ধ
        }
    };

    const handleUpdatePass = async () => {
        if (!otp || !newPassword) return alert("Fill all fields!");
        try {
            const res = await fetch(`${API_BASE}/reset-password`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp, newPassword })
            });
            const data = await res.json();
            if (data.success) { 
                alert(data.message); 
                setAuthMode('email'); 
                setStep(1);
                setOtp(''); // ফিল্ড ক্লিয়ার করা হচ্ছে
                setNewPassword(''); 
            } 
            else alert(data.message);
        } catch (err) { alert("Network issue!"); }
    };

    // --- Phone Auth ---
    const setupRecaptcha = () => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
        }
    };

    const handleSendPhoneOTP = async (e) => {
        e.preventDefault();
        setupRecaptcha();
        const appVerifier = window.recaptchaVerifier;
        const formattedPhone = phone.startsWith('+') ? phone : `+88${phone}`;
        try {
            const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setConfirmationResult(result);
            setStep(2); alert("OTP Sent!");
        } catch (error) { console.error(error); alert("Failed to send OTP."); }
    };

    const handleVerifyPhoneOTP = async (e) => {
        e.preventDefault();
        try {
            const result = await confirmationResult.confirm(otp);
            const loggedInUser = { name: "Phone User", email: result.user.phoneNumber, role: 'user', cart: [], wishlist: [] };
            localStorage.setItem('user', JSON.stringify(loggedInUser));
            setUser(loggedInUser);
        } catch (error) { alert("Invalid OTP!"); }
    };

    return (
        <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', flex: 1 }}>
            {authMode !== 'forgot' && (
                <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '2px solid #eee' }}>
                    <button onClick={() => {setAuthMode('email'); setStep(1);}} style={{ flex: 1, padding: '10px', border: 'none', background: 'none', borderBottom: authMode === 'email' ? '2px solid #e94560' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>Email</button>
                    <button onClick={() => {setAuthMode('phone'); setStep(1);}} style={{ flex: 1, padding: '10px', border: 'none', background: 'none', borderBottom: authMode === 'phone' ? '2px solid #e94560' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>Phone</button>
                </div>
            )}

            {authMode === 'email' && (
                <form onSubmit={handleEmailAuth}>
                    <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
                    <button type="submit" style={btnStyle}>Login</button>
                    <p onClick={() => setAuthMode('register')} style={linkStyle}>Create an Account</p>
                    <p onClick={() => { setAuthMode('forgot'); setStep(1); }} style={{...linkStyle, color:'red', marginTop: '5px'}}>Forgot Password?</p>
                </form>
            )}

            {authMode === 'register' && (
                <form onSubmit={handleEmailAuth}>
                    <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
                    <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
                    <input type="password" placeholder="Create Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
                    <button type="submit" style={{...btnStyle, background: '#2ecc71'}}>Register</button>
                    <p onClick={() => setAuthMode('email')} style={linkStyle}>Already have an account? Login</p>
                </form>
            )}

            {authMode === 'forgot' && (
                <div>
                    <h3 style={{textAlign:'center', marginBottom:'15px'}}>Reset Password</h3>
                    {step === 1 ? (
                        <>
                            <input type="email" placeholder="Registered Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
                            
                            {/* বাটনে Loading State অ্যাড করা হয়েছে */}
                            <button 
                                onClick={handleSendOTP} 
                                disabled={isLoading} 
                                style={{
                                    ...btnStyle, 
                                    background: isLoading ? '#bdc3c7' : '#f39c12', 
                                    cursor: isLoading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isLoading ? 'Sending OTP...' : 'Send OTP'}
                            </button>
                        </>
                    ) : (
                        <>
                            <input type="text" placeholder="6-digit OTP (Check Server Console)" value={otp} onChange={(e) => setOtp(e.target.value)} style={inputStyle} />
                            <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} />
                            <button onClick={handleUpdatePass} style={{...btnStyle, background:'#2ecc71'}}>Update Password</button>
                        </>
                    )}
                    <p onClick={() => setAuthMode('email')} style={linkStyle}>Back to Login</p>
                </div>
            )}

            {authMode === 'phone' && (
                <>
                    <div id="recaptcha-container"></div>
                    {step === 1 ? (
                        <form onSubmit={handleSendPhoneOTP}>
                            <input type="tel" placeholder="Phone Number (+8801...)" value={phone} onChange={(e) => setPhone(e.target.value)} required style={inputStyle} />
                            <button type="submit" style={{...btnStyle, background: '#f39c12'}}>Send OTP</button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyPhoneOTP}>
                            <input type="text" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} required style={inputStyle} />
                            <button type="submit" style={{...btnStyle, background: '#2ecc71'}}>Verify & Login</button>
                        </form>
                    )}
                </>
            )}
        </div>
    );
}

const inputStyle = { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' };
// btnStyle এ transition যোগ করা হয়েছে যাতে কালার চেঞ্জটা স্মুথ হয়
const btnStyle = { width: '100%', padding: '12px', background: '#e94560', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', transition: '0.3s' };
const linkStyle = { textAlign: 'center', marginTop: '15px', color: '#888', cursor: 'pointer', fontSize: '14px' };

export default Login;