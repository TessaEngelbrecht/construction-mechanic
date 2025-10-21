import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function Auth({ setUser }) {
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1);

    const handleLogin = async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (!error) setStep(2);
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        const { data, error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
        if (data?.user) setUser(data.user);
    };

    return (
        <div className="auth-container">
            {step === 1 ? (
                <form onSubmit={handleLogin}>
                    <h2>Sign In / Sign Up</h2>
                    <input
                        type="tel"
                        placeholder="Phone Number"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        required
                    />
                    <button type="submit">Send OTP</button>
                </form>
            ) : (
                <form onSubmit={handleVerify}>
                    <h2>Enter OTP</h2>
                    <input
                        type="text"
                        placeholder="OTP"
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                        required
                    />
                    <button type="submit">Verify</button>
                </form>
            )}
        </div>
    );
}
