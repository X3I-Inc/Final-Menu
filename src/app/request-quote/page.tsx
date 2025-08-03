"use client";
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

function ContactForQuotePage() {
  const email = "emilhasanli.business@gmail.com";
  const phone = "+32 495 35 82 36";

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You can add a toast notification here if you have one set up
    // For example: toast({ title: "Copied to clipboard!" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Card className="shadow-2xl rounded-xl">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6 mx-auto">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-extrabold text-foreground">
              Contact Us for a Custom Quote
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground pt-2">
              For enterprise solutions, white-labeling, or custom requirements, please reach out to us directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
            <div>
              <h3 className="text-lg font-semibold text-center mb-4">How to Reach Us</h3>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-lg bg-background">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-primary" />
                    <a href={`mailto:${email}`} className="font-medium hover:underline">
                      {email}
                    </a>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(email)}>
                    Copy Email
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-lg bg-background">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-primary" />
                    <a href={`tel:${phone.replace(/\s/g, '')}`} className="font-medium hover:underline">
                      {phone}
                    </a>
                  </div>
                   <Button variant="ghost" size="sm" onClick={() => copyToClipboard(phone)}>
                    Copy Phone
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-center mb-4">What to Include in Your Inquiry</h3>
              <p className="text-muted-foreground text-center">
                To help us provide you with the most accurate quote, please include the following details in your email:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2 max-w-md mx-auto">
                <li>Your company name and website.</li>
                <li>The number of restaurant locations you manage.</li>
                <li>A brief description of your key requirements.</li>
                <li>Any specific integrations you might need (e.g., POS, inventory).</li>
                <li>Your estimated timeline for implementation.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RequestQuotePage() {
  // No protected route needed as this is a public contact page
  return <ContactForQuotePage />;
}
