"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateCampaignAction, publishCampaignAction, getCampaignProgressAction } from "./actions";
import { pauseCampaignAction, resumeCampaignAction, cancelCampaignAction } from "../../actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea, Select } from "@/components/ui/input";
import { toast } from "sonner";
import { campaignEmailHtml } from "@/lib/email-template";
import { 
  Tv, 
  Smartphone, 
  Mail, 
  MessageSquare, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Bold, 
  Italic, 
  Underline, 
  Link, 
  List, 
  Play, 
  Pause, 
  XCircle, 
  Sparkles,
  Heading1,
  Heading2
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface ContactItem {
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface CampaignStats {
  delivered?: number;
  opened?: number;
  clicked?: number;
  failed?: number;
}

interface OutboxItem {
  id: string;
  toAddress: string;
  status: string;
  attempts: number;
  lastError: string | null;
  sentAt: Date | string | null;
  createdAt: Date | string;
}

export type CampaignType = {
  id: string;
  name: string;
  channel: string;
  audience: string;
  subject: string | null;
  body: string | null;
  status: string;
  sentCount: number;
  customContacts: ContactItem[] | null;
  stats: CampaignStats | null;
};

export function CampaignBuilder({ campaign: initialCampaign }: { campaign: CampaignType }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Local state
  const [campaign, setCampaign] = useState<CampaignType>(initialCampaign);
  const [subject, setSubject] = useState(initialCampaign.subject || "");
  const [body, setBody] = useState(initialCampaign.body || "");
  const [audience, setAudience] = useState(initialCampaign.audience || "ALL");
  const [customContacts, setCustomContacts] = useState(
    initialCampaign.customContacts 
      ? (initialCampaign.customContacts as ContactItem[]).map(c => c.email || c.phone).join("\n") 
      : ""
  );

  // Sync state
  const [syncState, setSyncState] = useState<"saved" | "saving" | "error">("saved");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isQueueActionLoading, setIsQueueActionLoading] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("mobile");
  
  // Live analytics state
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);

  // Periodically poll delivery stats and logs when campaign is active
  const isActive = ["SCHEDULED", "PROCESSING", "PAUSED"].includes(campaign.status);

  useEffect(() => {
    if (!isActive) return;

    const fetchProgress = async () => {
      const res = await getCampaignProgressAction(campaign.id);
      if (res.success && res.campaign) {
        const campaignData = res.campaign;
        setCampaign(prev => ({
          ...prev,
          status: campaignData.status,
          sentCount: campaignData.sentCount,
          stats: campaignData.stats as CampaignStats | null
        }));
        if (res.outboxItems) {
          setOutboxItems(res.outboxItems);
        }
      }
    };

    fetchProgress();
    const interval = setInterval(fetchProgress, 5000);
    return () => clearInterval(interval);
  }, [isActive, campaign.id]);

  // Debounced auto-save effect (2 seconds)
  useEffect(() => {
    if (campaign.status !== "DRAFT") return;
    
    // Check if anything actually changed from state vs database values
    const hasChanged = 
      subject !== (campaign.subject || "") ||
      body !== (campaign.body || "") ||
      audience !== campaign.audience ||
      customContacts !== (campaign.customContacts ? (campaign.customContacts as ContactItem[]).map(c => c.email || c.phone).join("\n") : "");

    if (!hasChanged) return;

    setSyncState("saving");

    const timer = setTimeout(async () => {
      const formData = new FormData();
      formData.append("audience", audience);
      formData.append("subject", subject);
      formData.append("body", body);
      formData.append("customContacts", customContacts);

      const res = await updateCampaignAction(campaign.id, formData);
      if (res.success) {
        setSyncState("saved");
        setCampaign(prev => ({
          ...prev,
          audience,
          subject,
          body,
          customContacts: customContacts ? customContacts.split("\n").map(c => ({ name: null, email: c.includes("@") ? c : null, phone: !c.includes("@") ? c : null })) : null
        }));
      } else {
        setSyncState("error");
        toast.error(res.error || "Auto-save failed");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [subject, body, audience, customContacts, campaign]);

  // Editor formatting functions
  const insertText = (beforeText: string, afterText: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = beforeText + selectedText + afterText;

    const newBody = text.substring(0, start) + replacement + text.substring(end);
    setBody(newBody);
    
    // Reset focus and caret
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + beforeText.length, start + beforeText.length + selectedText.length);
    }, 0);
  };

  // Publish / Send trigger
  const handlePublish = async () => {
    if (!confirm("Are you sure you want to queue this campaign? This will immediately begin dispatching notifications.")) return;
    
    setIsPublishing(true);
    const res = await publishCampaignAction(campaign.id);
    setIsPublishing(false);
    
    if (res.success) {
      toast.success("Campaign is now queued for delivery.");
      setCampaign(prev => ({ ...prev, status: "SCHEDULED" }));
      router.refresh();
    } else {
      toast.error(res.error || "Failed to publish");
    }
  };

  // Queue actions: Pause, Resume, Cancel
  const handleQueueAction = async (action: "pause" | "resume" | "cancel") => {
    setIsQueueActionLoading(true);
    let res;
    if (action === "pause") {
      res = await pauseCampaignAction(campaign.id);
    } else if (action === "resume") {
      res = await resumeCampaignAction(campaign.id);
    } else {
      if (!confirm("Are you sure you want to cancel? Remaining queued deliveries will be permanently aborted.")) {
        setIsQueueActionLoading(false);
        return;
      }
      res = await cancelCampaignAction(campaign.id);
    }
    setIsQueueActionLoading(false);

    if (res && res.success) {
      toast.success(`Campaign successfully ${action}d.`);
      setCampaign(prev => ({
        ...prev,
        status: action === "pause" ? "PAUSED" : action === "resume" ? "SCHEDULED" : "CANCELLED"
      }));
    } else {
      toast.error(res?.error || `Failed to ${action} campaign`);
    }
  };

  // Render variables resolved inside previews
  const resolvePreviewVariables = (text: string) => {
    if (!text) return "";
    return text
      .replace(/{name}/g, "John Doe")
      .replace(/{email}/g, "john.doe@example.com")
      .replace(/{eventName}/g, "Tech Summit 2026")
      .replace(/{ticketLink}/g, "https://bdqsocial.com/tickets/t_102948");
  };

  // Recharts delivery breakdown configurations
  const stats = campaign.stats || { delivered: 0, failed: 0 };
  const deliveredVal = Number(stats.delivered || 0);
  const failedVal = Number(stats.failed || 0);
  const pendingVal = Math.max(0, Number(campaign.sentCount || 0) - (deliveredVal + failedVal));
  
  const chartData = [
    { name: "Delivered", value: deliveredVal, color: "#10b981" },
    { name: "Failed", value: failedVal, color: "#ef4444" },
    { name: "Pending", value: pendingVal, color: "#6b7280" }
  ];
  const emailPreviewBody = body
    ? resolvePreviewVariables(body)
    : `<p style="margin:0;color:#626682;font-style:italic">Type message text to see live rendering.</p>`;
  const emailPreviewHtml = campaignEmailHtml({ body: emailPreviewBody, unsubscribeUrl: "#" });

  return (
    <div className="grid gap-6 lg:grid-cols-5 items-start">
      
      {/* LEFT: Configuration & Editor (3 cols) */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Settings Glassmorphic Box */}
        <div className="rounded-2xl border bg-card/60 backdrop-blur-md shadow-lg overflow-hidden">
          <div className="border-b px-6 py-4 flex justify-between items-center bg-muted/20">
            <div>
              <h3 className="font-semibold text-lg">Campaign Editor</h3>
              <p className="text-xs text-muted-foreground">Configure dynamic segments, paste custom lists, and draft copy.</p>
            </div>
            {campaign.status === "DRAFT" && (
              <div className="flex items-center gap-2 text-xs">
                {syncState === "saving" && (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Auto-saving...</span>
                  </>
                )}
                {syncState === "saved" && (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500 font-bold" />
                    <span className="text-emerald-500 font-medium">Saved to portal</span>
                  </>
                )}
                {syncState === "error" && (
                  <>
                    <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                    <span className="text-rose-500 font-medium">Auto-save error</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            <fieldset disabled={campaign.status !== "DRAFT"} className="space-y-6">
              
              {/* Audience Segment Switcher */}
              <div className="space-y-4">
                <Field label="Audience Targeting">
                  <Select 
                    value={audience} 
                    onChange={(e) => setAudience(e.target.value)}
                  >
                    <option value="ALL">All Users</option>
                    <option value="VENDORS">Vendors Only</option>
                    <option value="TICKET_HOLDERS">Ticket Holders Only</option>
                    <option value="WAITLIST">Waitlist Members Only</option>
                    <option value="CUSTOM">Custom Recipients Overrides</option>
                  </Select>
                </Field>

                {audience === "CUSTOM" && (
                  <Field label="Custom Contacts List" hint="Enter emails or phone numbers, separated by commas or newlines.">
                    <Textarea
                      placeholder="e.g. user1@gmail.com, +919876543210, user2@gmail.com"
                      value={customContacts}
                      onChange={(e) => setCustomContacts(e.target.value)}
                      className="min-h-[100px] font-mono text-sm"
                    />
                  </Field>
                )}
              </div>

              {campaign.channel === "EMAIL" && (
                <Field label="Subject Line">
                  <Input 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Exciting updates about our event!" 
                    required 
                  />
                </Field>
              )}

              {/* Message Body with interactive custom visual formatting tools toolbar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-foreground">Message Body</span>
                  <span className="text-2xs text-muted-foreground uppercase tracking-wider">
                    {campaign.channel === "EMAIL" ? "Supports HTML layouts" : "WhatsApp formatting"}
                  </span>
                </div>

                {/* VISUAL WYSIWYG Toolbar */}
                <div className="flex flex-wrap gap-1 p-2 rounded-t-lg border-t border-x bg-muted/40 items-center justify-between">
                  <div className="flex flex-wrap gap-1 items-center">
                    <button
                      type="button"
                      title="Bold"
                      onClick={() => insertText("<strong>", "</strong>")}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-100"
                    >
                      <Bold className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Italic"
                      onClick={() => insertText("<em>", "</em>")}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-100"
                    >
                      <Italic className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Underline"
                      onClick={() => insertText("<u>", "</u>")}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-100"
                    >
                      <Underline className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Link"
                      onClick={() => insertText('<a href="https://example.com" class="text-emerald-600 underline">', "</a>")}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-100"
                    >
                      <Link className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="List Item"
                      onClick={() => insertText("<li>", "</li>")}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-100"
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="H1"
                      onClick={() => insertText("<h1 class='text-2xl font-bold mb-3'>", "</h1>")}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-100"
                    >
                      <Heading1 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="H2"
                      onClick={() => insertText("<h2 class='text-xl font-bold mb-2'>", "</h2>")}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-100"
                    >
                      <Heading2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Variables dropdown autocomplete floating pill triggers */}
                  <div className="flex gap-1 items-center">
                    <span className="text-2xs text-muted-foreground mr-1 flex items-center gap-0.5">
                      <Sparkles className="h-3 w-3 text-emerald-500" /> Dynamic variables:
                    </span>
                    <button
                      type="button"
                      onClick={() => insertText("{name}")}
                      className="px-1.5 py-0.5 rounded border border-muted bg-card hover:bg-muted text-2xs font-semibold text-emerald-600 transition-all duration-100"
                    >
                      Name
                    </button>
                    <button
                      type="button"
                      onClick={() => insertText("{eventName}")}
                      className="px-1.5 py-0.5 rounded border border-muted bg-card hover:bg-muted text-2xs font-semibold text-emerald-600 transition-all duration-100"
                    >
                      Event Name
                    </button>
                    <button
                      type="button"
                      onClick={() => insertText("{ticketLink}")}
                      className="px-1.5 py-0.5 rounded border border-muted bg-card hover:bg-muted text-2xs font-semibold text-emerald-600 transition-all duration-100"
                    >
                      Ticket Link
                    </button>
                  </div>
                </div>

                <Textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Draft your email body (HTML supported) or WhatsApp template placeholders here..."
                  className="min-h-[300px] font-mono text-sm rounded-t-none border-t-0"
                  required
                />
              </div>

            </fieldset>
          </div>
        </div>
      </div>

      {/* RIGHT: Live Previews & Analytics / Control center (2 cols) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Status / Publish Controls Dashboard card */}
        <div className="rounded-2xl border bg-card/60 backdrop-blur-md p-6 shadow-md space-y-6">
          <div className="flex justify-between items-center pb-4 border-b">
            <div>
              <h3 className="font-semibold text-base">Campaign Console</h3>
              <p className="text-2xs text-muted-foreground">Status and Queue controls.</p>
            </div>
            <div className={`px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wide border ${
              campaign.status === "DRAFT" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
              campaign.status === "SCHEDULED" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
              campaign.status === "PROCESSING" ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20 animate-pulse" :
              campaign.status === "PAUSED" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
              campaign.status === "CANCELLED" ? "bg-red-500/10 text-red-500 border-red-500/20" :
              campaign.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
              "bg-muted text-muted-foreground"
            }`}>
              {campaign.status}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Channel</span>
              <p className="font-medium flex items-center gap-1 mt-0.5">
                {campaign.channel === "EMAIL" ? (
                  <>
                    <Mail className="h-4 w-4 text-emerald-500" /> Email
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 text-emerald-500" /> WhatsApp
                  </>
                )}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Queue Size</span>
              <p className="font-medium mt-0.5">{campaign.sentCount || 0} Recipient(s)</p>
            </div>
          </div>

          {/* DRAFT: Ready to dispatch button */}
          {campaign.status === "DRAFT" && (
            <div className="space-y-3 pt-2">
              <Button
                variant="default"
                onClick={handlePublish}
                disabled={isPublishing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md shadow-emerald-500/10"
              >
                {isPublishing ? "Queuing..." : "Send Campaign Now"}
              </Button>
              <p className="text-2xs text-muted-foreground text-center">
                This triggers immediate dispatch. Auto-saved changes are synced.
              </p>
            </div>
          )}

          {/* ACTIVE QUEUE STATE CONTROLS */}
          {isActive && (
            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                {campaign.status === "SCHEDULED" || campaign.status === "PROCESSING" ? (
                  <Button
                    variant="outline"
                    onClick={() => handleQueueAction("pause")}
                    disabled={isQueueActionLoading}
                    className="flex-1 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 gap-1.5"
                  >
                    <Pause className="h-4 w-4" /> Pause
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => handleQueueAction("resume")}
                    disabled={isQueueActionLoading}
                    className="flex-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 gap-1.5"
                  >
                    <Play className="h-4 w-4" /> Resume
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => handleQueueAction("cancel")}
                  disabled={isQueueActionLoading}
                  className="flex-1 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 gap-1.5"
                >
                  <XCircle className="h-4 w-4" /> Cancel
                </Button>
              </div>
              <p className="text-2xs text-muted-foreground text-center">
                Queue state switches are applied immediately to background jobs.
              </p>
            </div>
          )}
        </div>

        {/* PREVIEW FRAME OR ACTIVE ANALYTICS CHARTS */}
        {isActive || campaign.status === "COMPLETED" || campaign.status === "CANCELLED" ? (
          
          /* Queue Delivery Analytics Grid */
          <div className="rounded-2xl border bg-card/60 backdrop-blur-md p-6 shadow-md space-y-6">
            <h3 className="font-semibold text-base">Live Delivery Analytics</h3>
            
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl">
                <span className="text-muted-foreground text-2xs block">Delivered</span>
                <span className="text-base font-bold text-emerald-600">{deliveredVal}</span>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl">
                <span className="text-muted-foreground text-2xs block">Failed</span>
                <span className="text-base font-bold text-rose-600">{failedVal}</span>
              </div>
              <div className="bg-gray-500/10 border border-gray-500/20 p-2 rounded-xl">
                <span className="text-muted-foreground text-2xs block">Pending</span>
                <span className="text-base font-bold text-gray-500">{pendingVal}</span>
              </div>
            </div>

            {/* Recharts Pie Donut visualization */}
            {campaign.sentCount > 0 && (
              <div className="h-44 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={60}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xs text-muted-foreground">Deliverability</span>
                  <span className="text-base font-bold">
                    {campaign.sentCount > 0 
                      ? Math.round((deliveredVal / (deliveredVal + failedVal || 1)) * 100) 
                      : 0}%
                  </span>
                </div>
              </div>
            )}

            {/* Real-time Delivery Log logs mapping outbox items */}
            <div className="space-y-2">
              <span className="text-xs font-semibold block">Active Transmission Log</span>
              <div className="max-h-[160px] overflow-y-auto border rounded-xl divide-y text-2xs bg-card/40">
                {outboxItems.length === 0 ? (
                  <div className="p-3 text-center text-muted-foreground">Queueing outbox items...</div>
                ) : (
                  outboxItems.map(item => (
                    <div key={item.id} className="p-2 flex justify-between items-center hover:bg-muted/10">
                      <div className="truncate pr-2 max-w-[150px]">
                        <span className="font-medium block truncate text-foreground">{item.toAddress}</span>
                        {item.lastError && (
                          <span className="text-rose-500 text-3xs truncate block max-w-[140px]" title={item.lastError}>
                            {item.lastError}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`px-1.5 py-0.5 rounded text-3xs font-semibold ${
                          item.status === "SENT" ? "bg-emerald-500/10 text-emerald-500" :
                          item.status === "QUEUED" ? "bg-gray-500/10 text-gray-500" :
                          "bg-rose-500/10 text-rose-500"
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        ) : (
          
          /* Visual Simulator Previews block */
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-base">Live Preview</h3>
              <div className="flex items-center gap-1 p-0.5 rounded-lg border bg-muted/40">
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1 rounded-md transition-all duration-150 ${
                    previewDevice === "mobile" 
                      ? "bg-card text-emerald-600 shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1 rounded-md transition-all duration-150 ${
                    previewDevice === "desktop" 
                      ? "bg-card text-emerald-600 shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Tv className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Email Device Simulator */}
            {campaign.channel === "EMAIL" ? (
              <div className={`border rounded-2xl overflow-hidden bg-card/40 shadow-sm transition-all duration-300 mx-auto ${
                previewDevice === "mobile" ? "max-w-[340px]" : "w-full"
              }`}>
                {/* Email Header */}
                <div className="p-3 bg-muted/30 border-b text-xs space-y-1">
                  <div>
                    <span className="text-muted-foreground">To: </span>
                    <span className="font-medium text-foreground">John Doe &lt;john.doe@example.com&gt;</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Subject: </span>
                    <span className="font-medium text-foreground">{subject || "(No Subject)"}</span>
                  </div>
                </div>

                <iframe
                  title="Email preview"
                  srcDoc={emailPreviewHtml}
                  sandbox=""
                  className="h-[360px] w-full bg-white"
                />
              </div>
            ) : (
              /* WhatsApp Device Simulator (iOS messaging bubble layout) */
              <div className="border rounded-2xl overflow-hidden bg-card/40 shadow-sm transition-all duration-300 max-w-[340px] mx-auto">
                <div className="p-3 bg-emerald-800 text-white font-medium flex items-center gap-2 text-xs">
                  <div className="h-6 w-6 rounded-full bg-emerald-600 flex items-center justify-center text-3xs">BDQ</div>
                  <div>
                    <p className="font-bold">BDQ Notifications</p>
                    <p className="text-4xs opacity-80">Official Business Account</p>
                  </div>
                </div>

                {/* WhatsApp Chat Pane BG */}
                <div className="bg-[#e5ddd5] dark:bg-zinc-900 p-4 h-[300px] overflow-y-auto space-y-4">
                  <div className="max-w-[85%] rounded-xl p-3 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs shadow relative leading-relaxed">
                    {body ? (
                      <div className="whitespace-pre-wrap">
                        {resolvePreviewVariables(body)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Type message text to see visual bubble.</span>
                    )}
                    <span className="text-4xs text-muted-foreground block text-right mt-1.5">16:15 PM</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
