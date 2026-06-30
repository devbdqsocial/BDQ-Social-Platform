"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Minus } from "lucide-react";
import { phone10, emailOptional, digitsCapped } from "@/lib/validators";
import { useFieldValidation } from "@/lib/use-field-validation";
import { issueOfflineTickets, type OfflineCartItem } from "./pos-actions";

interface TicketType {
  id: string;
  name: string;
  priceInPaise: number;
  totalQty: number;
  soldQty: number;
}

export function POSForm({ eventId, ticketTypes }: { eventId: string; ticketTypes: TicketType[] }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const phoneField = useFieldValidation(phone10);
  const emailField = useFieldValidation(emailOptional);

  const [cart, setCart] = useState<Record<string, number>>({});

  const handleAdd = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const handleRemove = (id: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[id] > 1) {
        next[id]--;
      } else {
        delete next[id];
      }
      return next;
    });
  };

  const items: OfflineCartItem[] = Object.entries(cart).map(([id, qty]) => {
    const type = ticketTypes.find((t) => t.id === id)!;
    return { ticketTypeId: id, qty, priceInPaise: type.priceInPaise };
  });

  const subtotal = items.reduce((acc, it) => acc + it.priceInPaise * it.qty, 0);

  const handleSubmit = async (mode: "OFFLINE" | "ONLINE") => {
    if (items.length === 0) return;
    const phoneOk = phoneField.validate(phone);
    const emailOk = emailField.validate(email);
    if (!phoneOk || !emailOk) return;
    if (!paymentReference.trim()) {
      toast.error("Payment reference is required.");
      return;
    }
    if (!paymentNote.trim()) {
      toast.error("Payment note is required.");
      return;
    }
    setLoading(true);
    try {
      await issueOfflineTickets({
        eventId,
        name,
        phone,
        email,
        items,
        paymentMode: mode,
        paymentReference,
        paymentNote,
      });
      
      toast.success(`Issued ${items.reduce((a, b) => a + b.qty, 0)} tickets.`);
      
      // Reset
      setName("");
      setPhone("");
      setEmail("");
      setPaymentReference("");
      setPaymentNote("");
      setCart({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to issue tickets");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
            <CardDescription>Enter details for the offline purchaser</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  aria-invalid={!!phoneField.error}
                  onChange={(e) => { setPhone(digitsCapped(10)(e.target.value)); phoneField.clear(); }}
                  onBlur={() => phone && phoneField.validate(phone)}
                />
                {phoneField.error && <p className="text-xs text-destructive">{phoneField.error}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                maxLength={160}
                value={email}
                placeholder="john@example.com"
                aria-invalid={!!emailField.error}
                onChange={(e) => { setEmail(e.target.value); emailField.clear(); }}
                onBlur={() => email && emailField.validate(email)}
              />
              {emailField.error && <p className="text-xs text-destructive">{emailField.error}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ticketTypes.map((t) => {
              const qty = cart[t.id] || 0;
              const remaining = t.totalQty - t.soldQty - qty;
              const disabledAdd = remaining <= 0;
              
              return (
                <div key={t.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-muted-foreground">₹{(t.priceInPaise / 100).toFixed(2)} &middot; {t.totalQty - t.soldQty} left</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" aria-label={`Fewer ${t.name}`} className="relative h-8 w-8 after:absolute after:-inset-1.5" onClick={() => handleRemove(t.id)} disabled={qty === 0}>
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-4 text-center font-medium">{qty}</span>
                    <Button variant="outline" size="icon" aria-label={`More ${t.name}`} className="relative h-8 w-8 after:absolute after:-inset-1.5" onClick={() => handleAdd(t.id)} disabled={disabledAdd}>
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {ticketTypes.length === 0 && (
              <div className="p-4 border rounded-md border-dashed text-center">
                <p className="text-sm text-muted-foreground">No tickets available.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span>Subtotal</span>
              <span>₹{(subtotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Discount</span>
              <span>₹0.00</span>
            </div>
            <div className="pt-4 border-t flex justify-between items-center font-bold">
              <span>Total</span>
              <span>₹{(subtotal / 100).toFixed(2)}</span>
            </div>
            <div className="space-y-3 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="payment-reference">Payment reference</Label>
                <Input
                  id="payment-reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Cash receipt or UPI UTR"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-note">Payment note</Label>
                <Input
                  id="payment-note"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Who received it and where"
                  required
                />
              </div>
            </div>

            <div className="pt-6 space-y-3">
              <Button 
                className="w-full" 
                size="lg" 
                disabled={items.length === 0 || loading}
                onClick={() => handleSubmit("OFFLINE")}
              >
                Issue via Cash
              </Button>
              <Button 
                className="w-full" 
                variant="outline" 
                size="lg"
                disabled={items.length === 0 || loading}
                onClick={() => handleSubmit("ONLINE")}
              >
                Issue via UPI
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
