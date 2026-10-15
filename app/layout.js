import { Inter } from "next/font/google";
import "./globals.css";

import Providers from "./components/providers";
import ThemeController from "./components/theme-controller";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Fintex Finance App",
  description:
    "The number 1 finanace application for all your finanacial needs...",
};

// Theming is scoped to the signed-in app areas (/admin, /account). This runs
// before first paint so the app restores the saved preference with no flash,
// and public routes (landing, auth) are forced light regardless of any stored
// dark preference. ThemeController keeps this in sync on client-side nav.
const themeScript = `try{var p=location.pathname;var app=p==='/admin'||p.indexOf('/admin/')===0||p==='/account'||p.indexOf('/account/')===0;var r=document.documentElement;if(!app){r.classList.remove('dark');}else{var t=localStorage.getItem('fintex-theme');var d=t==='dark'||((t===null||t==='')&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){r.classList.add('dark');}else{r.classList.remove('dark');}}}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>
        <Providers>
          <ThemeController />
          {children}
        </Providers>
      </body>
    </html>
  );
}
