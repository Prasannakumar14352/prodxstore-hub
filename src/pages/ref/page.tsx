/**
 * /ref/:code — records an affiliate visit, stores code in sessionStorage,
 * then redirects to the storefront.
 */
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Loader2 } from "lucide-react";

export const AFFILIATE_CODE_KEY = "pxs_affiliate_code";

export default function RefPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const recordVisit = useMutation(api.affiliates.recordVisit);

  useEffect(() => {
    if (!code) {
      navigate("/", { replace: true });
      return;
    }

    recordVisit({ code })
      .then((result) => {
        if (result?.valid) {
          // Persist for the session so checkout can pick it up
          sessionStorage.setItem(AFFILIATE_CODE_KEY, result.code);
        }
      })
      .catch(() => {
        // silently ignore — still redirect
      })
      .finally(() => {
        navigate("/", { replace: true });
      });
  }, [code, navigate, recordVisit]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );
}
