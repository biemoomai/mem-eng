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
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', borderRadius: '999px', padding: '8px 12px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', marginBottom: '18px' }}
        >
          <ArrowLeft size={15} /> Back
        </button>

        <div className="glass-panel" style={{ padding: '22px', borderRadius: '18px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.28)', marginBottom: '14px' }}>
            <ShieldCheck size={24} color="#a78bfa" />
          </div>
          <h1 style={{ fontSize: '1.55rem', margin: '0 0 0.35rem', fontWeight: 950 }}>Privacy Policy</h1>
          <p style={{ margin: '0 0 1.4rem', color: '#94a3b8', fontSize: '0.76rem' }}>Effective July 4, 2026</p>

          <Section title="What we collect">
            Memeng may save your account email, vocabulary list, study progress, review history, settings, and basic app usage data. When you ask for a new word, that word may be sent to AI or image services to create learning content.
          </Section>

          <Section title="How we use it">
            We use this data to sync your deck, schedule reviews, personalize your learning, keep the app working, prevent abuse, and improve the product.
          </Section>

          <Section title="Services we rely on">
            The app may use services such as Supabase for accounts and database storage, AI providers for word explanations, image providers for visual context, and Netlify for hosting.
          </Section>

          <Section title="Guest mode">
            Guest data may stay only on this device or browser. If browser data is cleared, guest progress can be lost. Creating an account helps back up your deck.
          </Section>

          <Section title="Your choices">
            You can reset your deck in the app, sign out, or ask the app owner to help delete account data. We do not sell your personal data.
          </Section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;