"use client";

/** Client-side Razorpay Checkout loader + opener, shared by ticket and stall payment flows. */

type RzpOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  theme?: { color: string };
  handler: () => void;
  modal?: { ondismiss: () => void };
};
type RzpCtor = new (o: RzpOptions) => { open: () => void };
declare global {
  interface Window {
    Razorpay?: RzpCtor;
  }
}

function loadRazorpay(): Promise<RzpCtor> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay unavailable")));
    s.onerror = () => reject(new Error("Could not load Razorpay"));
    document.body.appendChild(s);
  });
}

export async function openCheckout(opts: {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  description: string;
  onSuccess: () => void;
  onDismiss?: () => void;
}): Promise<void> {
  const Razorpay = await loadRazorpay();
  new Razorpay({
    key: opts.keyId,
    amount: opts.amountPaise,
    currency: "INR",
    order_id: opts.razorpayOrderId,
    name: "Event Portal",
    description: opts.description,
    theme: { color: "#C2603B" },
    handler: opts.onSuccess,
    modal: { ondismiss: () => opts.onDismiss?.() },
  }).open();
}
