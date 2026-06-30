import { describe, expect, it } from "vitest";
import {
  buildCampaignWhatsAppPayload,
  normalizeTemplateParams,
  renderCampaignTextBody,
  renderCampaignTemplateParams,
  whatsAppCampaignReadinessError,
} from "./campaign-whatsapp";

describe("campaign WhatsApp templates", () => {
  it("normalizes ordered template params", () => {
    expect(normalizeTemplateParams(" {name}\n\n https://bdqsocial.com ")).toEqual(["{name}", "https://bdqsocial.com"]);
  });

  it("renders supported contact variables", () => {
    expect(renderCampaignTemplateParams(["Hi {name}", "{email}", "{phone}"], {
      name: "Asha",
      email: "asha@example.com",
      phone: "+919876543210",
    })).toEqual(["Hi Asha", "asha@example.com", "+919876543210"]);
  });

  it("builds the send payload with template name, language, and params", () => {
    expect(buildCampaignWhatsAppPayload({
      templateName: " event_launch ",
      templateLang: "en_US",
      templateParams: ["{name}", "BDQ"],
      contact: { name: "Asha" },
    })).toEqual({
      whatsappTemplateName: "event_launch",
      whatsappTemplateLang: "en_US",
      whatsappTemplateParams: ["Asha", "BDQ"],
    });
  });

  it("renders an OpenWA campaign text body", () => {
    expect(renderCampaignTextBody("Hi {name}, phone {phone}", {
      name: "Asha",
      phone: "+919876543210",
    })).toBe("Hi Asha, phone +919876543210");
  });

  it("blocks Cloud/Interakt sends until provider and template are ready", () => {
    expect(whatsAppCampaignReadinessError({ configured: false, templateName: "event_launch" })).toBe("WhatsApp is not configured.");
    expect(whatsAppCampaignReadinessError({ configured: true, provider: "cloud", templateName: " " })).toBe("Choose an approved WhatsApp template before sending.");
    expect(whatsAppCampaignReadinessError({ configured: true, provider: "interakt", templateName: "event_launch" })).toBeNull();
  });

  it("blocks OpenWA sends until the body is ready", () => {
    expect(whatsAppCampaignReadinessError({ configured: true, provider: "openwa", body: " " })).toBe("Write a WhatsApp message body before sending.");
    expect(whatsAppCampaignReadinessError({ configured: true, provider: "openwa", body: "Hello" })).toBeNull();
  });
});
