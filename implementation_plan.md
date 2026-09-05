# DraftMate Complete Project Functionality & Monetization Audit

This document provides a **360-degree audit of all 88 pages, routes, and modules** in the DraftMate codebase. It establishes the **Free Tier Hard Task Limit Strategy** and the **Exhaustive Credit Deduction Matrix for Premium Users**.

---

## 1. Executive Summary & Revenue Architecture

```
                               DRAFTMATE MONETIZATION ENGINE
                                             │
             ┌───────────────────────────────┴───────────────────────────────┐
             ▼                                                               ▼
       FREE TRIAL TIER                                               PRO ADVOCATE PLAN
       (Zero Recurring Overhead)                                     (₹999 / month)
       • Fixed Lifetime Trial Quotas                                 • 5,000 Credits Deposited Monthly
       • 2 Drafts, 2 Translations, 5 Searches                       • Deducted dynamically per task
       • Hard Lock → Netflix Upgrade Paywall                         • Top-Up Packs Available (₹199 - ₹999)
```

### Financial Overhead vs Revenue Targets
- **Fixed Infrastructure Overhead:** **₹25,000 / month** (AWS ECS, ECR, OpenAI / Anthropic API, Qdrant Vector DB).
- **Breakeven Volume:** Only **26 Pro Advocates @ ₹999/month** (or 10 Law Firms @ ₹2,499/month) completely covers total server & API costs.
- **Scale Potential:** 100 Pro Users = **₹71,900/month NET PROFIT** (72% Profit Margin).

---

## 2. Comprehensive Module-by-Module Audit

DraftMate features are divided into 3 distinct operational tiers based on computational cost:

---

### Tier A: Core Generative AI Modules (High Compute / API Cost)

| Module / Route | Core Functionality | Free Tier Trial Quota | Premium Pro Credit Cost |
| :--- | :--- | :--- | :--- |
| **AI Legal Drafting**<br>`/dashboard/drafting` | AI Plaints, Writs, Petitions, Applications, Contracts | **2 Drafts Total** | • **10 Credits** (Simple Draft)<br>• **25 Credits** (Complex Petition) |
| **ONLYOFFICE Workspace**<br>`/dashboard/workspace` | Rich Document Editor + AI Assistant + 5-min Auto-Save | Shared with Drafting | • **5 Credits** (AI Rephrase)<br>• **5 Credits** (Auto-Format) |
| **Legal Translation**<br>`/dashboard/translate` | Side-by-side Vernacular ↔ English Translation | **2 Translations Total** | • **5 Credits** (Short Text)<br>• **10 Credits / page** (Full Document) |
| **Chat with PDF**<br>`/dashboard/chat-pdf` | RAG Vector Search, OCR, Clause Extraction & Q&A | **1 PDF Upload Total** | • **10 Credits** (Upload & OCR)<br>• **5 Credits / prompt** (Q&A Query) |
| **Chronology Workspace**<br>`/dashboard/chronology` | Date & Timeline extraction from case files | **2 Extractions Total** | • **15 Credits / extraction** |

---

### Tier B: Search & Intelligence Modules (Medium Compute / DB Cost)

| Module / Route | Core Functionality | Free Tier Trial Quota | Premium Pro Credit Cost |
| :--- | :--- | :--- | :--- |
| **Verified Legal Research**<br>`/dashboard/research` | Multi-agent research pipeline across Bare Acts & Precedents | **5 Searches Total** | • **3 Credits / query** |
| **Judgment Search**<br>`/dashboard/judgments` | Kanoon API integration, multi-paragraph text extraction | **5 Searches Total**<br>*(Full Judgment View is FREE)* | • **3 Credits / search**<br>• **10 Credits** (AI Ratio Summary) |
| **eCourt Services**<br>`/dashboard/ecourt` | CNR lookup, hearing tracking & cause lists | **3 Searches Total** | • **2 Credits / search update** |

---

### Tier C: Productivity & Utility Modules (Zero LLM API Cost - 100% FREE For All Users)

These modules run locally or via lightweight statutory scripts to keep user engagement high without burning server credits:

| Module / Route | Features Included | Free & Pro Cost |
| :--- | :--- | :--- |
| **PDF Tool Kit** (`/dashboard/tools`, `/dashboard/pdf-editor`) | Merge PDFs, Rearrange Pages, Split, Watermark, Convert | **0 Credits (FREE)** |
| **Legal Calculators** (`/dashboard/tools`) | Court Fee, Limitation Period, SIP, Salary | **0 Credits (FREE)** |
| **Invoice Generator** (`/dashboard/tools`) | Client Billing & PDF Receipts | **0 Credits (FREE)** |
| **Legal Library & Bare Acts** (`/dashboard/library/*`) | Act Details, Forms, Dictionary, Bookmarks, Diary, Notes | **0 Credits (FREE)** |
| **Lawyer Profile Directory** (`/dashboard/profile`, `/advocates`) | Public Advocate Discovery & Bar Council Verification | **0 Credits (FREE)** |

---

## 3. Netflix-Style Upgrade Paywall Strategy

When a free trial user attempts a 3rd Draft, 3rd Translation, or 6th Search:

```
[Free User Clicks 'Generate Draft #3']
                  │
                  ▼
[Quota Check Fails: 2/2 Free Drafts Used]
                  │
                  ▼
[BLOCK API Call Immediately]
                  │
                  ▼
[Open Netflix-Style Glassmorphism Modal]
  ├── Title: "Free Trial Limit Reached (2/2 Drafts Used)"
  ├── Benefits: Unlimited AI Drafting, Verified Citations, Chat PDF
  └── CTA Button: "Upgrade to DraftMate Pro for ₹999/month"
```

---

## 4. Technical Implementation Checklist

- [ ] Create `quotaManager.js` to track user trial counts locally & sync with profile metadata.
- [ ] Build `PaywallModal.jsx` component with Netflix dark glassmorphism styling.
- [ ] Attach `checkQuota()` guards to submit buttons in `DraftingLanding.jsx`, `TranslateDocumentPage.jsx`, and `ChatWithPDF.jsx`.
- [ ] Connect `MainLayout.jsx` top navbar credit meter to display live dynamic credits for Pro users.
