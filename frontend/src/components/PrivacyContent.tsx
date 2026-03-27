export default function PrivacyContent() {
  return (
    <div className="prose-sm text-sm text-stone-muted leading-relaxed space-y-6">
      <section>
        <h2 className="text-base font-semibold text-foreground mb-2">1. Information We Collect</h2>
        <p>We collect information you provide when registering, creating a profile, posting jobs, submitting applications, and communicating through the Platform. This includes:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Name, email address, and university affiliation</li>
          <li>Profile information (bio, skills, portfolio, location)</li>
          <li>Job listings and application details</li>
          <li>Messages sent through the Platform</li>
          <li>Verification documents (ID photos)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground mb-2">2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Provide and improve the Platform's services</li>
          <li>Verify your identity and student status</li>
          <li>Enable communication between users</li>
          <li>Send notifications about applications, messages, and updates</li>
          <li>Enforce our Terms of Service and ensure platform safety</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground mb-2">3. Information Sharing</h2>
        <p>We do not sell your personal information. We may share limited information:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>With other users as part of your public profile (name, bio, skills, reviews)</li>
          <li>With job posters when you apply for their listings</li>
          <li>When required by law or to protect our rights</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground mb-2">4. Data Security</h2>
        <p>We implement industry-standard security measures including encrypted passwords, JWT authentication, rate limiting, and input validation. However, no method of transmission over the internet is 100% secure.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground mb-2">5. Data Retention</h2>
        <p>We retain your personal data as long as your account is active. You may request deletion of your account and associated data by contacting us.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground mb-2">6. Cookies</h2>
        <p>We use localStorage to store authentication tokens. We do not use tracking cookies or third-party analytics at this time.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground mb-2">7. Your Rights</h2>
        <p>You have the right to access, correct, or delete your personal data. You can update your profile information at any time through the Settings page.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground mb-2">8. Children's Privacy</h2>
        <p>The Platform is not intended for users under 18 years of age. We do not knowingly collect information from minors.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground mb-2">9. Changes to This Policy</h2>
        <p>We may update this Privacy Policy at any time. We will notify users of significant changes through the Platform.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground mb-2">10. Contact</h2>
        <p>If you have questions about this Privacy Policy, please contact us through the Platform.</p>
      </section>
    </div>
  );
}
