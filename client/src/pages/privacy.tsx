import { Card, CardContent } from "@/components/ui/card";
import { GradientText } from "@/components/ui/gradient-text";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Privacy() {
  const sections = [
    {
      title: "1. Information We Collect",
      content: "We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support."
    },
    {
      title: "2. How We Use Your Information",
      content: "We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you."
    },
    {
      title: "3. Information Sharing",
      content: "We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy."
    },
    {
      title: "4. Data Security",
      content: "We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction."
    },
    {
      title: "5. Your Rights",
      content: "You have the right to access, update, or delete your personal information. You may also opt out of certain communications from us."
    },
    {
      title: "6. Cookies and Tracking",
      content: "We use cookies and similar tracking technologies to collect and use personal information about you, including to serve interest-based advertising."
    },
    {
      title: "7. Changes to This Policy",
      content: "We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page."
    }
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              {/* Header */}
              <div className="mb-8">
                <Link href="/signup">
                  <Button
                    variant="ghost"
                    className="p-0 h-auto text-muted-foreground hover:text-primary mb-6"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to signup
                  </Button>
                </Link>
                
                <h1 className="text-3xl font-orbitron font-bold mb-4">
                  <GradientText>Privacy Policy</GradientText>
                </h1>
                <p className="text-muted-foreground">
                  Last updated: January 2024
                </p>
              </div>

              {/* Privacy Content */}
              <div className="space-y-8">
                {sections.map((section, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="space-y-4"
                  >
                    <h2 className="text-xl font-orbitron font-semibold text-primary">
                      {section.title}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {section.content}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Contact Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="mt-12 pt-8 border-t border-border/50"
              >
                <h2 className="text-xl font-orbitron font-semibold text-primary mb-4">
                  Contact Us
                </h2>
                <p className="text-muted-foreground">
                  If you have any questions about this Privacy Policy, please contact us at:
                </p>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="text-muted-foreground">Email: privacy@arasai.com</p>
                  <p className="text-muted-foreground">Address: 123 Innovation Drive, Tech City, TC 12345</p>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}