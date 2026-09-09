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
          background: "#1e3a2b",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32" fill="none">
          <g
            stroke="#e6c58b"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 28c-.6-6-.4-11.4.8-16.8" />
            <path d="M19 28c.6-6 .4-11.4-.8-16.8" />
            <path d="M13.8 11.6C11.3 9.2 8.2 8 4.8 8.4c2.3 1.3 3.6 3.2 4.4 5.7" />
            <path d="M13.8 11.6C12.8 8.4 10.6 5.9 7.3 4.8c1 2.5 1.1 4.9.4 7.4" />
            <path d="M18.2 11.6C20.7 9.2 23.8 8 27.2 8.4c-2.3 1.3-3.6 3.2-4.4 5.7" />
            <path d="M18.2 11.6C19.2 8.4 21.4 5.9 24.7 4.8c-1 2.5-1.1 4.9-.4 7.4" />
            <path d="M10 28h12" />
          </g>
          <path d="M16 11.4c-.9-2.8.1-5.6 2.5-7.5-.2 2.8-1 5.2-2.5 7.5Z" fill="#e6c58b" />
          <path d="M16 11.4c.9-2.8-.1-5.6-2.5-7.5.2 2.8 1 5.2 2.5 7.5Z" fill="#e6c58b" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
