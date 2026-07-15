import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Mail, Hash, Lock, ArrowRight, ShieldCheck, Package } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { useNavigate } from "react-router-dom";

export default function AccessPurchasePage() {
  const navigate = useNavigate();
  const sendOtp = useAction(api.razorpay.sendAccessOtp);
  const verifyOtp = useAction(api.razorpay.verifyAccessOtp);

  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !orderNumber.trim()) return;
    setLoading(true);
    try {
      await sendOtp({ email: email.trim().toLowerCase(), orderNumber: orderNumber.trim().toUpperCase() });
      toast.success("OTP sent to your email!");
      setStep("otp");
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("No order found with this email and order number.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    try {
      const result = await verifyOtp({
        email: email.trim().toLowerCase(),
        orderNumber: orderNumber.trim().toUpperCase(),
        otp: otp.trim(),
      });
      if (result.success && result.token) {
        navigate(`/thank-you/${result.token}`);
      }
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Invalid or expired OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-xl bg-background/60">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <img src="https://hercules-cdn.com/file_3y9pBv81Yd6f6aK28NIgGthc" alt="ProdXStore" className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" /> Secure access
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          {/* Icon */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 rounded-2xl border border-primary/20 bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Package className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Access Your Purchase</h1>
            <p className="text-muted-foreground text-sm">
              No account needed. Enter your email and order number to get your downloads.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {step === "form" ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleRequestOtp}
                className="rounded-2xl border border-white/8 bg-card p-6 space-y-4"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-background border-white/10 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Order Number</Label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      required
                      placeholder="e.g. PXS-ABC123-XY9Z"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                      className="pl-10 bg-background border-white/10 h-11 font-mono text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Your order number is in the confirmation email.
                  </p>
                </div>

                <Button type="submit" className="w-full rounded-full gap-2" disabled={loading}>
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>Send OTP to Email <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  A one-time code will be sent to your email. Valid for 10 minutes.
                </p>
              </motion.form>
            ) : (
              <motion.form
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleVerifyOtp}
                className="rounded-2xl border border-white/8 bg-card p-6 space-y-4"
              >
                <div className="flex items-start gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    OTP sent to <strong className="text-foreground">{email}</strong>.
                    Check your inbox (and spam folder).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Enter 6-digit OTP</Label>
                  <Input
                    required
                    placeholder="123456"
                    value={otp}
                    maxLength={6}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="bg-background border-white/10 h-14 text-center text-2xl font-mono tracking-widest"
                  />
                </div>

                <Button type="submit" className="w-full rounded-full gap-2" disabled={loading}>
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>Verify & Access Downloads <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep("form"); setOtp(""); }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-center"
                >
                  ← Try different email or order number
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Need help?{" "}
            <a href="mailto:prodxstoresupport@gmail.com" className="text-primary hover:underline">
              prodxstoresupport@gmail.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
