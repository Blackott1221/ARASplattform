import { Card, CardContent } from "@/components/ui/card";
import { GradientText } from "@/components/ui/gradient-text";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Terms() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: "By accessing and using ARAS AI, you accept and agree to be bound by the terms and provision of this agreement."
    },
    {
      title: "2. Use License",
      content: "Permission is granted to temporarily download one copy of ARAS AI for personal, non-commercial transitory viewing only."
    },
    {
      title: "3. Disclaimer",
      content: "The materials on ARAS AI are provided on an 'as is' basis. ARAS AI makes no warranties, expressed or implied."
    },
    {
      title: "4. Limitations",
      content: "In no event shall ARAS AI or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit)."
    },
    {
      title: "5. Privacy Policy",
      content: "Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service."
    },
    {
      title: "6. Revisions",
      content: "ARAS AI may revise these terms of service for its website at any time without notice."
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
                  <GradientText>Terms of Service</GradientText>
                </h1>
                <p className="text-muted-foreground">
                  Last updated: January 2024
                </p>
              </div>

              {/* Terms Content */}
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
                  Contact Information
                </h2>
                <p className="text-muted-foreground">
                  If you have any questions about these Terms of Service, please contact us at:
                </p>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="text-muted-foreground">Email: legal@arasai.com</p>
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