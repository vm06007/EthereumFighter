import { Inter } from "next/font/google";
import '../styles/globals.css';

const inter = Inter({ subsets: ["latin"] });
import Providers from "components/providers";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <title>EF - Ethereum Fighter</title>
                <link href="https://fonts.googleapis.com/css?family=Press+Start+2P|Permanent+Marker" rel="stylesheet"></link>
                <link href="https://unpkg.com/nes.css/css/nes.css" rel="stylesheet" />
                <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/gamepad.css@latest/styles.min.css"></link>
            </head>
            <body className={inter.className}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}