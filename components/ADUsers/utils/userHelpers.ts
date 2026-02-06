// User Intelligence Module - Utility Helpers
// Label: USER-INTEL-UTILS

import type { ADUser } from '../types/adUsers.types';

/**
 * Build hierarchical OU tree from flat list
 */
export const buildOUTree = (ous: { Name: string; DN: string }[]): any => {
    const tree: any = {};

    for (const ou of ous) {
        const parts = ou.DN.split(',').reverse();
        let current = tree;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part.startsWith('DC=')) continue;

            if (!current[part]) {
                current[part] = {
                    name: ou.Name,
                    dn: ou.DN,
                    children: {},
                };
            }
            current = current[part].children;
        }
    }

    return tree;
};

/**
 * Get animation class for bulk action
 */
export const getAnimationClass = (actionType: string): string => {
    const animations: Record<string, string> = {
        enable: 'animate-pulse bg-green-100 dark:bg-green-900/20',
        disable: 'animate-pulse bg-red-100 dark:bg-red-900/20',
        move: 'animate-pulse bg-blue-100 dark:bg-blue-900/20',
        suffix: 'animate-pulse bg-purple-100 dark:bg-purple-900/20',
        resetPassword: 'animate-pulse bg-orange-100 dark:bg-orange-900/20',
    };
    return animations[actionType] || '';
};

/**
 * Get avatar animation class for bulk action
 */
export const getAvatarAnimation = (actionType: string): string => {
    const animations: Record<string, string> = {
        enable: 'bg-green-500 animate-bounce',
        disable: 'bg-red-500 animate-pulse',
        move: 'bg-blue-500 animate-spin',
        suffix: 'bg-purple-500 animate-bounce',
        resetPassword: 'bg-orange-500 animate-pulse',
    };
    return animations[actionType] || '';
};

/**
 * Get action emoji
 */
export const getActionEmoji = (actionType: string): string => {
    const emojis: Record<string, string> = {
        enable: '✅',
        disable: '❌',
        move: '📁',
        suffix: '🏷️',
        resetPassword: '🔐',
    };
    return emojis[actionType] || '⚡';
};

/**
 * Get action message
 */
export const getActionMessage = (actionType: string): string => {
    const messages: Record<string, string> = {
        enable: '🔄 Enabling...',
        disable: '🔄 Disabling...',
        move: '🔄 Moving to OU...',
        suffix: '🔄 Changing UPN...',
        resetPassword: '🔄 Resetting Password...',
    };
    return messages[actionType] || '🔄 Processing...';
};

/**
 * Format user data for export
 */
export const formatUserForExport = (user: ADUser) => {
    return {
        Name: user.name,
        'SAM Account': user.samAccountName,
        Email: user.email,
        Status: user.status,
        Department: user.department || 'N/A',
        'Last Login': user.lastLogin,
        'Password Last Set': user.lastPasswordSet,
        DN: user.distinguishedName,
    };
};

/**
 * Export users to CSV
 */
export const exportToCSV = (users: ADUser[]): void => {
    if (users.length === 0) return;

    const formatted = users.map(formatUserForExport);
    const headers = Object.keys(formatted[0]);
    const csvContent = [
        headers.join(','),
        ...formatted.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ad-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

/**
 * Export users to JSON
 */
export const exportToJSON = (users: ADUser[]): void => {
    if (users.length === 0) return;

    const formatted = users.map(formatUserForExport);
    const jsonContent = JSON.stringify(formatted, null, 2);

    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ad-users-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
};
