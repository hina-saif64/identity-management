import React, { useState } from 'react';
import { Key, ShieldCheck, RefreshCw, Copy, Eye, EyeOff, Check, X, Lock, Unlock, Calendar, AlertCircle } from 'lucide-react';
import { ConnectionState, LogEntry } from '../../../types';

interface PasswordToolsPageProps {
    connection: ConnectionState;
    addLog: (message: string, module: LogEntry['module'], level?: LogEntry['level']) => void;
    theme: 'light' | 'dark';
}

// Character set definitions
const CHAR_SETS = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

export const PasswordToolsPage: React.FC<PasswordToolsPageProps> = ({ connection, addLog, theme }) => {
    // Verification state
    const [verifyUsername, setVerifyUsername] = useState('');
    const [verifyPassword, setVerifyPassword] = useState('');
    const [showVerifyPassword, setShowVerifyPassword] = useState(false);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyResult, setVerifyResult] = useState<{ valid: boolean; message: string } | null>(null);

    // Password info state
    const [infoUsername, setInfoUsername] = useState('');
    const [infoLoading, setInfoLoading] = useState(false);
    const [passwordInfo, setPasswordInfo] = useState<{
        lastPasswordChange: string;
        passwordExpired: boolean;
        passwordNeverExpires: boolean;
        accountLocked: boolean;
        lastLogon?: string;
    } | null>(null);
    const [infoError, setInfoError] = useState<string | null>(null);

    // Generator state
    const [genLength, setGenLength] = useState(16);
    const [useUppercase, setUseUppercase] = useState(true);
    const [useLowercase, setUseLowercase] = useState(true);
    const [useNumbers, setUseNumbers] = useState(true);
    const [useSpecial, setUseSpecial] = useState(true);
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [showGenPassword, setShowGenPassword] = useState(false);
    const [copied, setCopied] = useState(false);

    const isDark = theme === 'dark';

    // Generate password client-side using secure crypto
    const handleGenerate = () => {
        let charset = '';
        const requiredChars: string[] = [];

        if (useUppercase) {
            charset += CHAR_SETS.uppercase;
            requiredChars.push(CHAR_SETS.uppercase[Math.floor(Math.random() * CHAR_SETS.uppercase.length)]);
        }
        if (useLowercase) {
            charset += CHAR_SETS.lowercase;
            requiredChars.push(CHAR_SETS.lowercase[Math.floor(Math.random() * CHAR_SETS.lowercase.length)]);
        }
        if (useNumbers) {
            charset += CHAR_SETS.numbers;
            requiredChars.push(CHAR_SETS.numbers[Math.floor(Math.random() * CHAR_SETS.numbers.length)]);
        }
        if (useSpecial) {
            charset += CHAR_SETS.special;
            requiredChars.push(CHAR_SETS.special[Math.floor(Math.random() * CHAR_SETS.special.length)]);
        }

        if (!charset) {
            addLog('Password Generator: At least one character type must be selected', 'SYSTEM', 'warning');
            return;
        }

        const array = new Uint32Array(genLength);
        crypto.getRandomValues(array);

        let password = '';
        const remainingLength = genLength - requiredChars.length;

        for (let i = 0; i < remainingLength; i++) {
            password += charset[array[i] % charset.length];
        }

        // Add required chars and shuffle
        password = (password + requiredChars.join(''))
            .split('')
            .sort(() => Math.random() - 0.5)
            .join('');

        setGeneratedPassword(password);
        setCopied(false);
        addLog(`Password Generator: Generated ${genLength}-character password`, 'SYSTEM', 'success');
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(generatedPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            addLog('Password copied to clipboard', 'SYSTEM', 'success');
        } catch (error) {
            addLog('Failed to copy password', 'SYSTEM', 'error');
        }
    };

    const handleVerify = async () => {
        if (!connection.isConnected) {
            addLog('Password Verify: Not connected to AD', 'SYSTEM', 'error');
            setVerifyResult({ valid: false, message: 'Not connected to AD. Please connect via Universal Authentication first.' });
            return;
        }

        if (!verifyUsername || !verifyPassword) {
            addLog('Password Verify: Username and password required', 'SYSTEM', 'warning');
            return;
        }

        setVerifyLoading(true);
        setVerifyResult(null);

        try {
            const response = await fetch('http://localhost:3002/api/password/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Hyperion-Key': 'dev-gateway-key-change-in-production'
                },
                body: JSON.stringify({
                    sessionId: connection.sessionId,
                    targetUsername: verifyUsername,
                    targetPassword: verifyPassword
                })
            });

            const data = await response.json();

            if (data.status === 'success' || data.valid !== undefined) {
                setVerifyResult({
                    valid: data.valid,
                    message: data.message || (data.valid ? 'Credentials are valid' : 'Invalid credentials')
                });
                addLog(`Password Verify: ${data.valid ? 'Valid' : 'Invalid'} credentials for ${verifyUsername}`, 'SYSTEM', data.valid ? 'success' : 'warning');
            } else {
                setVerifyResult({ valid: false, message: data.detail || data.error || 'Verification failed' });
                addLog(`Password Verify: Error - ${data.detail || data.error}`, 'SYSTEM', 'error');
            }
        } catch (error: any) {
            setVerifyResult({ valid: false, message: error.message });
            addLog(`Password Verify: Error - ${error.message}`, 'SYSTEM', 'error');
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleFetchInfo = async () => {
        if (!connection.isConnected) {
            addLog('Password Info: Not connected to AD', 'SYSTEM', 'error');
            setInfoError('Not connected to AD. Please connect via Universal Authentication first.');
            return;
        }

        if (!infoUsername) {
            addLog('Password Info: Username required', 'SYSTEM', 'warning');
            return;
        }

        setInfoLoading(true);
        setPasswordInfo(null);
        setInfoError(null);

        try {
            const response = await fetch('http://localhost:3002/api/password/info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Hyperion-Key': 'dev-gateway-key-change-in-production'
                },
                body: JSON.stringify({
                    sessionId: connection.sessionId,
                    targetUsername: infoUsername
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                setPasswordInfo({
                    lastPasswordChange: data.lastPasswordChange,
                    passwordExpired: data.passwordExpired,
                    passwordNeverExpires: data.passwordNeverExpires,
                    accountLocked: data.accountLocked,
                    lastLogon: data.lastLogon
                });
                addLog(`Password Info: Retrieved for ${infoUsername}`, 'SYSTEM', 'success');
            } else {
                setInfoError(data.detail || data.error || 'Failed to fetch password info');
                addLog(`Password Info: Error - ${data.detail || data.error}`, 'SYSTEM', 'error');
            }
        } catch (error: any) {
            setInfoError(error.message);
            addLog(`Password Info: Error - ${error.message}`, 'SYSTEM', 'error');
        } finally {
            setInfoLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-3xl font-black tracking-tight uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Password Tools
                    </h2>
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                        Verify credentials, check password status, and generate secure passwords
                    </p>
                </div>
                <div className={`px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl ${isDark ? 'bg-indigo-600 shadow-indigo-600/20' : 'bg-indigo-500 shadow-indigo-500/20'}`}>
                    <Key className="w-5 h-5 text-white" />
                    <span className="text-xs font-black text-white uppercase tracking-widest">Secure Module</span>
                </div>
            </div>

            {/* Connection Warning */}
            {!connection.isConnected && (
                <div className={`p-4 rounded-2xl border flex items-center gap-4 ${isDark ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'}`}>
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <div>
                        <p className={`text-sm font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>AD Connection Required</p>
                        <p className={`text-xs ${isDark ? 'text-yellow-500/70' : 'text-yellow-600'}`}>Connect via Universal Authentication to use password verification and info features</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Password Verifier Panel */}
                <div className={`p-8 rounded-[2.5rem] border relative overflow-hidden ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-lg'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <ShieldCheck className="w-32 h-32" />
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className={`p-3 rounded-xl ${isDark ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Password Verifier</h3>
                            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Validate domain user credentials</p>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Username (domain\user)
                            </label>
                            <input
                                type="text"
                                value={verifyUsername}
                                onChange={(e) => setVerifyUsername(e.target.value)}
                                placeholder="DOMAIN\username"
                                className={`w-full px-4 py-3 rounded-xl border transition-all ${isDark
                                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500'
                                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'} focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showVerifyPassword ? 'text' : 'password'}
                                    value={verifyPassword}
                                    onChange={(e) => setVerifyPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className={`w-full px-4 py-3 pr-12 rounded-xl border transition-all ${isDark
                                        ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500'
                                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'} focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                                />
                                <button
                                    onClick={() => setShowVerifyPassword(!showVerifyPassword)}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                                >
                                    {showVerifyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleVerify}
                            disabled={verifyLoading || !connection.isConnected}
                            className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isDark
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-slate-800 disabled:text-slate-600'
                                : 'bg-indigo-500 hover:bg-indigo-600 text-white disabled:bg-slate-200 disabled:text-slate-400'}`}
                        >
                            {verifyLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            {verifyLoading ? 'Verifying...' : 'Verify Credentials'}
                        </button>

                        {verifyResult && (
                            <div className={`p-4 rounded-xl flex items-center gap-3 ${verifyResult.valid
                                ? (isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200')
                                : (isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200')}`}>
                                {verifyResult.valid ? (
                                    <Check className="w-5 h-5 text-green-500" />
                                ) : (
                                    <X className="w-5 h-5 text-red-500" />
                                )}
                                <span className={`text-sm font-medium ${verifyResult.valid
                                    ? (isDark ? 'text-green-400' : 'text-green-700')
                                    : (isDark ? 'text-red-400' : 'text-red-700')}`}>
                                    {verifyResult.message}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Password Info Panel */}
                <div className={`p-8 rounded-[2.5rem] border relative overflow-hidden ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-lg'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Calendar className="w-32 h-32" />
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className={`p-3 rounded-xl ${isDark ? 'bg-cyan-600/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600'}`}>
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Password Info</h3>
                            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Fetch password change details</p>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Username (domain\user)
                            </label>
                            <input
                                type="text"
                                value={infoUsername}
                                onChange={(e) => setInfoUsername(e.target.value)}
                                placeholder="DOMAIN\username"
                                className={`w-full px-4 py-3 rounded-xl border transition-all ${isDark
                                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-500'
                                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500'} focus:outline-none focus:ring-2 focus:ring-cyan-500/20`}
                            />
                        </div>

                        <button
                            onClick={handleFetchInfo}
                            disabled={infoLoading || !connection.isConnected}
                            className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isDark
                                ? 'bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-slate-800 disabled:text-slate-600'
                                : 'bg-cyan-500 hover:bg-cyan-600 text-white disabled:bg-slate-200 disabled:text-slate-400'}`}
                        >
                            {infoLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                            {infoLoading ? 'Fetching...' : 'Fetch Details'}
                        </button>

                        {infoError && (
                            <div className={`p-4 rounded-xl flex items-center gap-3 ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
                                <X className="w-5 h-5 text-red-500" />
                                <span className={`text-sm ${isDark ? 'text-red-400' : 'text-red-700'}`}>{infoError}</span>
                            </div>
                        )}

                        {passwordInfo && (
                            <div className={`p-4 rounded-xl space-y-3 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Last Password Change</span>
                                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{passwordInfo.lastPasswordChange}</span>
                                </div>
                                <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Password Expired</span>
                                    <span className={`text-sm font-bold flex items-center gap-1 ${passwordInfo.passwordExpired ? 'text-red-500' : 'text-green-500'}`}>
                                        {passwordInfo.passwordExpired ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                        {passwordInfo.passwordExpired ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Password Never Expires</span>
                                    <span className={`text-sm font-bold ${passwordInfo.passwordNeverExpires ? 'text-yellow-500' : 'text-green-500'}`}>
                                        {passwordInfo.passwordNeverExpires ? 'True' : 'False'}
                                    </span>
                                </div>
                                <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Account Locked</span>
                                    <span className={`text-sm font-bold flex items-center gap-1 ${passwordInfo.accountLocked ? 'text-red-500' : 'text-green-500'}`}>
                                        {passwordInfo.accountLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                        {passwordInfo.accountLocked ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                {passwordInfo.lastLogon && (
                                    <>
                                        <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Last Logon</span>
                                            <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{passwordInfo.lastLogon}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Password Generator Panel - Full Width */}
            <div className={`p-8 rounded-[2.5rem] border relative overflow-hidden ${isDark ? 'bg-indigo-600/5 border-indigo-600/10' : 'bg-indigo-50 border-indigo-100'}`}>
                <div className="absolute -top-10 -right-10 opacity-10">
                    <RefreshCw className="w-64 h-64 text-indigo-500" />
                </div>

                <div className="flex items-center gap-3 mb-6">
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                        <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Password Generator</h3>
                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Generate secure passwords with customizable options</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                    {/* Options */}
                    <div className="space-y-6">
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Password Length: <span className="text-indigo-500">{genLength}</span>
                            </label>
                            <input
                                type="range"
                                min="8"
                                max="64"
                                value={genLength}
                                onChange={(e) => setGenLength(parseInt(e.target.value))}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                style={{
                                    background: isDark
                                        ? `linear-gradient(to right, #6366f1 0%, #6366f1 ${((genLength - 8) / 56) * 100}%, #1e293b ${((genLength - 8) / 56) * 100}%, #1e293b 100%)`
                                        : `linear-gradient(to right, #6366f1 0%, #6366f1 ${((genLength - 8) / 56) * 100}%, #e2e8f0 ${((genLength - 8) / 56) * 100}%, #e2e8f0 100%)`
                                }}
                            />
                            <div className={`flex justify-between text-[10px] mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                <span>8</span>
                                <span>64</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Uppercase (A-Z)', state: useUppercase, setter: setUseUppercase },
                                { label: 'Lowercase (a-z)', state: useLowercase, setter: setUseLowercase },
                                { label: 'Numbers (0-9)', state: useNumbers, setter: setUseNumbers },
                                { label: 'Special (!@#$)', state: useSpecial, setter: setUseSpecial }
                            ].map((opt) => (
                                <label
                                    key={opt.label}
                                    className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${opt.state
                                        ? (isDark ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-indigo-100 border border-indigo-200')
                                        : (isDark ? 'bg-slate-900/50 border border-slate-800' : 'bg-white border border-slate-200')}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={opt.state}
                                        onChange={(e) => opt.setter(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-4 h-4 rounded flex items-center justify-center ${opt.state
                                        ? 'bg-indigo-500 text-white'
                                        : (isDark ? 'bg-slate-800 border border-slate-700' : 'bg-slate-100 border border-slate-300')}`}>
                                        {opt.state && <Check className="w-3 h-3" />}
                                    </div>
                                    <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Generated Password Display */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <input
                                    type={showGenPassword ? 'text' : 'password'}
                                    value={generatedPassword}
                                    readOnly
                                    placeholder="Click Generate to create password"
                                    className={`w-full px-4 py-4 pr-24 rounded-xl border text-lg font-mono transition-all ${isDark
                                        ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'} focus:outline-none`}
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <button
                                        onClick={() => setShowGenPassword(!showGenPassword)}
                                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                                    >
                                        {showGenPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    {generatedPassword && (
                                        <button
                                            onClick={handleCopy}
                                            className={`p-2 rounded-lg transition-colors ${copied
                                                ? 'bg-green-500/20 text-green-500'
                                                : (isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500')}`}
                                        >
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isDark
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20'
                                : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-xl shadow-indigo-500/20'}`}
                        >
                            <RefreshCw className="w-4 h-4" />
                            Generate Secure Password
                        </button>

                        {generatedPassword && (
                            <div className={`flex items-center justify-between px-4 py-2 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-100'}`}>
                                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                                    Strength: {genLength >= 20 ? 'Very Strong' : genLength >= 14 ? 'Strong' : genLength >= 10 ? 'Good' : 'Moderate'}
                                </span>
                                <div className="flex gap-1">
                                    {[...Array(4)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-8 h-1.5 rounded-full ${i < (genLength >= 20 ? 4 : genLength >= 14 ? 3 : genLength >= 10 ? 2 : 1)
                                                ? (genLength >= 20 ? 'bg-green-500' : genLength >= 14 ? 'bg-lime-500' : genLength >= 10 ? 'bg-yellow-500' : 'bg-orange-500')
                                                : (isDark ? 'bg-slate-800' : 'bg-slate-300')}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PasswordToolsPage;
