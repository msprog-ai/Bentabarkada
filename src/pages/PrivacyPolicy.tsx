import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-card rounded-2xl p-6 sm:p-10 card-shadow space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
            <p className="text-muted-foreground mt-2">Last updated: March 16, 2026</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide directly when using BentaBarkada:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li><strong>Account Information:</strong> Name, email address, mobile number, and password (encrypted)</li>
              <li><strong>Seller Verification:</strong> Government-issued ID, shop name, address, and optional social media links</li>
              <li><strong>Order Information:</strong> Delivery addresses, payment screenshots, and transaction references</li>
              <li><strong>Usage Data:</strong> Pages visited, actions taken, and device information</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Why We Collect Your Data</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>To create and manage your account</li>
              <li>To verify seller identities and prevent fraud</li>
              <li>To process and track orders</li>
              <li>To facilitate communication between buyers and sellers</li>
              <li>To improve our platform and user experience</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. How We Protect Your Data</h2>
            <p className="text-muted-foreground">We implement industry-standard security measures:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li><strong>Encryption:</strong> All data is transmitted via HTTPS/TLS encryption</li>
              <li><strong>Password Security:</strong> Passwords are hashed using bcrypt and never stored in plain text</li>
              <li><strong>Access Control:</strong> Role-based access ensures only authorized users can view sensitive data</li>
              <li><strong>Private Storage:</strong> Government IDs and payment screenshots are stored in private, authenticated-access-only storage</li>
              <li><strong>Audit Logging:</strong> All administrative actions are logged for accountability</li>
              <li><strong>Data Masking:</strong> Personal information is partially masked when displayed to other users</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your personal data only as long as necessary to provide our services:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li><strong>Account Data:</strong> Retained while your account is active</li>
              <li><strong>Verification Documents:</strong> Retained for the duration of your seller account plus 90 days after deactivation</li>
              <li><strong>Order Data:</strong> Retained for 2 years for transaction records</li>
              <li><strong>Payment Screenshots:</strong> Retained for 6 months after order completion</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Who Can Access Your Data</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li><strong>You:</strong> Full access to your own data</li>
              <li><strong>Sellers:</strong> Can see buyer name and delivery address for fulfillment only</li>
              <li><strong>Buyers:</strong> Can see seller shop name and ratings</li>
              <li><strong>Admins:</strong> Have access to manage users and resolve disputes, with all access logged</li>
              <li><strong>Third Parties:</strong> We do not sell or share your data with third parties for marketing</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Your Rights</h2>
            <p className="text-muted-foreground">You have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Object to processing of your data</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Cookies and Tracking</h2>
            <p className="text-muted-foreground">
              We use essential cookies for authentication and session management only.
              We do not use third-party tracking cookies for advertising purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Data Minimization</h2>
            <p className="text-muted-foreground">
              We only collect information necessary for our services. Buyers are not required to provide
              government identification. Only sellers undergo identity verification to ensure platform trust and safety.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy or your data, please contact us at{' '}
              <a href="mailto:privacy@bentabarkada.com" className="text-primary hover:underline">
                privacy@bentabarkada.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
