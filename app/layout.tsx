import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import '../styles/grid.css';

export const metadata: Metadata = {
  title: 'hyuk.xyz',
  description: "Hyuk Jang's portfolio.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hyuk.xyz'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Script id="typekit-loader" strategy="afterInteractive">
          {`(function(d){var config={kitId:'hvw8xwa',scriptTimeout:3000,async:true},h=d.documentElement,t=setTimeout(function(){h.className=h.className.replace(/\\bwf-loading\\b/g,'')+' wf-inactive';},config.scriptTimeout),tk=d.createElement('script'),f=false,s=d.getElementsByTagName('script')[0],a;h.className+=' wf-loading';tk.src='https://use.typekit.net/'+config.kitId+'.js';tk.async=true;tk.onload=tk.onreadystatechange=function(){a=this.readyState;if(f||a&&a!='complete'&&a!='loaded')return;f=true;clearTimeout(t);try{Typekit.load(config)}catch(e){}};s.parentNode.insertBefore(tk,s);})(document);`}
        </Script>
      </body>
    </html>
  );
}
