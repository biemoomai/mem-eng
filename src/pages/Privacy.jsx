import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Section = ({ title, children }) => (
  <section style={{ marginBottom: '1.2rem' }}>
    <h2 style={{ fontSize: '0.92rem', margin: '0 0 0.45rem', color: '#ffffff', fontWeight: 850 }}>{title}</h2>
    <p style={{ margin: 0, color: '#a8b3c7', fontSize: '0.78rem', lineHeight: 1.65 }}>{children}</p>
  </section>
);

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: 'var(--bg-color)', color: '#ffffff', overflowY: 'auto', padding: '22px 18px 36px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '520px', margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', borderRadius: '999px', padding: '8px 12px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', marginBottom: '18px' }}>
          <ArrowLeft size={15} /> Back
        </button>
        <div className="glass-panel" style={{ padding: '22px', borderRadius: '18px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.28)', marginBottom: '14px' }}><ShieldCheck size={24} color="#a78bfa" /></div>
          <h1 style={{ fontSize: '1.55rem', margin: '0 0 0.35rem', fontWeight: 950 }}>Privacy Policy</h1>
          <p style={{ margin: '0 0 1.4rem', color: '#94a3b8', fontSize: '0.76rem' }}>Effective July 11, 2026</p>
          <Section title="What we collect">Memeng may store account details, saved vocabulary, review progress, settings, and basic usage records needed to run the app. When you request a new word or image, the request may be processed by learning-content and image services.</Section>
          <Section title="Guest mode">A guest receives a temporary account so a deck can work across a session. Guest accounts that have not signed in for 30 days are scheduled for deletion. Linking an email or Google account keeps the same deck.</Section>
          <Section title="How we use it">We use this information to sync your deck, calculate review timing, prevent abuse, keep the app reliable, and improve learning quality. We do not sell personal data.</Section>
          <Section title="Services we rely on">Memeng uses Supabase for accounts and storage, Cloudflare Pages for web hosting, and third-party learning-content or image providers when needed.</Section>
          <Section title="Your choices">You can reset a deck, delete a guest account, or delete an account and its data from the app menu. Deletion is permanent.</Section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;