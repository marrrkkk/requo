import { siteDescription, siteName, siteTagline } from "@/lib/seo/site";

export const socialImageSize = {
  height: 630,
  width: 1200,
} as const;

export const socialImageContentType = "image/png";
export const socialImageAlt = `${siteName} social preview`;

export function SocialPreviewImage() {
  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, #f7f4ee 0%, #ffffff 48%, #e7eefc 100%)",
        color: "#172033",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        padding: "56px",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: "18px",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(23,32,51,0.12)",
            borderRadius: "28px",
            boxShadow: "0 14px 42px rgba(23,32,51,0.08)",
            display: "flex",
            height: "72px",
            justifyContent: "center",
            width: "72px",
          }}
        >
          <span
            style={{
              fontSize: "30px",
              fontWeight: 700,
              letterSpacing: "-0.04em",
            }}
          >
            R
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span
            style={{
              fontSize: "16px",
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Owner-led service workflow
          </span>
          <span
            style={{
              fontSize: "34px",
              fontWeight: 700,
              letterSpacing: "-0.05em",
            }}
          >
            {siteName}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          maxWidth: "860px",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "rgba(23,32,51,0.06)",
            border: "1px solid rgba(23,32,51,0.08)",
            borderRadius: "999px",
            display: "flex",
            fontSize: "22px",
            fontWeight: 600,
            padding: "12px 20px",
            width: "fit-content",
          }}
        >
          {siteTagline}
        </div>
        <div
          style={{
            fontSize: "62px",
            fontWeight: 700,
            letterSpacing: "-0.06em",
            lineHeight: 1.04,
          }}
        >
          Service business software for inquiries, quotes, and follow-up.
        </div>
        <div
          style={{
            color: "rgba(23,32,51,0.82)",
            fontSize: "27px",
            lineHeight: 1.45,
          }}
        >
          {siteDescription}
        </div>
      </div>
    </div>
  );
}
