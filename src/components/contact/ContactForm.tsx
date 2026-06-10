"use client";
import { useState } from "react";

// RPA floating-label field: label sits big (Exat) over the input, lifts small on focus/fill.
function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  textarea = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const up = focused || value.length > 0;
  const labelStyle = up
    ? { top: 0, fontSize: "var(--paragraph-small)", fontWeight: 700, fontFamily: "var(--f-inter)" }
    : { top: "var(--space-2xl)", fontSize: "var(--h42)", fontFamily: "var(--f-exat)" };
  const inputCls = "f-exat w-full resize-none bg-transparent pb-[var(--space-md)] pt-[var(--space-2xl)] outline-none";

  return (
    <div className="relative" style={{ borderBottom: "1px solid var(--color)" }}>
      {textarea ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={inputCls}
          style={{ fontSize: "var(--h42)", color: "var(--color)" }}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={inputCls}
          style={{ fontSize: "var(--h42)", color: "var(--color)" }}
        />
      )}
      <label htmlFor={id} className="pointer-events-none absolute left-0 origin-left transition-all duration-300" style={labelStyle}>
        {label}
      </label>
    </div>
  );
}

export function ContactForm({ to }: { to: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    const subject = encodeURIComponent(`Enquiry from ${name || "the website"}`);
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-[var(--space-2xl)]">
      <Field id="cf-name" label="Your name" value={name} onChange={setName} />
      <Field id="cf-email" label="Your email" value={email} onChange={setEmail} type="email" />
      <Field id="cf-message" label="Your message" value={message} onChange={setMessage} textarea />
      <button type="submit" className="btn self-start" data-cursor>
        <span className="btn__text">Send it</span>
      </button>
    </form>
  );
}
