import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from "lucide-react";

interface ContactUsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactUsDialog({ open, onOpenChange }: ContactUsDialogProps) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return toast.error("Please enter your name");
    if (!email.trim() || !email.includes("@"))
      return toast.error("Please enter a valid email address");
    if (!subject.trim()) return toast.error("Please enter a subject");
    if (!message.trim()) return toast.error("Please write your message");

    setIsSubmitting(true);

    try {
      // Simulate API call to save lead or contact query
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsSuccess(true);
      toast.success("Message sent! Our IoT experts will contact you soon.");

      // Reset form
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) {
          setIsSuccess(false);
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0" id="contact-us-dialog">
        <div className="grid grid-cols-1 md:grid-cols-5">
          {/* Contact Details Panel (Sidebar) */}
          <div className="bg-slate-900 text-slate-100 p-6 md:p-8 flex flex-col justify-between md:col-span-2">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white mb-2">NexusIoT</h3>
              <p className="text-xs text-slate-400 mb-8">
                Your premier partner for industrial, enterprise, and home IoT development across
                Pakistan.
              </p>

              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Office Address
                    </h4>
                    <p className="text-sm text-slate-400 mt-1">
                      Plot 14-C, Sector I-9, Industrial Area, Islamabad, Pakistan
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Support Availability
                    </h4>
                    <p className="text-sm text-slate-400 mt-1">Mon - Sat, 9:00 AM - 6:00 PM PKT</p>
                    <p className="text-xs text-slate-500">24/7 Email & Online Helpdesk</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Email Inquiry
                    </h4>
                    <p className="text-sm text-slate-400 mt-1">sales@nexusiot.pk</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Operating Hours
                    </h4>
                    <p className="text-sm text-slate-400 mt-1">Monday - Saturday</p>
                    <p className="text-xs text-slate-500">Sunday Closed</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 text-center text-[11px] text-slate-500">
              © {new Date().getFullYear()} NexusIoT Pakistan
            </div>
          </div>

          {/* Contact Form Panel */}
          <div className="p-6 md:p-8 bg-white md:col-span-3 flex flex-col justify-center">
            {isSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Thank You!</h3>
                <p className="text-sm text-slate-600 max-w-sm mx-auto">
                  Your message has been sent successfully. An IoT specialist from our Islamabad
                  office will get back to you within 24 business hours.
                </p>
                <div className="pt-4">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close Window
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader className="text-left mb-2">
                  <DialogTitle className="text-xl font-bold text-slate-900">
                    Send us a message
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Have questions about IoT modules, customs kits, or enterprise hardware
                    integration? Write to us!
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-1">
                  <label htmlFor="contact-name" className="text-xs font-medium text-slate-700">
                    Full Name
                  </label>
                  <Input
                    id="contact-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ahmed Khan"
                    className="h-9 text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="contact-email" className="text-xs font-medium text-slate-700">
                    Email Address
                  </label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ahmed@example.com"
                    className="h-9 text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="contact-subject" className="text-xs font-medium text-slate-700">
                    Subject / Topic
                  </label>
                  <Input
                    id="contact-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Custom PCB Design or Arduino Bulk Order"
                    className="h-9 text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="contact-message" className="text-xs font-medium text-slate-700">
                    Your Message
                  </label>
                  <Textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please write down details about your requirements..."
                    className="min-h-[100px] text-xs sm:text-sm resize-none"
                  />
                </div>

                <Button
                  id="contact-submit"
                  type="submit"
                  className="w-full h-10 mt-2 bg-primary hover:bg-primary/90 text-white font-semibold transition"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2 text-xs sm:text-sm justify-center">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-white" />
                      Sending message...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-xs sm:text-sm justify-center">
                      <Send className="h-4 w-4" />
                      Send Query
                    </span>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
