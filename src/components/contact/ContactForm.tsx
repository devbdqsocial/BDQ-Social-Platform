"use client";
import { useState } from "react";
import { email as emailSchema } from "@/lib/validators";
import { useFieldValidation } from "@/lib/use-field-validation";

// RPA floating-label field: label sits big (Exat) over the input, lifts small on focus/fill.
function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  textarea = false,
  required = false,
  maxLength,
  error,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
  required?: boolean;
  maxLength?: number;
  error?: string | null;
  onBlur?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const up = focused || value.length > 0;
  // The floating label ANIMATES between two type sizes — a class can't tween.
  /* eslint-disable no-restricted-syntax */
  const labelStyle = up
    ? { top: 0, fontSize: "var(--paragraph-small)", fontWeight: 700, fontFamily: "var(--f-inter)" }
    : { top: "var(--space-2xl)", fontSize: "var(--h42)", fontFamily: "var(--f-exat)" };
  /* eslint-enable no-restricted-syntax */
  const inputCls = "f-exat w-full resize-none bg-transparent pb-[var(--space-md)] pt-[var(--space-2xl)] outline-none";
  const blur = () => {
    setFocused(false);
    onBlur?.();
  };

  return (
    <div>
      <div className="relative" style={{ borderBottom: "1px solid var(--color)" }}>
        {textarea ? (
          <textarea
            id={id}
            rows={3}
            value={value}
            required={required}
            maxLength={maxLength}
            aria-invalid={!!error}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={blur}
            className={`${inputCls} f-h42`}
            style={{ color: "var(--color)" }}
          />
        ) : (
          <input
            id={id}
            type={type}
            value={value}
            required={required}
            maxLength={maxLength}
            aria-invalid={!!error}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={blur}
            className={`${inputCls} f-h42`}
            style={{ color: "var(--color)" }}
          />
        )}
        <label htmlFor={id} className="pointer-events-none absolute left-0 origin-left transition-all duration-300" style={labelStyle}>
          {label}
        </label>
      </div>
      {error && (
        <p role="alert" className="f-paragraph-small mt-[var(--space-sm)]" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export function ContactForm({ to }: { to: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const emailField = useFieldValidation(emailSchema);
  const [nameError, setNameError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameOk = name.trim().length > 0;
    setNameError(nameOk ? null : "Please enter your name");
    const emailOk = emailField.validate(email);
    if (!nameOk || !emailOk) return;
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    const subject = encodeURIComponent(`Enquiry from ${name || "the website"}`);
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-[var(--space-2xl)]">
      <Field
        id="cf-name"
        label="Your name"
        value={name}
        onChange={(v) => {
          setName(v);
          if (nameError) setNameError(null);
        }}
        maxLength={80}
        required
        error={nameError}
        onBlur={() => setNameError(name.trim() ? null : "Please enter your name")}
      />
      <Field
        id="cf-email"
        label="Your email"
        value={email}
        onChange={(v) => {
          setEmail(v);
          emailField.clear();
        }}
        type="email"
        maxLength={160}
        required
        error={emailField.error}
        onBlur={() => email && emailField.validate(email)}
      />
      <Field id="cf-message" label="Your message" value={message} onChange={setMessage} maxLength={2000} textarea />
      <button type="submit" className="btn self-start" data-cursor>
        <span className="btn__text">Send it</span>
      </button>
    </form>
  );
}
