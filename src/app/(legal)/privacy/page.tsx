import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Owely",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 leading-relaxed text-dim">
      <h1 className="font-display text-[32px] font-bold text-hi mb-6">Privacy Policy</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-[20px] font-bold text-strong mb-2">1. Information We Collect</h2>
          <p>
            When you register for Owely, we collect your phone number and basic profile information (name and avatar). This information is necessary to uniquely identify you across groups and facilitate expense sharing.
          </p>
        </section>

        <section>
          <h2 className="text-[20px] font-bold text-strong mb-2">2. Contact Information Storage</h2>
          <p>
            Owely utilizes the native Contact Picker API. When you invite friends, we temporarily process and permanently store only the specific contacts you explicitly select. We never upload your entire address book. We use this data strictly to show you which of your friends are already using Owely. You may clear your synced contacts at any time from the Settings menu.
          </p>
        </section>

        <section>
          <h2 className="text-[20px] font-bold text-strong mb-2">3. Payments & Financial Data</h2>
          <p>
            <strong>Owely does not hold, process, or route any funds.</strong> All payments recorded in the app are manually verified by users or settled out-of-band via third-party UPI applications (e.g., GPay, PhonePe). We do not store your bank account numbers or financial credentials.
          </p>
        </section>

        <section>
          <h2 className="text-[20px] font-bold text-strong mb-2">4. Data Deletion</h2>
          <p>
            You have the right to request deletion of your account. You can delete your account directly from the in-app Settings menu. Upon deletion, your personal data (name, phone number, avatar) is immediately removed. Your participation in shared group expenses will be anonymized to &quot;Deleted User&quot; to preserve the financial mathematics for remaining group members.
          </p>
        </section>
      </div>
    </div>
  );
}
