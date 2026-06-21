# Mem-eng (จำอิ้ง) - Spaced Repetition Flashcard Application

Mem-eng is a modern, high-aesthetic vocabulary study application leveraging the Free Spaced Repetition Scheduler (FSRS) memory consolidation algorithms integrated with millisecond-level response-time tracking (cognitive hesitation analysis).

---

## ⚡ Key Features
*   **FSRS Memory Algorithm**: Mathematical spaced repetition based on the Ebbinghaus forgetting curve.
*   **Cognitive Hesitation Penalty**: Measures the millisecond duration spent recalling vocabulary details to dynamically penalize stability decay.
*   **Offline-First Supabase Sync**: Real-time cloud syncing when online, with robust local storage caching during offline sessions.
*   **High-Aesthetic Premium UI**: Responsive glassmorphism interface with custom animated stick figure SVG doodles.

---

## 🚀 Running Locally
1.  Initialize dependencies:
    ```bash
    npm install
    ```
2.  Set up your `.env.local` variables in the root directory:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_GEMINI_API_KEY=your_gemini_api_key
    ```
3.  Deploy the database tables by executing the migrations script located at [database/schema.sql](file:///C:/Users/BoomBorriboon/.gemini/antigravity/scratch/mem-eng/database/schema.sql) in your Supabase SQL Editor.
4.  Run the Vite development server:
    ```bash
    npm run dev
    ```
