import "./globals.css";
import "./styles.css";
import "./finance.css";
import { AuthProvider } from "@/features/auth/auth-provider";

export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
