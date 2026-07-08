import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Owely",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 leading-relaxed text-dim">
      <h1 className="font-display text-[32px] font-bold text-hi mb-6">Terms of Service</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-[20px] font-bold text-strong mb-2">1. Introduction</h2>
          <p>
            Welcome to Owely. By accessing or using our application, you agree to be bound by these Terms of Service. Owely provides a platform to track shared expenses and simplify debts among friends.
          </p>
        </section>

        <section>
          <h2 className="text-[20px] font-bold text-strong mb-2">2. Non-Financial Entity Disclaimer</h2>
          <p>
            Owely is strictly an accounting and record-keeping tool. <strong>We are not a payment aggregator, bank, or financial institution.</strong> Owely never holds, processes, or touches your money. Any settlement features (such as opening your UPI app) simply use native operating system intents to pass payment details to your chosen payment application. We bear no liability for transactions made outside our platform.
          </p>
        </section>

        <section>
          <h2 className="text-[20px] font-bold text-strong mb-2">3. User Conduct</h2>
          <p>
            You agree to use Owely only for lawful purposes. You are responsible for ensuring that the expenses you log are accurate and agreed upon by the participants in your groups. Misuse of the platform (e.g., spamming invites, creating fake expenses for harassment) may result in account termination.
          </p>
        </section>

        <section>
          <h2 className="text-[20px] font-bold text-strong mb-2">4. Account Deletion</h2>
          <p>
            You can delete your account at any time. When you do, your personal information is permanently deleted from our servers. To maintain the integrity of shared financial records for other users, any expenses you were involved in will remain, but your name will be irreversibly anonymized.
          </p>
        </section>
      </div>
    </div>
  );
}
