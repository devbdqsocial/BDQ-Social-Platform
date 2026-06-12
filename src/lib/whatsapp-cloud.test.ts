import { describe, it, expect } from "vitest";
import { buildCloudPayload } from "./whatsapp-cloud";

const msg = {
  phone: "+91 98765 43210",
  template: "ticket_confirmation",
  params: ["BDQ Social", "2", "https://bdqsocial.com/tickets"],
};

describe("buildCloudPayload", () => {
  it("builds a Meta template payload with a digits-only recipient", () => {
    const p = buildCloudPayload(msg);
    expect(p.messaging_product).toBe("whatsapp");
    expect(p.to).toBe("919876543210");
    expect(p.type).toBe("template");
    expect(p.template.name).toBe("ticket_confirmation");
    expect(p.template.language.code).toBe("en");
    expect(p.template.components[0].parameters).toEqual([
      { type: "text", text: "BDQ Social" },
      { type: "text", text: "2" },
      { type: "text", text: "https://bdqsocial.com/tickets" },
    ]);
  });

  it("honours template + language overrides", () => {
    const p = buildCloudPayload(msg, { template: "custom_tpl", lang: "hi" });
    expect(p.template.name).toBe("custom_tpl");
    expect(p.template.language.code).toBe("hi");
  });
});
