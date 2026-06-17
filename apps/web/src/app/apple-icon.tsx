import { BRAND, LOGO_MARK_DATA_URI } from "@/lib/brand";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon — iOS rounds the corners itself, so fill the square with the
// brand ink and centre the mark.
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND.ink,
      }}
    >
      <img src={LOGO_MARK_DATA_URI} width={132} height={132} alt="" />
    </div>,
    { ...size },
  );
}
