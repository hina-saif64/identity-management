/**
 * HYPERION PASSWORD TOOLS SERVICE
 * Secure password verification and info retrieval for domain users
 * 
 * Security: ISO 27001 compliant - credentials injected via env vars, never logged
 */

import { runPs, sessions, strictSanitize } from '../../gateway-core.js';
import crypto from 'crypto';

/**
 * Verify domain user credentials using DirectoryServices (OPTIMIZED)
 * @param {string} server - AD server
 * @param {string} targetUsername - Username to verify (domain\user or user@domain.com)
 * @param {string} targetPassword - Password to verify
 * @param {object} sessionCredentials - Session credentials for AD connection
 */
export const verifyPassword = async (server, targetUsername, targetPassword, sessionCredentials) => {
    // Sanitize inputs
    const safeUsername = strictSanitize(targetUsername);
    const safeServer = strictSanitize(server);

    if (!safeUsername || !targetPassword) {
        return { valid: false, error: 'Username and password are required' };
    }

    // OPTIMIZED: Use faster DirectoryServices approach without SecureString conversion
    const script = `
        $ErrorActionPreference = 'Stop'
        try {
            # Fast credential validation using DirectoryServices.AccountManagement
            Add-Type -AssemblyName System.DirectoryServices.AccountManagement
            
            $contextType = [System.DirectoryServices.AccountManagement.ContextType]::Domain
            $context = New-Object System.DirectoryServices.AccountManagement.PrincipalContext($contextType, $env:HYP_AD_SERVER)
            
            # Direct validation - fastest method
            $isValid = $context.ValidateCredentials($env:HYP_TARGET_USER, $env:HYP_TARGET_PASS)
            
            $context.Dispose()
            
            if ($isValid) {
                '{"status":"success","valid":true,"message":"Credentials are valid"}'
            } else {
                '{"status":"success","valid":false,"message":"Invalid credentials"}'
            }
        } catch {
            # Use PowerShell's built-in JSON conversion for proper escaping
            $errorObj = @{
                status = 'error'
                valid = $false
                error = $_.Exception.Message
            }
            $errorObj | ConvertTo-Json -Compress
        }
    `;

    const result = await runPs(script, {
        HYP_AD_SERVER: safeServer || sessionCredentials?.server || '',
        HYP_TARGET_USER: safeUsername,
        HYP_TARGET_PASS: targetPassword
    });

    if (result.status === 'error') {
        console.error('[PASSWORD-TOOLS] PowerShell verify error:', result.detail || result.error);
        return { valid: false, error: result.detail || result.error };
    }

    try {
        console.log('[PASSWORD-TOOLS] PowerShell verify output:', result.output);
        return JSON.parse(result.output);
    } catch (e) {
        console.error('[PASSWORD-TOOLS] JSON parse verify error:', e.message);
        console.error('[PASSWORD-TOOLS] Raw verify output:', result.output);
        return { valid: false, error: 'Failed to parse verification result: ' + e.message };
    }
};

/**
 * Get password information for a domain user (SIMPLIFIED - NO CREDENTIALS NEEDED)
 * @param {string} targetUsername - Username to query (domain\user or samAccountName)
 * @param {object} sessionCredentials - Session credentials for AD connection (optional)
 */
export const getPasswordInfo = async (targetUsername, sessionCredentials) => {
    const safeUsername = strictSanitize(targetUsername);

    if (!safeUsername) {
        return { status: 'error', error: 'Username is required' };
    }

    // Extract just the username if domain\user format
    let samAccountName = safeUsername;
    if (safeUsername.includes('\\')) {
        samAccountName = safeUsername.split('\\')[1];
    } else if (safeUsername.includes('@')) {
        samAccountName = safeUsername.split('@')[0];
    }

    // SIMPLIFIED: Try to get user info without credentials first (works on domain-joined machines)
    const script = `
        $ErrorActionPreference = 'Stop'
        try {
            # Try simple ADSI approach first (no credentials needed on domain-joined machines)
            $searcher = New-Object System.DirectoryServices.DirectorySearcher
            $searcher.Filter = "(&(objectClass=user)(sAMAccountName=${samAccountName}))"
            $searcher.PropertiesToLoad.AddRange(@('pwdLastSet', 'userAccountControl', 'lastLogon', 'distinguishedName'))
            
            # Try to find the user
            $result = $searcher.FindOne()
            
            if ($result) {
                $pwdLastSet = if ($result.Properties['pwdLastSet'][0] -and $result.Properties['pwdLastSet'][0] -gt 0) {
                    [DateTime]::FromFileTime($result.Properties['pwdLastSet'][0]).ToString('dd/MM/yyyy HH:mm:ss')
                } else { 'Never' }
                
                $uac = [int]$result.Properties['userAccountControl'][0]
                $passwordExpired = ($uac -band 0x800000) -ne 0
                $passwordNeverExpires = ($uac -band 0x10000) -ne 0
                $accountLocked = ($uac -band 0x10) -ne 0
                
                $lastLogon = if ($result.Properties['lastLogon'][0] -and $result.Properties['lastLogon'][0] -gt 0) {
                    [DateTime]::FromFileTime($result.Properties['lastLogon'][0]).ToString('dd/MM/yyyy HH:mm:ss')
                } else { 'Never' }
                
                # Use PowerShell's built-in JSON conversion for consistency
                $responseObj = @{
                    status = 'success'
                    username = '${samAccountName}'
                    lastPasswordChange = $pwdLastSet
                    passwordExpired = $passwordExpired
                    passwordNeverExpires = $passwordNeverExpires
                    accountLocked = $accountLocked
                    lastLogon = $lastLogon
                }
                $responseObj | ConvertTo-Json -Compress
            } else {
                # Use PowerShell's built-in JSON conversion
                $errorObj = @{
                    status = 'error'
                    error = 'User not found'
                }
                $errorObj | ConvertTo-Json -Compress
            }
            
            $searcher.Dispose()
        } catch {
            # Use PowerShell's built-in JSON conversion for proper escaping
            $errorObj = @{
                status = 'error'
                error = $_.Exception.Message
            }
            $errorObj | ConvertTo-Json -Compress
        }
    `;

    const result = await runPs(script, {
        HYP_AD_SERVER: sessionCredentials?.server || '',
        HYP_AD_USER: sessionCredentials?.username || '',
        HYP_AD_PASS: sessionCredentials?.password || ''
    });

    if (result.status === 'error') {
        console.error('[PASSWORD-TOOLS] PowerShell error:', result.detail || result.error);
        return { status: 'error', error: result.detail || result.error };
    }

    try {
        console.log('[PASSWORD-TOOLS] PowerShell output:', result.output);
        return JSON.parse(result.output);
    } catch (e) {
        console.error('[PASSWORD-TOOLS] JSON parse error:', e.message);
        console.error('[PASSWORD-TOOLS] Raw output:', result.output);
        return { status: 'error', error: 'Failed to parse password info: ' + e.message };
    }
};

/**
 * Generate a secure password with specified options
 * This is done server-side for audit logging capability
 * @param {number} length - Password length
 * @param {object} options - Character set options
 */
export const generatePassword = (length, options = {}) => {
    const {
        useUppercase = true,
        useLowercase = true,
        useNumbers = true,
        useSpecial = true
    } = options;

    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let charset = '';
    const requiredChars = [];

    if (useUppercase) {
        charset += uppercase;
        requiredChars.push(uppercase[Math.floor(Math.random() * uppercase.length)]);
    }
    if (useLowercase) {
        charset += lowercase;
        requiredChars.push(lowercase[Math.floor(Math.random() * lowercase.length)]);
    }
    if (useNumbers) {
        charset += numbers;
        requiredChars.push(numbers[Math.floor(Math.random() * numbers.length)]);
    }
    if (useSpecial) {
        charset += special;
        requiredChars.push(special[Math.floor(Math.random() * special.length)]);
    }

    if (!charset) {
        return { status: 'error', error: 'At least one character type must be selected' };
    }

    const safeLength = Math.max(8, Math.min(64, parseInt(length) || 16));

    // Use crypto for secure random generation
    let password = '';

    // Fill remaining length with random chars
    const remainingLength = safeLength - requiredChars.length;
    for (let i = 0; i < remainingLength; i++) {
        const randomIndex = crypto.randomInt(charset.length);
        password += charset[randomIndex];
    }

    // Add required chars and shuffle
    password = (password + requiredChars.join('')).split('').sort(() => Math.random() - 0.5).join('');

    return {
        status: 'success',
        password,
        length: password.length,
        options: { useUppercase, useLowercase, useNumbers, useSpecial }
    };
};

export default { verifyPassword, getPasswordInfo, generatePassword };
