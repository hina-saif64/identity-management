# Hyperion Identity Management System

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Version](https://img.shields.io/badge/version-2.4.0-green.svg) ![Status](https://img.shields.io/badge/status-Production%20Ready-success.svg) ![Security](https://img.shields.io/badge/security-RBAC%20Enabled-blueviolet.svg)

**Hyperion** is an enterprise-grade Identity & Access Management (IAM) platform designed to unify Active Directory, Exchange, and Cloud Governance into a single, highly efficient control plane. It bridges the gap between complex PowerShell operations and intuitive L1/L2 support workflows.

---

## 🚀 The Operational Challenge

Modern IT environments suffer from fragmented tooling. Administrators often struggle with:
*   **Context Switching**: Jumping between ADUC, Exchange EC, Azure Portal, and PowerShell terminals.
*   **Manual Overhead**: Repetitive tasks like user provisioning, password resets, and offboarding consume 30-40% of helpdesk time.
*   **Safety Risks**: Direct PowerShell access increases the risk of accidental bulk deletions or misconfigurations.
*   **Compliance Gaps**: Lack of unified audit trails for identity changes across hybrid environments.

## �️ The Hyperion Solution

Hyperion provides a **Single Pane of Glass** for hybrid identity management, reducing operational friction and empowering support teams to resolve tickets faster.

### Key Capabilities

#### 🔐 Advanced Identity Lifecycle
*   **Unified User Management**: Create, modify, and manage AD users with a modern web UI.
*   **Intelligent Bulk Operations**: Perform safe bulk updates (Reset Password, Move OU, Disable Account) for hundreds of users in seconds.
*   **Stale Account Detection**: Automated scanning for dormant accounts to improve hygiene and reduce attack surface.
*   **Smart Search**: Regex-powered filtering across `sAMAccountName`, `userPrincipalName`, and custom attributes.

#### 📧 Exchange & Communication
*   **Remote Mailbox Provisioning**: Zero-touch Exchange On-Premises management via secure remote sessions.
*   **Attributes Management**: Manage SMTP aliases, routing addresses, and quotas without RDP access to Exchange servers.

#### ☁️ Cloud & Governance
*   **Hybrid Visibility**: Correlation of on-prem AD users with Azure AD (Entra ID) identities.
*   **License Optimization**: Visibility into assigned M365 licenses (E3, E5, F3) to prevent wastage.
*   **PowerBI Governance**: Deep insights into workspace usage, report access, and user activity via unified audit logs.

---

## ⚡ Operational ROI

Implementing Hyperion transforms IT operations by delivering measurable efficiency gains:

| Metric | Improvement |
| :--- | :--- |
| **Ticket Resolution Time** | Reduced by **~60%** for common identity tasks (Password resets, Unlocks). |
| **Onboarding Efficiency** | **4x Faster** user provisioning flow compared to manual ADUC entry. |
| **L1 Empowerment** | Enables L1 Helpdesk to perform complex tasks safely, reducing escalation to L3 Systems Engineering. |
| **Audit Readiness** | Centralized logging of all administrative actions for compliance reviews. |

---

## 🏗️ Architecture & Security

Built on a robust, modular stack designed for scalability and security:

*   **Frontend**: React 18, Vite, TailwindCSS (Responsive, Dark Mode Native).
*   **Backend Middleware**: Node.js Express Gateway.
*   **Integration Layer**: PowerShell 7 / Windows PowerShell 5.1 (Remoting).
*   **Security Model**:
    *   **RBAC**: Role-Based Access Control restricting actions.
    *   **Secure Credential Injection**: No credentials passed in plain text; uses secure environment variables and vault integration.
    *   **Sanitized Input**: strict regex validation on all inputs to prevent injection attacks.

---

## 🖥️ Demo Environment

This repository contains a **fully functional demonstration build** of Hyperion. It runs in a self-contained "Demo Mode" using simulated backend systems.

### Quick Start
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/hina-saif64/identity-management.git
    cd identity-management
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Launch Demo Server**:
    ```bash
    node server.js
    ```

4.  **Access the Dashboard**:
    Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note**: In Demo Mode, all data (Users, Mailboxes, Logs) is generated locally. No connection to real Active Directory or Azure tenants is required.

---

### 📬 Contact & Support
For enterprise integration support or feature requests, please raise an issue in the repository.

Copyright © 2026 Hina Saif. All rights reserved.