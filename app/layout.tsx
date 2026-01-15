import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChessGuard - AI Analysis",
  description: "State of the art chess analysis and next move prediction",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div id="global-error-log" style={{ position: 'fixed', top: 0, left: 0, width: '100%', background: 'red', color: 'white', zIndex: 99999, display: 'none', padding: '10px' }}></div>
        <script dangerouslySetInnerHTML={{
          __html: `
          window.onerror = function(msg, url, line) {
            const el = document.getElementById('global-error-log');
            if(el) {
              el.style.display = 'block';
              el.innerHTML += "<div>Error: " + msg + " at line " + line + "</div>";
            }
          };
        `}} />
        {children}
      </body>
    </html>
  );
}
