import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* ==========================================
   SEO METADATA CONFIGURATION
   Replace the URL with your actual live domain.
========================================== */
export const metadata = {
  metadataBase: new URL('https://www.sco-aisp.com'), // CHANGE TO YOUR ACTUAL DOMAIN
  
  title: {
    default: "SCO AI-SP Task Manager | AI-Powered Productivity",
    template: "%s | SCO AI-SP Task Manager" 
  },
  
  description: "SCO AI-SP Task Manager is an advanced, AI-driven project management tool designed to streamline workflows, automate task tracking, and boost team productivity.",
  
  keywords: [
    "AI Task Manager",
    "SCO AI-SP",
    "Project Management Tool",
    "Productivity Software",
    "Workflow Automation",
    "Team Collaboration",
    "AI Productivity",
    "Task Tracking App"
  ],

  authors: [{ name: "SCO AI-SP Team" }],
  
  // How links look when shared on Slack/Teams/LinkedIn
  openGraph: {
    title: "SCO AI-SP Task Manager",
    description: "Supercharge your team's productivity with our AI-driven task and workflow manager.",
    url: 'https://www.sco-aisp.com',
    siteName: 'SCO AI-SP Task Manager',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg', // Ensure you have this image in your public folder
        width: 1200,
        height: 630,
        alt: 'SCO AI-SP Task Manager Dashboard',
      },
    ],
  },

  // Twitter Card data
  twitter: {
    card: 'summary_large_image',
    title: "SCO AI-SP Task Manager",
    description: "Smart task management and workflow automation powered by AI.",
    images: ['/og-image.jpg'], 
  },

  icons: {
    icon: '/favicon.ico', 
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* JSON-LD Structured Data updated for a Software Application */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "SCO AI-SP Task Manager",
              "url": "https://www.sco-aisp.com",
              "description": "AI-powered task and project management application.",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web browser, Windows, macOS",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "creator": {
                "@type": "Organization",
                "name": "SCO AI-SP"
              },
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+1-800-123-4567", // Update with your contact info
                "contactType": "customer support"
              }
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-gray-900 bg-white`}
      >
      
        {/* <Navbar /> */}
        
        <main className="min-h-screen flex flex-col">
            {children}
        </main>
        
        {/* <Footer /> */}
      </body>
    </html>
  );
}