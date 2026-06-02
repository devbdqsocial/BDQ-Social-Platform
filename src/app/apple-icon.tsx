import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#120E09",
          color: "#C2603B",
          fontSize: 120,
          fontWeight: 700,
          fontFamily: "Georgia, serif",
        }}
      >
        B
      </div>
    ),
    size,
  );
}
